import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { CONFIG } from './config.js';
import { apiRouter } from './routes/api.js';
import { generateMockZirveData } from './mockGenerator.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Serve frontend in production build if exists
const frontendDist = path.resolve(process.cwd(), '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
}

// Start server
async function start() {
  // If zirvedata directory doesn't exist, generate mock data automatically
  if (!fs.existsSync(CONFIG.ZIRVE_DATA_PATH)) {
    console.log(`[Zirve] Data folder not found at ${CONFIG.ZIRVE_DATA_PATH}. Initializing mock data...`);
    try {
      await generateMockZirveData();
    } catch (err) {
      console.error('[Zirve] Error generating mock data:', err);
    }
  }

  const server = app.listen(CONFIG.PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 Zirve WhatsApp Evrak Gönderici Başlatıldı`);
    console.log(`📡 Backend API: http://localhost:${CONFIG.PORT}`);
    console.log(`📁 Zirve Veri Yolu: ${CONFIG.ZIRVE_DATA_PATH}`);
    console.log(`💾 Veritabanı: ${CONFIG.DB_PATH}`);
    console.log(`=========================================`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Zirve] Hata: Port ${CONFIG.PORT} zaten kullanımda. Lütfen çalışan diğer sunucuyu kapatın.`);
    } else {
      console.error('[Zirve] Sunucu hatası:', err);
    }
  });
}

start().catch(console.error);
