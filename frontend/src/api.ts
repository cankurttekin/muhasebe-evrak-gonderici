// API Client for Zirve WhatsApp Evrak Gönderici

export type UserRole = 'ADMIN' | 'USER';

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  is_active?: number;
  created_at?: string;
}

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
  pass?: string;
  hasPassword?: boolean;
  fromName: string;
  fromEmail: string;
}

export interface DirectoryOption {
  key: string;
  path: string;
  label: string;
  enabled: boolean;
  description?: string;
}

export interface WhatsAppStatus {
  success: boolean;
  status: 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED';
  qrCodeDataUrl: string | null;
  connectedPhone: string | null;
}

// Global token storage
let currentToken = localStorage.getItem('auth_token') || '';
let unauthorizedHandler: (() => void) | null = null;

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  if (currentToken) {
    headers.set('Authorization', `Bearer ${currentToken}`);
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && !url.includes('/api/auth/login')) {
    currentToken = '';
    localStorage.removeItem('auth_token');
    if (unauthorizedHandler) {
      unauthorizedHandler();
    }
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Token management
  getToken(): string {
    return currentToken;
  },
  setToken(token: string) {
    currentToken = token;
    localStorage.setItem('auth_token', token);
  },
  removeToken() {
    currentToken = '';
    localStorage.removeItem('auth_token');
  },
  onUnauthorized(cb: () => void) {
    unauthorizedHandler = cb;
  },

  // Auth endpoints
  async login(username: string, password: string): Promise<{ success: boolean; token?: string; user?: AuthUser; error?: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success && data.token) {
      api.setToken(data.token);
    }
    return data;
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      api.removeToken();
    }
  },

  async getMe(): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    return request<{ success: boolean; user?: AuthUser; error?: string }>('/api/auth/me');
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> {
    return request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  },

  // User Management endpoints (Admin only)
  async getUsers(): Promise<{ success: boolean; users: AuthUser[]; error?: string }> {
    return request('/api/users');
  },

  async createUser(data: { username: string; password: string; name: string; role: UserRole }): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    return request('/api/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateUser(id: number, data: { name?: string; role?: UserRole; is_active?: number }): Promise<{ success: boolean; message?: string; error?: string }> {
    return request(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async resetUserPassword(id: number, newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> {
    return request(`/api/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    });
  },

  async deleteUser(id: number): Promise<{ success: boolean; message?: string; error?: string }> {
    return request(`/api/users/${id}`, {
      method: 'DELETE'
    });
  },

  // Main Dashboard endpoints
  async getSummary(period?: string, search?: string, status?: string): Promise<DashboardSummary> {
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (search) params.append('search', search);
    if (status && status !== 'ALL') params.append('status', status);

    return request<DashboardSummary>(`/api/summary?${params.toString()}`);
  },

  async updateMukellef(code: string, data: { customName?: string; customPhone?: string; customEmail?: string; notes?: string }) {
    return request(`/api/mukellefler/${code}/override`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async sendBatch(data: {
    mukellefCode: string;
    documentIds: string[];
    channel?: 'WHATSAPP' | 'EMAIL' | 'BOTH';
    customPhone?: string;
    customEmail?: string;
    customMessage?: string;
  }) {
    return request<{
      success: boolean;
      sentCount: number;
      failedCount: number;
      results: Array<{ documentName: string; success: boolean; channel?: string; error?: string }>;
      error?: string;
    }>('/api/send/batch', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async sendBulk(data: {
    period: string;
    mukellefCodes?: string[];
    channel?: 'WHATSAPP' | 'EMAIL' | 'BOTH';
    onlyPending?: boolean;
    customMessage?: string;
  }) {
    return request<{
      success: boolean;
      totalSent: number;
      totalFailed: number;
      clientCount: number;
      clientResults: Array<{ mukellef: string; sent: number; failed: number }>;
      error?: string;
    }>('/api/send/bulk', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getLogs(limit = 100, period?: string): Promise<{ success: boolean; logs: SendLogItem[] }> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (period) params.append('period', period);
    return request<{ success: boolean; logs: SendLogItem[] }>(`/api/logs?${params.toString()}`);
  },

  async getWhatsAppStatus(): Promise<WhatsAppStatus> {
    return request<WhatsAppStatus>('/api/whatsapp/status');
  },

  async connectWhatsApp() {
    return request('/api/whatsapp/connect', { method: 'POST' });
  },

  async disconnectWhatsApp() {
    return request('/api/whatsapp/disconnect', { method: 'POST' });
  },

  async getSettings(): Promise<{
    success: boolean;
    settings: {
      messageTemplate: string;
      zirveDataPath: string;
      smtp: SmtpConfig;
      isSmtpConfigured: boolean;
      directoryOptions?: DirectoryOption[];
    };
  }> {
    return request('/api/settings');
  },

  async saveSettings(data: { messageTemplate?: string; smtp?: Partial<SmtpConfig>; directoryOptions?: DirectoryOption[] }) {
    return request('/api/settings', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async testSmtp(smtpConfig: SmtpConfig): Promise<{ success: boolean; message: string }> {
    return request('/api/email/test-smtp', {
      method: 'POST',
      body: JSON.stringify({ smtpConfig })
    });
  },

  getPreviewUrl(docId: string): string {
    const token = api.getToken();
    return `/api/documents/preview/${docId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
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
