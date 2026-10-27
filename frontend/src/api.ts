// API Client for Zirve WhatsApp Evrak Gönderici

export interface ZirveDoc {
  id: string;
  fileName: string;
  relativePath: string;
  fullPath: string;
  category: string;
  period: string;
  docType: string;
  size: number;
  modifiedAt: string;
  isSent: boolean;
  lastSentAt?: string;
  sentPhone?: string;
}

export interface Mukellef {
  code: string;
  name: string;
  phone: string;
  displayPhone: string;
  email?: string;
  contactPerson?: string;
  taxNumber?: string;
  folderPath: string;
  isPhoneOverridden: boolean;
  isEmailOverridden?: boolean;
  notes?: string;
  documents: ZirveDoc[];
  totalDocs: number;
  sentDocs: number;
  pendingDocs: number;
  status: 'ALL_SENT' | 'PARTIALLY_SENT' | 'NOT_SENT' | 'NO_DOCS';
}

export interface DashboardSummary {
  success: boolean;
  selectedPeriod: string;
  periods: string[];
  totalMukellefs: number;
  stats: {
    totalDocs: number;
    sentDocs: number;
    pendingDocs: number;
    fullySentMukellefs: number;
    pendingMukellefs: number;
  };
  mukellefler: Mukellef[];
}

export interface SendLogItem {
  id: number;
  mukellef_code: string;
  document_name: string;
  document_path: string;
  period: string;
  category: string;
  phone: string;
  channel?: 'WHATSAPP' | 'EMAIL' | 'BOTH';
  email?: string;
  recipient_name: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
  error_message?: string;
  wa_message_id?: string;
  batch_id?: string;
  sent_at: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export interface WhatsAppStatus {
  success: boolean;
  status: 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED';
  qrCodeDataUrl: string | null;
  connectedPhone: string | null;
}

export const api = {
  async getSummary(period?: string, search?: string, status?: string): Promise<DashboardSummary> {
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (search) params.append('search', search);
    if (status && status !== 'ALL') params.append('status', status);

    const res = await fetch(`/api/summary?${params.toString()}`);
    return res.json();
  },

  async updateMukellef(code: string, data: { customName?: string; customPhone?: string; customEmail?: string; notes?: string }) {
    const res = await fetch(`/api/mukellefler/${code}/override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async sendBatch(data: {
    mukellefCode: string;
    documentIds: string[];
    channel?: 'WHATSAPP' | 'EMAIL' | 'BOTH';
    customPhone?: string;
    customEmail?: string;
    customMessage?: string;
  }) {
    const res = await fetch('/api/send/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async sendBulk(data: {
    period: string;
    mukellefCodes?: string[];
    channel?: 'WHATSAPP' | 'EMAIL' | 'BOTH';
    onlyPending?: boolean;
    customMessage?: string;
  }) {
    const res = await fetch('/api/send/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getLogs(limit = 100, period?: string): Promise<{ success: boolean; logs: SendLogItem[] }> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (period) params.append('period', period);
    const res = await fetch(`/api/logs?${params.toString()}`);
    return res.json();
  },

  async getWhatsAppStatus(): Promise<WhatsAppStatus> {
    const res = await fetch('/api/whatsapp/status');
    return res.json();
  },

  async connectWhatsApp() {
    const res = await fetch('/api/whatsapp/connect', { method: 'POST' });
    return res.json();
  },

  async disconnectWhatsApp() {
    const res = await fetch('/api/whatsapp/disconnect', { method: 'POST' });
    return res.json();
  },

  async getSettings(): Promise<{
    success: boolean;
    settings: {
      messageTemplate: string;
      zirveDataPath: string;
      smtp: SmtpConfig;
      isSmtpConfigured: boolean;
    };
  }> {
    const res = await fetch('/api/settings');
    return res.json();
  },

  async saveSettings(data: { messageTemplate?: string; smtp?: Partial<SmtpConfig> }) {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async testSmtp(smtpConfig: SmtpConfig): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/email/test-smtp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ smtpConfig })
    });
    return res.json();
  },

  getPreviewUrl(docId: string): string {
    return `/api/documents/preview/${docId}`;
  },

  getWhatsAppWebUrl(phone: string, text: string): string {
    const cleanDigits = phone.replace(/\D/g, '');
    let normalized = cleanDigits;
    if (cleanDigits.startsWith('0') && cleanDigits.length === 11) {
      normalized = '9' + cleanDigits;
    } else if (cleanDigits.length === 10 && cleanDigits.startsWith('5')) {
      normalized = '90' + cleanDigits;
    }
    return `https://web.whatsapp.com/send?phone=${normalized}&text=${encodeURIComponent(text)}`;
  }
};
