import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { CONFIG } from './config.js';

// Ensure data directory exists
if (!fs.existsSync(CONFIG.DATA_DIR)) {
  fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
}

export const db = new Database(CONFIG.DB_PATH);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS send_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mukellef_code TEXT NOT NULL,
    document_name TEXT NOT NULL,
    document_path TEXT NOT NULL,
    period TEXT NOT NULL,
    category TEXT NOT NULL,
    phone TEXT NOT NULL,
    recipient_name TEXT,
    status TEXT NOT NULL, -- 'SENT', 'FAILED', 'PENDING'
    error_message TEXT,
    wa_message_id TEXT,
    batch_id TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_send_logs_mukellef_period 
    ON send_logs (mukellef_code, period);
  CREATE INDEX IF NOT EXISTS idx_send_logs_path 
    ON send_logs (document_path);

  CREATE TABLE IF NOT EXISTS mukellef_overrides (
    mukellef_code TEXT PRIMARY KEY,
    custom_name TEXT,
    custom_phone TEXT,
    notes TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Migrations for existing databases: check and add missing columns
const sendLogsColumns = db.prepare("PRAGMA table_info(send_logs)").all() as Array<{ name: string }>;
const sendLogsColNames = new Set(sendLogsColumns.map(c => c.name));

if (!sendLogsColNames.has('channel')) {
  db.exec("ALTER TABLE send_logs ADD COLUMN channel TEXT DEFAULT 'WHATSAPP'");
}
if (!sendLogsColNames.has('email')) {
  db.exec("ALTER TABLE send_logs ADD COLUMN email TEXT");
}

const overrideColumns = db.prepare("PRAGMA table_info(mukellef_overrides)").all() as Array<{ name: string }>;
const overrideColNames = new Set(overrideColumns.map(c => c.name));

if (!overrideColNames.has('custom_email')) {
  db.exec("ALTER TABLE mukellef_overrides ADD COLUMN custom_email TEXT");
}

// Types
export interface SendLog {
  id?: number;
  mukellef_code: string;
  document_name: string;
  document_path: string;
  period: string;
  category: string;
  phone: string;
  recipient_name?: string;
  channel?: 'WHATSAPP' | 'EMAIL' | 'BOTH';
  email?: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
  error_message?: string;
  wa_message_id?: string;
  batch_id?: string;
  sent_at?: string;
}

export interface MukellefOverride {
  mukellef_code: string;
  custom_name?: string;
  custom_phone?: string;
  custom_email?: string;
  notes?: string;
  updated_at?: string;
}

// Database Helper Methods
export const dbService = {
  // Logs
  recordSendLog(log: SendLog): number {
    const stmt = db.prepare(`
      INSERT INTO send_logs (
        mukellef_code, document_name, document_path, period, 
        category, phone, recipient_name, channel, email, status, error_message, wa_message_id, batch_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      log.mukellef_code,
      log.document_name,
      log.document_path,
      log.period,
      log.category,
      log.phone || '',
      log.recipient_name || '',
      log.channel || 'WHATSAPP',
      log.email || null,
      log.status,
      log.error_message || null,
      log.wa_message_id || null,
      log.batch_id || null
    );
    return Number(info.lastInsertRowid);
  },

  getRecentLogs(limit = 100): SendLog[] {
    const stmt = db.prepare(`
      SELECT * FROM send_logs 
      ORDER BY sent_at DESC 
      LIMIT ?
    `);
    return stmt.all(limit) as SendLog[];
  },

  getLogsByPeriod(period: string): SendLog[] {
    const stmt = db.prepare(`
      SELECT * FROM send_logs 
      WHERE period = ? 
      ORDER BY sent_at DESC
    `);
    return stmt.all(period) as SendLog[];
  },

  getSentDocumentsMap(): Map<string, SendLog> {
    // Map of document_path -> latest successful SendLog
    const stmt = db.prepare(`
      SELECT * FROM send_logs 
      WHERE status = 'SENT'
      ORDER BY sent_at ASC
    `);
    const logs = stmt.all() as SendLog[];
    const map = new Map<string, SendLog>();
    for (const log of logs) {
      map.set(log.document_path, log);
    }
    return map;
  },

  // Overrides
  getOverrides(): Map<string, MukellefOverride> {
    const stmt = db.prepare('SELECT * FROM mukellef_overrides');
    const rows = stmt.all() as MukellefOverride[];
    const map = new Map<string, MukellefOverride>();
    for (const row of rows) {
      map.set(row.mukellef_code, row);
    }
    return map;
  },

  saveOverride(override: MukellefOverride): void {
    const stmt = db.prepare(`
      INSERT INTO mukellef_overrides (mukellef_code, custom_name, custom_phone, custom_email, notes, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(mukellef_code) DO UPDATE SET
        custom_name = excluded.custom_name,
        custom_phone = excluded.custom_phone,
        custom_email = excluded.custom_email,
        notes = excluded.notes,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(
      override.mukellef_code,
      override.custom_name || null,
      override.custom_phone || null,
      override.custom_email || null,
      override.notes || null
    );
  },

  // Settings
  getSetting(key: string, defaultValue = ''): string {
    const stmt = db.prepare('SELECT value FROM app_settings WHERE key = ?');
    const row = stmt.get(key) as { value: string } | undefined;
    return row ? row.value : defaultValue;
  },

  setSetting(key: string, value: string): void {
    const stmt = db.prepare(`
      INSERT INTO app_settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    stmt.run(key, value);
  }
};
