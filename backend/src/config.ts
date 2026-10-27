import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

function resolveDataPath(): string {
  const envPath = process.env.ZIRVE_DATA_PATH;
  if (envPath) {
    if (path.isAbsolute(envPath)) return envPath;
    const fromCwd = path.resolve(process.cwd(), envPath);
    if (fs.existsSync(fromCwd)) return fromCwd;
    const fromParent = path.resolve(process.cwd(), '..', envPath);
    if (fs.existsSync(fromParent)) return fromParent;
    return fromCwd;
  }
  const mockFromCwd = path.resolve(process.cwd(), 'mock_zirvedata');
  if (fs.existsSync(mockFromCwd)) return mockFromCwd;
  return path.resolve(process.cwd(), '../mock_zirvedata');
}

function resolveStorageDir(): string {
  const envDir = process.env.DATA_DIR;
  if (envDir) {
    if (path.isAbsolute(envDir)) return envDir;
    const normalized = envDir.replace(/^\.\/backend\//, './');
    return path.resolve(process.cwd(), normalized);
  }
  return path.resolve(process.cwd(), 'data');
}

const dataDir = resolveStorageDir();

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  ZIRVE_DATA_PATH: resolveDataPath(),
  DATA_DIR: dataDir,
  WA_AUTH_DIR: path.resolve(dataDir, 'wa_auth'),
  DB_PATH: path.resolve(dataDir, 'muhasebe.db'),
  DEFAULT_MESSAGE_TEMPLATE: process.env.DEFAULT_MESSAGE_TEMPLATE || 
    'Sayın {UNVAN},\n\n{DONEM} dönemine ait {BELGELER} ekte bilgilerinize sunulmuştur.\n\nBilgilerinize arz eder, iyi çalışmalar dileriz.\n\nMuhasebe Departmanı',
};
