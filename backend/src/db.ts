import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER', -- 'ADMIN' | 'USER'
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
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

export type UserRole = 'ADMIN' | 'USER';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  name: string;
  role: UserRole;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export type SafeUser = Omit<User, 'password_hash'>;

export interface Session {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
  created_at: string;
}

// Password hashing with scrypt
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
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
  },

  // Users & Authentication
  getUserByUsername(username: string): User | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)');
    return stmt.get(username) as User | undefined;
  },

  getUserById(id: number): User | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as User | undefined;
  },

  getAllUsers(): SafeUser[] {
    const stmt = db.prepare(`
      SELECT id, username, name, role, is_active, created_at, updated_at 
      FROM users 
      ORDER BY id ASC
    `);
    return stmt.all() as SafeUser[];
  },

  createUser(username: string, passwordHash: string, name: string, role: UserRole = 'USER'): number {
    const stmt = db.prepare(`
      INSERT INTO users (username, password_hash, name, role, is_active)
      VALUES (?, ?, ?, ?, 1)
    `);
    const info = stmt.run(username.trim().toLowerCase(), passwordHash, name.trim(), role);
    return Number(info.lastInsertRowid);
  },

  updateUser(id: number, data: { name?: string; role?: UserRole; is_active?: number; passwordHash?: string }): void {
    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name.trim());
    }
    if (data.role !== undefined) {
      updates.push('role = ?');
      params.push(data.role);
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(data.is_active ? 1 : 0);
    }
    if (data.passwordHash !== undefined) {
      updates.push('password_hash = ?');
      params.push(data.passwordHash);
    }

    params.push(id);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...params);
  },

  deleteUser(id: number): void {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  },

  createSession(userId: number, token: string, expiresAt: Date): void {
    const stmt = db.prepare(`
      INSERT INTO sessions (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(userId, token, expiresAt.toISOString());
  },

  getSessionUser(token: string): SafeUser | undefined {
    const stmt = db.prepare(`
      SELECT u.id, u.username, u.name, u.role, u.is_active, u.created_at, u.updated_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND datetime(s.expires_at) > datetime('now') AND u.is_active = 1
    `);
    return stmt.get(token) as SafeUser | undefined;
  },

  deleteSession(token: string): void {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  },

  cleanupExpiredSessions(): void {
    db.prepare("DELETE FROM sessions WHERE datetime(expires_at) <= datetime('now')").run();
  },

  seedInitialAdmin(): void {
    const row = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    if (row.count === 0) {
      const defaultUsername = process.env.ADMIN_INITIAL_USERNAME || 'admin';
      const defaultPassword = process.env.ADMIN_INITIAL_PASSWORD || 'admin123';
      const hash = hashPassword(defaultPassword);
      db.prepare(`
        INSERT INTO users (username, password_hash, name, role, is_active)
        VALUES (?, ?, ?, 'ADMIN', 1)
      `).run(defaultUsername, hash, 'Sistem Yöneticisi');
      console.log(`[Auth] Varsayılan yönetici hesabı oluşturuldu.`);
      console.log(`[Auth] Kullanıcı adı: ${defaultUsername}`);
      console.log(`[Auth] Parola: ${defaultPassword}`);
    }
  }
};
