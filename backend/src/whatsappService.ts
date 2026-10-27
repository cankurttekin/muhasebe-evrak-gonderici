import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  WASocket
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import fs from 'fs';
import pino from 'pino';
import { CONFIG } from './config.js';
import { dbService } from './db.js';
import { ZirveDocument } from './zirveScanner.js';

export type WAConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED';

class WhatsAppService {
  private sock: WASocket | null = null;
  private status: WAConnectionStatus = 'DISCONNECTED';
  private qrCodeDataUrl: string | null = null;
  private connectedPhone: string | null = null;
  private isInitializing = false;

  public getStatus() {
    return {
      status: this.status,
      qrCodeDataUrl: this.qrCodeDataUrl,
      connectedPhone: this.connectedPhone,
    };
  }

  /**
   * Initializes or restarts the Baileys WhatsApp client.
   */
  public async initWhatsApp(): Promise<void> {
    if (this.isInitializing) return;
    this.isInitializing = true;
    this.status = 'CONNECTING';

    try {
      if (!fs.existsSync(CONFIG.WA_AUTH_DIR)) {
        fs.mkdirSync(CONFIG.WA_AUTH_DIR, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(CONFIG.WA_AUTH_DIR);
      const { version } = await fetchLatestBaileysVersion();

      const logger = pino({ level: 'silent' });

      this.sock = makeWASocket({
        version,
        auth: state,
        logger,
        printQRInTerminal: false,
        syncFullHistory: false
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.qrCodeDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
            this.status = 'QR_READY';
            console.log('[WhatsApp] QR Kod hazırlandı');
          } catch (err) {
            console.error('[WhatsApp] QR data URL hatası:', err);
          }
        }

        if (connection === 'close') {
          const shouldReconnect =
            (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
          
          this.status = 'DISCONNECTED';
          this.qrCodeDataUrl = null;
          this.connectedPhone = null;
          console.log('[WhatsApp] Bağlantı kapandı, yeniden bağlanma:', shouldReconnect);

          if (shouldReconnect) {
            setTimeout(() => {
              this.isInitializing = false;
              this.initWhatsApp();
            }, 3000);
          } else {
            this.isInitializing = false;
          }
        } else if (connection === 'open') {
          this.status = 'CONNECTED';
          this.qrCodeDataUrl = null;
          const userJid = this.sock?.user?.id || '';
          this.connectedPhone = userJid.split(':')[0] || userJid.split('@')[0] || 'Bağlı Cihaz';
          console.log(`[WhatsApp] Başarıyla bağlandı: ${this.connectedPhone}`);
          this.isInitializing = false;
        }
      });
    } catch (err) {
      console.error('[WhatsApp] İstemci başlatma hatası:', err);
      this.status = 'DISCONNECTED';
      this.isInitializing = false;
    }
  }

  /**
   * Disconnects and cleans auth session.
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.sock) {
        await this.sock.logout();
        this.sock = null;
      }
    } catch {
      // ignore
    }
    this.status = 'DISCONNECTED';
    this.qrCodeDataUrl = null;
    this.connectedPhone = null;

    try {
      if (fs.existsSync(CONFIG.WA_AUTH_DIR)) {
        fs.rmSync(CONFIG.WA_AUTH_DIR, { recursive: true, force: true });
      }
    } catch (err) {
      console.error('WhatsApp auth temizleme hatası:', err);
    }
  }

  /**
   * Formats a phone number into WhatsApp JID (e.g. 905321234567@s.whatsapp.net)
   */
  public formatJid(phone: string): string {
    const cleanDigits = phone.replace(/\D/g, '');
    let normalized = cleanDigits;
    if (cleanDigits.startsWith('0') && cleanDigits.length === 11) {
      normalized = '9' + cleanDigits;
    } else if (cleanDigits.length === 10 && cleanDigits.startsWith('5')) {
      normalized = '90' + cleanDigits;
    }
    return `${normalized}@s.whatsapp.net`;
  }

  /**
   * Generates direct WhatsApp Web link as manual fallback.
   */
  public generateWebLink(phone: string, text: string): string {
    const cleanDigits = phone.replace(/\D/g, '');
    let normalized = cleanDigits;
    if (cleanDigits.startsWith('0') && cleanDigits.length === 11) {
      normalized = '9' + cleanDigits;
    } else if (cleanDigits.length === 10 && cleanDigits.startsWith('5')) {
      normalized = '90' + cleanDigits;
    }
    return `https://web.whatsapp.com/send?phone=${normalized}&text=${encodeURIComponent(text)}`;
  }

  /**
   * Sends a single document to WhatsApp.
   */
  public async sendDocumentFile(
    phone: string,
    filePath: string,
    fileName: string,
    caption?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (this.status !== 'CONNECTED' || !this.sock) {
      throw new Error('WhatsApp bağlı değil. Lütfen Ayarlar menüsünden WhatsApp bağlantısını kurun.');
    }

    try {
      const jid = this.formatJid(phone);
      const fileBuffer = await fs.promises.readFile(filePath);

      const result = await this.sock.sendMessage(jid, {
        document: fileBuffer,
        mimetype: 'application/pdf',
        fileName,
        caption: caption || fileName
      });

      return { success: true, messageId: result?.key?.id || undefined };
    } catch (err: any) {
      console.error(`WhatsApp send error for ${phone}:`, err);
      return { success: false, error: err.message || 'Gönderim sırasında hata oluştu' };
    }
  }

  /**
   * Sends multiple documents for a Mükellef.
   */
  public async sendDocumentsToMukellef(params: {
    mukellefCode: string;
    mukellefName: string;
    phone: string;
    documents: ZirveDocument[];
    customMessage?: string;
  }): Promise<{
    sentCount: number;
    failedCount: number;
    results: Array<{ documentName: string; success: boolean; error?: string }>;
  }> {
    const { mukellefCode, mukellefName, phone, documents, customMessage } = params;
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const results: Array<{ documentName: string; success: boolean; error?: string }> = [];

    let sentCount = 0;
    let failedCount = 0;

    // Send introduction message if connected
    if (customMessage && this.sock && this.status === 'CONNECTED') {
      try {
        const jid = this.formatJid(phone);
        await this.sock.sendMessage(jid, { text: customMessage });
      } catch (err: any) {
        console.error(`Giriş mesajı hatası (${phone}):`, err);
      }
    }

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const caption = `📄 ${doc.docType} (${doc.category}) - ${doc.period}`;

      try {
        const sendRes = await this.sendDocumentFile(phone, doc.fullPath, doc.fileName, caption);

        if (sendRes.success) {
          sentCount++;
          results.push({ documentName: doc.fileName, success: true });

          // Record in SQLite
          dbService.recordSendLog({
            mukellef_code: mukellefCode,
            document_name: doc.fileName,
            document_path: doc.relativePath,
            period: doc.period,
            category: doc.category,
            phone,
            recipient_name: mukellefName,
            status: 'SENT',
            wa_message_id: sendRes.messageId,
            batch_id: batchId
          });
        } else {
          failedCount++;
          results.push({ documentName: doc.fileName, success: false, error: sendRes.error });

          dbService.recordSendLog({
            mukellef_code: mukellefCode,
            document_name: doc.fileName,
            document_path: doc.relativePath,
            period: doc.period,
            category: doc.category,
            phone,
            recipient_name: mukellefName,
            status: 'FAILED',
            error_message: sendRes.error,
            batch_id: batchId
          });
        }
      } catch (err: any) {
        failedCount++;
        results.push({ documentName: doc.fileName, success: false, error: err.message });

        dbService.recordSendLog({
          mukellef_code: mukellefCode,
          document_name: doc.fileName,
          document_path: doc.relativePath,
          period: doc.period,
          category: doc.category,
          phone,
          recipient_name: mukellefName,
          status: 'FAILED',
          error_message: err.message,
          batch_id: batchId
        });
      }

      // Small delay between documents
      if (i < documents.length - 1) {
        await new Promise(r => setTimeout(r, 1200));
      }
    }

    return { sentCount, failedCount, results };
  }
}

export const whatsappService = new WhatsAppService();
