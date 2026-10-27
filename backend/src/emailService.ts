import nodemailer from 'nodemailer';
import { dbService } from './db.js';
import { ZirveDocument } from './zirveScanner.js';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

class EmailService {
  public getSmtpConfig(): SmtpConfig {
    return {
      host: dbService.getSetting('smtp_host', ''),
      port: parseInt(dbService.getSetting('smtp_port', '587'), 10) || 587,
      secure: dbService.getSetting('smtp_secure', 'false') === 'true',
      user: dbService.getSetting('smtp_user', ''),
      pass: dbService.getSetting('smtp_pass', ''),
      fromName: dbService.getSetting('smtp_from_name', 'Muhasebe Evrak İletim'),
      fromEmail: dbService.getSetting('smtp_from_email', '')
    };
  }

  public saveSmtpConfig(config: Partial<SmtpConfig>): void {
    if (config.host !== undefined) dbService.setSetting('smtp_host', config.host);
    if (config.port !== undefined) dbService.setSetting('smtp_port', String(config.port));
    if (config.secure !== undefined) dbService.setSetting('smtp_secure', String(config.secure));
    if (config.user !== undefined) dbService.setSetting('smtp_user', config.user);
    if (config.pass !== undefined) dbService.setSetting('smtp_pass', config.pass);
    if (config.fromName !== undefined) dbService.setSetting('smtp_from_name', config.fromName);
    if (config.fromEmail !== undefined) dbService.setSetting('smtp_from_email', config.fromEmail);
  }

  public isConfigured(): boolean {
    const config = this.getSmtpConfig();
    return Boolean(config.host && config.user && config.pass && (config.fromEmail || config.user));
  }

  public createTransporter(configOverride?: SmtpConfig) {
    const config = configOverride || this.getSmtpConfig();
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure, // true for 465, false for 587/STARTTLS
      auth: {
        user: config.user,
        pass: config.pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  public async testConnection(configOverride?: SmtpConfig): Promise<{ success: boolean; message: string }> {
    try {
      const config = configOverride || this.getSmtpConfig();
      if (!config.host || !config.user || !config.pass) {
        return { success: false, message: 'Sunucu adresi, kullanıcı adı ve şifre zorunludur.' };
      }
      const transporter = this.createTransporter(config);
      await transporter.verify();
      return { success: true, message: 'SMTP sunucu bağlantısı başarıyla doğrulandı.' };
    } catch (err: any) {
      console.error('[EmailService] SMTP test error:', err);
      return { success: false, message: err.message || 'SMTP sunucusuna bağlanılamadı.' };
    }
  }

  public async sendDocumentsToMukellef(params: {
    mukellefCode: string;
    mukellefName: string;
    email: string;
    documents: ZirveDocument[];
    period?: string;
    customMessage?: string;
  }): Promise<{
    sentCount: number;
    failedCount: number;
    results: Array<{ documentName: string; success: boolean; error?: string }>;
  }> {
    const { mukellefCode, mukellefName, email, documents, period, customMessage } = params;

    if (!this.isConfigured()) {
      throw new Error('E-posta (SMTP) ayarları henüz yapılmamış. Lütfen Ayarlar menüsünden SMTP bilgilerinizi girin.');
    }

    if (!email || !email.includes('@')) {
      throw new Error(`Geçersiz e-posta adresi: ${email}`);
    }

    const config = this.getSmtpConfig();
    const transporter = this.createTransporter(config);
    const batchId = `email_batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const results: Array<{ documentName: string; success: boolean; error?: string }> = [];

    const fromAddress = config.fromName
      ? `"${config.fromName}" <${config.fromEmail || config.user}>`
      : config.fromEmail || config.user;

    const subject = `[Muhasebe] ${mukellefName} - ${period || 'Güncel'} Dönemi Evrakları`;

    const docListHtml = documents
      .map(d => `<li style="margin-bottom: 6px;"><b>${d.docType}</b> (${d.category}) - <span style="color: #64748b;">${d.fileName}</span></li>`)
      .join('');

    const formattedMessage = (customMessage || `Sayın ${mukellefName}, ekte ${period || ''} dönemine ait muhasebe evraklarınız yer almaktadır.`)
      .replace(/\n/g, '<br/>');

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <p style="font-size: 14px; margin: 16px 0;">
          ${formattedMessage}
        </p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; margin: 16px 0;">
          <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #475569;">Ekli Evraklar (${documents.length} Adet)</h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
            ${docListHtml}
          </ul>
        </div>
        <p style="font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
          Bu e-posta, evrak gönderim sistemi tarafından otomatik olarak iletilmiştir. Bir hata olduğunu düşünüyorsanız lütfen muhasebe ofisi ile iletişime geçiniz.
        </p>
      </div>
    `;

    const attachments = documents.map(doc => ({
      filename: doc.fileName,
      path: doc.fullPath
    }));

    try {
      await transporter.sendMail({
        from: fromAddress,
        to: email,
        subject,
        html,
        text: customMessage || `Sayın ${mukellefName}, ekte ${period || ''} dönemine ait muhasebe evraklarınız yer almaktadır.`,
        attachments
      });

      // Mark all documents in this batch as successfully sent
      for (const doc of documents) {
        dbService.recordSendLog({
          mukellef_code: mukellefCode,
          document_name: doc.fileName,
          document_path: doc.relativePath,
          period: doc.period,
          category: doc.category,
          phone: '',
          recipient_name: mukellefName,
          channel: 'EMAIL',
          email,
          status: 'SENT',
          batch_id: batchId
        });
        results.push({ documentName: doc.fileName, success: true });
      }

      return {
        sentCount: documents.length,
        failedCount: 0,
        results
      };
    } catch (err: any) {
      console.error(`[EmailService] Failed to send email to ${email}:`, err);

      for (const doc of documents) {
        dbService.recordSendLog({
          mukellef_code: mukellefCode,
          document_name: doc.fileName,
          document_path: doc.relativePath,
          period: doc.period,
          category: doc.category,
          phone: '',
          recipient_name: mukellefName,
          channel: 'EMAIL',
          email,
          status: 'FAILED',
          error_message: err.message,
          batch_id: batchId
        });
        results.push({ documentName: doc.fileName, success: false, error: err.message });
      }

      return {
        sentCount: 0,
        failedCount: documents.length,
        results
      };
    }
  }
}

export const emailService = new EmailService();
