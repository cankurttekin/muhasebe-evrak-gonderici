import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config.js';
import { dbService } from '../db.js';
import { scanZirveData, normalizePhone } from '../zirveScanner.js';
import { whatsappService } from '../whatsappService.js';

export const apiRouter = Router();

// GET /api/summary - Dashboard overview & mukellef list
apiRouter.get('/summary', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || undefined;
    const search = ((req.query.search as string) || '').toLowerCase().trim();
    const statusFilter = (req.query.status as string) || 'ALL';

    const summary = await scanZirveData(period);

    // Apply period fallback to latest if none specified and periods exist
    let activePeriod = period;
    if (!activePeriod && summary.periods.length > 0) {
      activePeriod = summary.periods[0];
      // Re-scan with top period if not specified
      const periodSpecificSummary = await scanZirveData(activePeriod);
      summary.mukellefler = periodSpecificSummary.mukellefler;
      summary.stats = periodSpecificSummary.stats;
    }

    // Apply search filter
    let filteredMukellefler = summary.mukellefler;
    if (search) {
      filteredMukellefler = filteredMukellefler.filter(m =>
        m.name.toLowerCase().includes(search) ||
        m.code.toLowerCase().includes(search) ||
        m.phone.includes(search) ||
        (m.taxNumber && m.taxNumber.includes(search)) ||
        (m.contactPerson && m.contactPerson.toLowerCase().includes(search))
      );
    }

    // Apply status filter
    if (statusFilter === 'ALL_SENT') {
      filteredMukellefler = filteredMukellefler.filter(m => m.status === 'ALL_SENT');
    } else if (statusFilter === 'PARTIALLY_SENT') {
      filteredMukellefler = filteredMukellefler.filter(m => m.status === 'PARTIALLY_SENT');
    } else if (statusFilter === 'NOT_SENT') {
      filteredMukellefler = filteredMukellefler.filter(m => m.status === 'NOT_SENT');
    } else if (statusFilter === 'PENDING') {
      filteredMukellefler = filteredMukellefler.filter(m => m.status === 'NOT_SENT' || m.status === 'PARTIALLY_SENT');
    }

    res.json({
      success: true,
      selectedPeriod: activePeriod || '',
      periods: summary.periods,
      totalMukellefs: summary.totalMukellefs,
      stats: summary.stats,
      mukellefler: filteredMukellefler
    });
  } catch (err: any) {
    console.error('Error in /api/summary:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/mukellefler/:code - Single mukellef details
apiRouter.get('/mukellefler/:code', async (req: Request, res: Response) => {
  try {
    const code = String(req.params.code);
    const period = (req.query.period as string) || undefined;
    const summary = await scanZirveData(period);
    const mukellef = summary.mukellefler.find(m => m.code === code);

    if (!mukellef) {
      return res.status(404).json({ success: false, error: 'Mükellef bulunamadı' });
    }

    // Also get send history logs for this mükellef
    const history = dbService.getRecentLogs(200).filter(l => l.mukellef_code === code);

    res.json({
      success: true,
      mukellef,
      history
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/mukellefler/:code/override - Update client phone, name, notes
apiRouter.post('/mukellefler/:code/override', (req: Request, res: Response) => {
  try {
    const code = String(req.params.code);
    const { customName, customPhone, notes } = req.body;

    dbService.saveOverride({
      mukellef_code: code,
      custom_name: customName,
      custom_phone: customPhone,
      notes
    });

    res.json({ success: true, message: 'Bilgiler başarıyla güncellendi' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/documents/preview/:id - Read-only PDF stream
apiRouter.get('/documents/preview/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const relPath = Buffer.from(id, 'base64url').toString('utf-8');
    const fullPath = path.resolve(CONFIG.ZIRVE_DATA_PATH, relPath);

    // Security check: ensure path stays within ZIRVE_DATA_PATH
    if (!fullPath.startsWith(path.resolve(CONFIG.ZIRVE_DATA_PATH))) {
      return res.status(403).json({ success: false, error: 'Geçersiz dosya yolu' });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, error: 'Dosya bulunamadı' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(fullPath)}"`);
    // Read-only stream
    const stream = fs.createReadStream(fullPath);
    stream.pipe(res);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/send/batch - Send selected documents of a mükellef
apiRouter.post('/send/batch', async (req: Request, res: Response) => {
  try {
    const { mukellefCode, documentIds, customPhone, customMessage } = req.body;

    if (!mukellefCode || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Mükellef ve belge seçimi zorunludur' });
    }

    const summary = await scanZirveData();
    const mukellef = summary.mukellefler.find(m => m.code === mukellefCode);
    if (!mukellef) {
      return res.status(404).json({ success: false, error: 'Mükellef bulunamadı' });
    }

    const targetPhone = customPhone || mukellef.phone;
    if (!targetPhone) {
      return res.status(400).json({ success: false, error: 'Mükellef telefon numarası bulunamadı' });
    }

    // Find requested documents
    const requestedDocs = mukellef.documents.filter(d => documentIds.includes(d.id));
    if (requestedDocs.length === 0) {
      return res.status(400).json({ success: false, error: 'Seçilen belgeler bulunamadı' });
    }

    // Default template if message not provided
    const template = customMessage || dbService.getSetting('message_template', CONFIG.DEFAULT_MESSAGE_TEMPLATE);
    const docNames = requestedDocs.map(d => `${d.docType} (${d.category})`).join(', ');
    const period = requestedDocs[0]?.period || '';

    const formattedMessage = template
      .replace(/{UNVAN}/g, mukellef.name)
      .replace(/{DONEM}/g, period)
      .replace(/{BELGELER}/g, docNames);

    const result = await whatsappService.sendDocumentsToMukellef({
      mukellefCode,
      mukellefName: mukellef.name,
      phone: targetPhone,
      documents: requestedDocs,
      customMessage: formattedMessage
    });

    res.json({
      success: result.sentCount > 0,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      results: result.results
    });
  } catch (err: any) {
    console.error('Error in /api/send/batch:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/send/bulk - Bulk send for multiple mükellefs
apiRouter.post('/send/bulk', async (req: Request, res: Response) => {
  try {
    const { period, mukellefCodes, onlyPending = true, customMessage } = req.body;

    if (!period) {
      return res.status(400).json({ success: false, error: 'Dönem seçimi zorunludur' });
    }

    const summary = await scanZirveData(period);
    let targetMukellefler = summary.mukellefler;

    if (Array.isArray(mukellefCodes) && mukellefCodes.length > 0) {
      targetMukellefler = targetMukellefler.filter(m => mukellefCodes.includes(m.code));
    }

    if (onlyPending) {
      targetMukellefler = targetMukellefler.filter(m => m.pendingDocs > 0);
    }

    const template = customMessage || dbService.getSetting('message_template', CONFIG.DEFAULT_MESSAGE_TEMPLATE);

    let totalSent = 0;
    let totalFailed = 0;
    const clientResults: Array<{ mukellef: string; sent: number; failed: number }> = [];

    for (const mukellef of targetMukellefler) {
      if (!mukellef.phone) {
        clientResults.push({ mukellef: mukellef.name, sent: 0, failed: mukellef.pendingDocs });
        continue;
      }

      const docsToSend = onlyPending
        ? mukellef.documents.filter(d => !d.isSent)
        : mukellef.documents;

      if (docsToSend.length === 0) continue;

      const docNames = docsToSend.map(d => `${d.docType} (${d.category})`).join(', ');
      const formattedMessage = template
        .replace(/{UNVAN}/g, mukellef.name)
        .replace(/{DONEM}/g, period)
        .replace(/{BELGELER}/g, docNames);

      const resBatch = await whatsappService.sendDocumentsToMukellef({
        mukellefCode: mukellef.code,
        mukellefName: mukellef.name,
        phone: mukellef.phone,
        documents: docsToSend,
        customMessage: formattedMessage
      });

      totalSent += resBatch.sentCount;
      totalFailed += resBatch.failedCount;
      clientResults.push({
        mukellef: mukellef.name,
        sent: resBatch.sentCount,
        failed: resBatch.failedCount
      });

      // Pause between clients
      await new Promise(r => setTimeout(r, 2000));
    }

    res.json({
      success: true,
      totalSent,
      totalFailed,
      clientCount: targetMukellefler.length,
      clientResults
    });
  } catch (err: any) {
    console.error('Error in /api/send/bulk:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/logs - Sending audit logs
apiRouter.get('/logs', (req: Request, res: Response) => {
  try {
    const limit = parseInt((req.query.limit as string) || '100', 10);
    const period = (req.query.period as string) || undefined;

    const logs = period ? dbService.getLogsByPeriod(period) : dbService.getRecentLogs(limit);
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// WhatsApp endpoints
apiRouter.get('/whatsapp/status', (req: Request, res: Response) => {
  res.json({ success: true, ...whatsappService.getStatus() });
});

apiRouter.post('/whatsapp/connect', async (req: Request, res: Response) => {
  try {
    await whatsappService.initWhatsApp();
    res.json({ success: true, message: 'WhatsApp başlatıldı' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/whatsapp/disconnect', async (req: Request, res: Response) => {
  try {
    await whatsappService.disconnect();
    res.json({ success: true, message: 'WhatsApp bağlantısı kesildi' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Settings endpoints
apiRouter.get('/settings', (req: Request, res: Response) => {
  const template = dbService.getSetting('message_template', CONFIG.DEFAULT_MESSAGE_TEMPLATE);
  res.json({
    success: true,
    settings: {
      messageTemplate: template,
      zirveDataPath: CONFIG.ZIRVE_DATA_PATH
    }
  });
});

apiRouter.post('/settings', (req: Request, res: Response) => {
  const { messageTemplate } = req.body;
  if (messageTemplate) {
    dbService.setSetting('message_template', messageTemplate);
  }
  res.json({ success: true, message: 'Ayarlar kaydedildi' });
});
