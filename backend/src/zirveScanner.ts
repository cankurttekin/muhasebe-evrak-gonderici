import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { CONFIG } from './config.js';
import { dbService, SendLog } from './db.js';

const require = createRequire(import.meta.url);
let iconv: any;
try {
  iconv = require('iconv-lite');
} catch {
  iconv = null;
}

export interface DirectoryOption {
  key: string;
  path: string;
  label: string;
  enabled: boolean;
  description?: string;
}

export const DEFAULT_DIRECTORY_OPTIONS: DirectoryOption[] = [
  { key: 'BEYANNAME', path: 'BEYANNAME', label: 'BEYANNAME', enabled: true, description: 'Vergi Beyannameleri (KDV, Muhtasar, Gelir, Kurumlar, vb.)' },
  { key: 'DILEKCELER', path: 'DİLEKÇELER', label: 'DİLEKÇELER', enabled: true, description: 'İnteraktif Vergi Dairesi Dilekçeleri' },
  { key: 'ETEBLIGAT', path: 'eTebligat', label: 'eTebligat', enabled: true, description: 'Elektronik Tebligatlar (GİB / Ticaret)' },
  { key: 'EBILDIRGE_HIZMET', path: 'E_BİLDİRGE/HİZMET_LİSTESİ', label: 'E_BİLDİRGE / HİZMET_LİSTESİ', enabled: true, description: 'SGK Sigortalı Hizmet Listeleri' },
  { key: 'EBILDIRGE_TAHAKKUK', path: 'E_BİLDİRGE/TAHAKKUK', label: 'E_BİLDİRGE / TAHAKKUK', enabled: true, description: 'SGK Bildirge Tahakkuk Fişleri' },
  { key: 'TAHAKKUK', path: 'TAHAKKUK', label: 'TAHAKKUK', enabled: true, description: 'Vergi Tahakkuk Fişleri' },
  { key: 'SGK_BORCU_YOKTUR', path: 'SGK_BORCU_YOKTUR', label: 'SGK_BORCU_YOKTUR', enabled: false, description: 'SGK Borcu Yoktur Yazıları' },
  { key: 'VERGI_LEVHALARI', path: 'Vergi_Levhaları', label: 'Vergi_Levhaları', enabled: false, description: 'Vergi Levhaları' },
  { key: 'TICARET_SICIL', path: 'Ticaret_Sicil_Gazeteleri', label: 'Ticaret_Sicil_Gazeteleri', enabled: false, description: 'Sicil Gazetesi İlanları' },
  { key: 'ISE_GIRIS_CIKIS', path: 'İŞE_GİRİŞ_ÇIKIŞ', label: 'İŞE_GİRİŞ_ÇIKIŞ', enabled: false, description: 'Sigortalı İşe Giriş / Ayrılış Bildirgeleri' },
  { key: 'FIS_BELGELERI', path: 'FİŞ_BELGELERİ', label: 'FİŞ_BELGELERİ', enabled: false, description: 'Muhasebe Fiş ve Belge Ekleri' },
  { key: 'DIGER', path: 'DİĞER', label: 'DİĞER', enabled: false, description: 'Diğer Belgeler' }
];

export function getDirectoryOptions(): DirectoryOption[] {
  const raw = dbService.getSetting('scanned_directories', '');
  if (!raw) return DEFAULT_DIRECTORY_OPTIONS;
  try {
    const saved = JSON.parse(raw) as DirectoryOption[];
    const map = new Map<string, DirectoryOption>(saved.map(d => [d.key, d]));
    return DEFAULT_DIRECTORY_OPTIONS.map(def => {
      const existing = map.get(def.key);
      return existing ? { ...def, enabled: existing.enabled } : def;
    });
  } catch {
    return DEFAULT_DIRECTORY_OPTIONS;
  }
}

export function saveDirectoryOptions(options: DirectoryOption[]): void {
  dbService.setSetting('scanned_directories', JSON.stringify(options));
}

function normalizePathForCompare(p: string): string {
  return p
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .toLocaleLowerCase('tr-TR')
    .replace(/i̇/g, 'i');
}

export interface ZirveDocument {
  id: string; // unique hash or safe path
  fileName: string;
  relativePath: string; // relative to ZIRVE_DATA_PATH
  fullPath: string;
  category: string; // BEYANNAME, TAHAKKUK, SGK, etc.
  period: string; // YYYY-MM
  docType: string; // KDV1, MUHSGK, etc.
  size: number;
  modifiedAt: string;
  isSent: boolean;
  lastSentAt?: string;
  sentPhone?: string;
}

export interface MukellefInfo {
  code: string; // e.g. KAYALAR_LTD
  name: string; // e.g. KAYALAR TEKSTİL LTD. ŞTİ.
  phone: string; // cleaned phone e.g. 905321234567
  displayPhone: string; // 0 (532) 123 45 67
  email: string;
  contactPerson?: string;
  taxNumber?: string;
  folderPath: string;
  isPhoneOverridden: boolean;
  isEmailOverridden: boolean;
  notes?: string;
  documents: ZirveDocument[];
  // Stats for the active filter/period
  totalDocs: number;
  sentDocs: number;
  pendingDocs: number;
  status: 'ALL_SENT' | 'PARTIALLY_SENT' | 'NOT_SENT' | 'NO_DOCS';
}

export interface ScannerSummary {
  dataPath: string;
  exists: boolean;
  periods: string[];
  totalMukellefs: number;
  mukellefler: MukellefInfo[];
  stats: {
    totalDocs: number;
    sentDocs: number;
    pendingDocs: number;
    fullySentMukellefs: number;
    pendingMukellefs: number;
  };
}

/**
 * Normalizes phone numbers to standard format and WhatsApp format.
 */
export function normalizePhone(rawPhone: string): { raw: string; cleaned: string; display: string; waNumber: string } {
  if (!rawPhone) {
    return { raw: '', cleaned: '', display: '', waNumber: '' };
  }
  // Strip all non-digit characters
  let digits = rawPhone.replace(/\D/g, '');

  // Handle Turkish phone formats
  // e.g. 05321234567 -> 905321234567
  // e.g. 5321234567  -> 905321234567
  // e.g. 905321234567 -> 905321234567
  // e.g. 00905321234567 -> 905321234567
  if (digits.startsWith('0090')) {
    digits = digits.substring(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = '9' + digits;
  } else if (digits.length === 10 && digits.startsWith('5')) {
    digits = '90' + digits;
  }

  // Display format: 0 (5XX) XXX XX XX
  let display = digits;
  if (digits.startsWith('90') && digits.length === 12) {
    const p = digits.substring(2);
    display = `0 (${p.substring(0, 3)}) ${p.substring(3, 6)} ${p.substring(6, 8)} ${p.substring(8, 10)}`;
  }

  return {
    raw: rawPhone,
    cleaned: digits,
    display,
    waNumber: digits
  };
}

/**
 * Parses SirketBilgileri text file from company folder.
 */
export async function parseSirketBilgileri(companyFolderPath: string): Promise<{
  name?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  taxNumber?: string;
}> {
  const possibleFileNames = [
    'SirketBilgileri',
    'SirketBilgileri.ini',
    'SirketBilgileri.txt',
    'sirketbilgileri.ini',
    'sirketbilgileri.txt',
    'sirketbilgileri',
    'SIRKETBILGILERI.INI',
    'SIRKETBILGILERI.TXT'
  ];

  let filePath = '';
  for (const name of possibleFileNames) {
    const candidate = path.join(companyFolderPath, name);
    if (fs.existsSync(candidate)) {
      filePath = candidate;
      break;
    }
  }

  if (!filePath) {
    return {};
  }

  try {
    const buf = await fs.promises.readFile(filePath);
    let content = '';
    const utf8Str = buf.toString('utf-8');
    if (iconv && (utf8Str.includes('\ufffd') || !/^[\x00-\x7F]*$/.test(utf8Str))) {
      content = iconv.decode(buf, 'win1254');
    } else {
      content = utf8Str;
    }

    const lines = content.split(/\r?\n/);
    const result: { name?: string; phone?: string; email?: string; contactPerson?: string; taxNumber?: string } = {};
    let alanKodu = '';
    let tel = '';
    let edit11 = '';
    let edit2 = '';
    let adi = '';
    let mobilePhone = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;

      const eqIdx = trimmed.indexOf('=');
      const colonIdx = trimmed.indexOf(':');
      const splitIdx = eqIdx > -1 ? eqIdx : colonIdx;

      if (splitIdx === -1) continue;

      const key = trimmed.substring(0, splitIdx).trim().toLowerCase();
      const val = trimmed.substring(splitIdx + 1).trim();

      if (!val) continue;

      // Match mobile phone specifically
      if (
        key === 'ceptel' ||
        key === 'cep' ||
        key === 'gsm' ||
        key === 'mobil' ||
        key === 'yetkiligsm' ||
        key === 'yetkilicep'
      ) {
        if (!mobilePhone) mobilePhone = val;
      }
      // Match phone fields
      else if (key === 'alankodu' || key === 'alan_kodu') {
        alanKodu = val;
      } else if (key === 'tel' || key === 'telefon' || key === 'tel1') {
        tel = val;
      } else if (key === 'edit11') {
        edit11 = val;
      } else if (
        key === 'phone' ||
        key === 'yetkilitel' ||
        key === 'yetkili_tel'
      ) {
        if (!result.phone) result.phone = val;
      }
      // Match email
      else if (
        key === 'email' ||
        key === 'e-mail' ||
        key === 'mail' ||
        key === 'eposta' ||
        key === 'e_posta' ||
        key === 'yetkiliemail' ||
        key === 'yetkili_email' ||
        key === 'sirketmail' ||
        key === 'sirket_mail'
      ) {
        if (!result.email) result.email = val;
      }
      // Match company name parts in Zirve (Edit2 = title line 1, Adi = title line 2)
      else if (key === 'edit2') {
        edit2 = val;
      } else if (key === 'adi') {
        adi = val;
      } else if (
        key === 'unvan' ||
        key === 'firmaadi' ||
        key === 'firma_adi' ||
        key === 'sirketadi' ||
        key === 'sirket_adi' ||
        key === 'name'
      ) {
        if (!result.name) result.name = val;
      }
      // Match contact person
      else if (
        key === 'yetkili' ||
        key === 'yetkiliadi' ||
        key === 'yetkili_adi' ||
        key === 'ilgili' ||
        key === 'contact'
      ) {
        if (!result.contactPerson) result.contactPerson = val;
      }
      // Match Tax ID
      else if (
        key === 'vergino' ||
        key === 'vergi_no' ||
        key === 'vkn' ||
        key === 'tckn' ||
        key === 'tckimlikno'
      ) {
        if (!result.taxNumber) result.taxNumber = val;
      }
    }

    // Determine best company name
    if (!result.name) {
      if (edit2 && adi) {
        result.name = `${edit2} ${adi}`.trim();
      } else if (edit2) {
        result.name = edit2;
      } else if (adi) {
        result.name = adi;
      }
    }

    // Determine best phone number: mobile first, then alanKodu+tel or edit11
    if (mobilePhone) {
      result.phone = mobilePhone;
    } else if (!result.phone) {
      if (alanKodu && tel) {
        result.phone = `${alanKodu}${tel}`;
      } else if (edit11) {
        result.phone = edit11;
      } else if (tel) {
        result.phone = tel;
      }
    }

    return result;
  } catch (err) {
    console.error(`Error reading SirketBilgileri at ${filePath}:`, err);
    return {};
  }
}

/**
 * Extracts Year-Month period and clean doc type from document filename.
 */
export function parseDocFileInfo(fileName: string, mtime: Date): { period: string; docType: string } {
  const baseName = fileName.replace(/\.[^/.]+$/, ''); // remove .pdf

  let period = '';
  // Pattern 1: 2024_09, 2026-09, 202609
  const p1 = /(?:^|[_\-.])(202[0-9])[-_.]?(0[1-9]|1[0-2])(?:[_\-.]|$)/i.exec(baseName);
  if (p1) {
    period = `${p1[1]}-${p1[2]}`;
  } else {
    // Pattern 2: 09_2026, 092026
    const p2 = /(?:^|[_\-.])(0[1-9]|1[0-2])[-_.]?(202[0-9])(?:[_\-.]|$)/i.exec(baseName);
    if (p2) {
      period = `${p2[2]}-${p2[1]}`;
    } else {
      // Fallback: file mtime
      const y = mtime.getFullYear();
      const m = String(mtime.getMonth() + 1).padStart(2, '0');
      period = `${y}-${m}`;
    }
  }

  // Document type extraction
  // Clean out date parts and underscores to find document label
  let docType = baseName
    .replace(/(?:^|[_\-.])202[0-9][-_.]?(?:0[1-9]|1[0-2])(?:[_\-.]|$)/gi, ' ')
    .replace(/(?:^|[_\-.])(?:0[1-9]|1[0-2])[-_.]?202[0-9](?:[_\-.]|$)/gi, ' ')
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .trim();

  if (!docType) {
    docType = baseName;
  }

  return { period, docType };
}

async function collectPdfFiles(dir: string): Promise<Array<{ fullPath: string; relDir: string; fileName: string }>> {
  const results: Array<{ fullPath: string; relDir: string; fileName: string }> = [];

  async function walk(currentDir: string, currentRel: string) {
    let entries: fs.Dirent[] = [];
    try {
      entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = path.join(currentDir, entry.name);
      const nextRel = currentRel ? `${currentRel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(full, nextRel);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
        results.push({
          fullPath: full,
          relDir: currentRel,
          fileName: entry.name
        });
      }
    }
  }

  await walk(dir, '');
  return results;
}

/**
 * Strictly READ-ONLY scan of ZIRVE_DATA_PATH.
 * Gathers all mükellefs and their documents.
 */
export async function scanZirveData(targetPeriod?: string): Promise<ScannerSummary> {
  const dataPath = CONFIG.ZIRVE_DATA_PATH;
  const exists = fs.existsSync(dataPath);

  if (!exists) {
    return {
      dataPath,
      exists: false,
      periods: [],
      totalMukellefs: 0,
      mukellefler: [],
      stats: { totalDocs: 0, sentDocs: 0, pendingDocs: 0, fullySentMukellefs: 0, pendingMukellefs: 0 }
    };
  }

  // Get sent documents map from SQLite
  const sentMap = dbService.getSentDocumentsMap();
  // Get overrides from SQLite
  const overrides = dbService.getOverrides();
  // Get directory configuration options
  const directoryOptions = getDirectoryOptions();

  const entries = await fs.promises.readdir(dataPath, { withFileTypes: true });
  const companyDirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.'));

  const mukellefler: MukellefInfo[] = [];
  const periodsSet = new Set<string>();

  for (const dir of companyDirs) {
    const companyCode = dir.name;
    const companyFolderPath = path.join(dataPath, companyCode);

    // Read SirketBilgileri (read-only)
    const companyInfo = await parseSirketBilgileri(companyFolderPath);

    // Check overrides
    const override = overrides.get(companyCode);
    const finalName = override?.custom_name || companyInfo.name || companyCode;
    const rawPhone = override?.custom_phone || companyInfo.phone || '';
    const phoneNorm = normalizePhone(rawPhone);
    const finalEmail = override?.custom_email || companyInfo.email || '';

    // Look for DÖKÜMANLAR / DOKUMANLAR folder (case-insensitive & Turkish char tolerant)
    let dokumanlarPath = '';
    try {
      const companySubEntries = await fs.promises.readdir(companyFolderPath, { withFileTypes: true });
      const dokDir = companySubEntries.find(e => {
        if (!e.isDirectory()) return false;
        const norm = e.name
          .normalize('NFC')
          .toUpperCase()
          .replace(/Ö/g, 'O')
          .replace(/Ü/g, 'U');
        return norm === 'DOKUMANLAR';
      });
      if (dokDir) {
        dokumanlarPath = path.join(companyFolderPath, dokDir.name);
      }
    } catch {
      continue;
    }

    const companyDocs: ZirveDocument[] = [];

    if (dokumanlarPath && fs.existsSync(dokumanlarPath)) {
      try {
        const allPdfs = await collectPdfFiles(dokumanlarPath);

        for (const pdf of allPdfs) {
          const relDirNorm = normalizePathForCompare(pdf.relDir);

          // Check against enabled directory options
          let matchedOption: DirectoryOption | undefined;
          for (const opt of directoryOptions) {
            const optNorm = normalizePathForCompare(opt.path);
            if (relDirNorm === optNorm || relDirNorm.startsWith(optNorm + '/') || (optNorm === '' && relDirNorm === '')) {
              matchedOption = opt;
              break;
            }
          }

          // If matched option exists and is disabled, skip it
          if (matchedOption && !matchedOption.enabled) {
            continue;
          }

          // If no option matched and relDir is not empty, check if parent matches or disable by default
          if (!matchedOption && pdf.relDir) {
            // Unconfigured directories are disabled by default
            continue;
          }

          const fullFilePath = pdf.fullPath;
          const relPath = path.relative(dataPath, fullFilePath);
          const stat = await fs.promises.stat(fullFilePath);

          const { period, docType } = parseDocFileInfo(pdf.fileName, stat.mtime);
          periodsSet.add(period);

          const sentLog = sentMap.get(relPath);

          // Determine readable category
          let category = 'DOKÜMAN';
          if (matchedOption) {
            category = matchedOption.label;
          } else if (pdf.relDir) {
            category = pdf.relDir.replace(/\//g, ' - ').toUpperCase();
          }

          companyDocs.push({
            id: Buffer.from(relPath).toString('base64url'),
            fileName: pdf.fileName,
            relativePath: relPath,
            fullPath: fullFilePath,
            category,
            period,
            docType,
            size: stat.size,
            modifiedAt: stat.mtime.toISOString(),
            isSent: !!sentLog,
            lastSentAt: sentLog?.sent_at,
            sentPhone: sentLog?.phone
          });
        }
      } catch (err) {
        console.error(`Error scanning documents in ${companyFolderPath}:`, err);
      }
    }

    // Filter documents by targetPeriod if provided
    const filteredDocs = targetPeriod
      ? companyDocs.filter(d => d.period === targetPeriod)
      : companyDocs;

    const totalDocs = filteredDocs.length;
    const sentDocs = filteredDocs.filter(d => d.isSent).length;
    const pendingDocs = totalDocs - sentDocs;

    let status: 'ALL_SENT' | 'PARTIALLY_SENT' | 'NOT_SENT' | 'NO_DOCS' = 'NO_DOCS';
    if (totalDocs > 0) {
      if (sentDocs === totalDocs) {
        status = 'ALL_SENT';
      } else if (sentDocs > 0) {
        status = 'PARTIALLY_SENT';
      } else {
        status = 'NOT_SENT';
      }
    }

    mukellefler.push({
      code: companyCode,
      name: finalName,
      phone: phoneNorm.cleaned,
      displayPhone: phoneNorm.display,
      email: finalEmail,
      contactPerson: companyInfo.contactPerson,
      taxNumber: companyInfo.taxNumber,
      folderPath: companyFolderPath,
      isPhoneOverridden: !!override?.custom_phone,
      isEmailOverridden: !!override?.custom_email,
      notes: override?.notes,
      documents: filteredDocs,
      totalDocs,
      sentDocs,
      pendingDocs,
      status
    });
  }

  // Sort periods descending (e.g. 2026-10, 2026-09, ...)
  const sortedPeriods = Array.from(periodsSet).sort().reverse();

  // Overall stats for the current view
  const totalDocs = mukellefler.reduce((acc, m) => acc + m.totalDocs, 0);
  const sentDocs = mukellefler.reduce((acc, m) => acc + m.sentDocs, 0);
  const pendingDocs = totalDocs - sentDocs;
  const fullySentMukellefs = mukellefler.filter(m => m.status === 'ALL_SENT').length;
  const pendingMukellefs = mukellefler.filter(m => m.status === 'PARTIALLY_SENT' || m.status === 'NOT_SENT').length;

  return {
    dataPath,
    exists: true,
    periods: sortedPeriods,
    totalMukellefs: mukellefler.length,
    mukellefler,
    stats: {
      totalDocs,
      sentDocs,
      pendingDocs,
      fullySentMukellefs,
      pendingMukellefs
    }
  };
}
