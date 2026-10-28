import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config.js';
import { dbService } from '../db.js';
import { scanZirveData } from '../zirveScanner.js';
import { whatsappService } from '../whatsappService.js';
import { emailService, formatSmtpError } from '../emailService.js';

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

// POST /api/mukellefler/:code/override - Update client phone, name, email, notes
apiRouter.post('/mukellefler/:code/override', (req: Request, res: Response) => {
  try {
    const code = String(req.params.code);
    const { customName, customPhone, customEmail, notes } = req.body;

    dbService.saveOverride({
      mukellef_code: code,
      custom_name: customName,
      custom_phone: customPhone,
      custom_email: customEmail,
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
    const { 
      mukellefCode, 
      documentIds, 
      channel = 'WHATSAPP', 
      customPhone, 
      customEmail, 
      customMessage 
    } = req.body;

    if (!mukellefCode || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Mükellef ve belge seçimi zorunludur' });
    }

    const summary = await scanZirveData();
    const mukellef = summary.mukellefler.find(m => m.code === mukellefCode);
    if (!mukellef) {
      return res.status(404).json({ success: false, error: 'Mükellef bulunamadı' });
    }

    const wantsWa = channel === 'WHATSAPP' || channel === 'BOTH';
    const wantsEmail = channel === 'EMAIL' || channel === 'BOTH';

    const targetPhone = customPhone || mukellef.phone;
    const targetEmail = customEmail || mukellef.email;

    if (wantsWa && !targetPhone) {
      return res.status(400).json({ success: false, error: 'WhatsApp ile gönderim için telefon numarası bulunamadı' });
    }
    if (wantsEmail && !targetEmail) {
      return res.status(400).json({ success: false, error: 'E-posta ile gönderim için e-posta adresi bulunamadı' });
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

    let totalSent = 0;
    let totalFailed = 0;
    const results: Array<{ documentName: string; success: boolean; channel: string; error?: string }> = [];

    // 1. Send via WhatsApp if selected
    if (wantsWa) {
      const waRes = await whatsappService.sendDocumentsToMukellef({
        mukellefCode,
        mukellefName: mukellef.name,
        phone: targetPhone,
        documents: requestedDocs,
        customMessage: formattedMessage
      });
      totalSent += waRes.sentCount;
      totalFailed += waRes.failedCount;
      results.push(...waRes.results.map(r => ({ ...r, channel: 'WHATSAPP' })));
    }

    // 2. Send via Email if selected
    if (wantsEmail) {
      const emailRes = await emailService.sendDocumentsToMukellef({
        mukellefCode,
        mukellefName: mukellef.name,
        email: targetEmail,
        documents: requestedDocs,
        period,
        customMessage: formattedMessage
      });
      totalSent += emailRes.sentCount;
      totalFailed += emailRes.failedCount;
      results.push(...emailRes.results.map(r => ({ ...r, channel: 'EMAIL' })));
    }

    res.json({
      success: totalSent > 0,
      sentCount: totalSent,
      failedCount: totalFailed,
      results
    });
  } catch (err: any) {
    console.error('Error in /api/send/batch:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/send/bulk - Bulk send for multiple mükellefs
apiRouter.post('/send/bulk', async (req: Request, res: Response) => {
  try {
    const { 
      period, 
      mukellefCodes, 
      channel = 'WHATSAPP', 
      onlyPending = true, 
      customMessage 
    } = req.body;

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

    const wantsWa = channel === 'WHATSAPP' || channel === 'BOTH';
    const wantsEmail = channel === 'EMAIL' || channel === 'BOTH';

    const template = customMessage || dbService.getSetting('message_template', CONFIG.DEFAULT_MESSAGE_TEMPLATE);

    let totalSent = 0;
    let totalFailed = 0;
    const clientResults: Array<{ mukellef: string; sent: number; failed: number }> = [];

    for (const mukellef of targetMukellefler) {
      const docsToSend = onlyPending
        ? mukellef.documents.filter(d => !d.isSent)
        : mukellef.documents;

      if (docsToSend.length === 0) continue;

      if (wantsWa && !mukellef.phone) {
        clientResults.push({ mukellef: mukellef.name, sent: 0, failed: docsToSend.length });
        totalFailed += docsToSend.length;
        continue;
      }

      if (wantsEmail && !mukellef.email) {
        clientResults.push({ mukellef: mukellef.name, sent: 0, failed: docsToSend.length });
        totalFailed += docsToSend.length;
        continue;
      }

      const docNames = docsToSend.map(d => `${d.docType} (${d.category})`).join(', ');
      const formattedMessage = template
        .replace(/{UNVAN}/g, mukellef.name)
        .replace(/{DONEM}/g, period)
        .replace(/{BELGELER}/g, docNames);

      let clientSent = 0;
      let clientFailed = 0;

      if (wantsWa) {
        const waRes = await whatsappService.sendDocumentsToMukellef({
          mukellefCode: mukellef.code,
          mukellefName: mukellef.name,
          phone: mukellef.phone,
          documents: docsToSend,
          customMessage: formattedMessage
        });
        clientSent += waRes.sentCount;
        clientFailed += waRes.failedCount;
      }

      if (wantsEmail) {
        const emailRes = await emailService.sendDocumentsToMukellef({
          mukellefCode: mukellef.code,
          mukellefName: mukellef.name,
          email: mukellef.email,
          documents: docsToSend,
          period,
          customMessage: formattedMessage
        });
        clientSent += emailRes.sentCount;
        clientFailed += emailRes.failedCount;
      }

      totalSent += clientSent;
      totalFailed += clientFailed;
      clientResults.push({
        mukellef: mukellef.name,
        sent: clientSent,
        failed: clientFailed
      });

      // Pause between clients
      await new Promise(r => setTimeout(r, 1500));
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
apiRouter.get('/settings', (_req: Request, res: Response) => {
  const template = dbService.getSetting('message_template', CONFIG.DEFAULT_MESSAGE_TEMPLATE);
  res.json({
    success: true,
    settings: {
      messageTemplate: template,
      zirveDataPath: CONFIG.ZIRVE_DATA_PATH,
      smtp: emailService.getPublicSmtpConfig(),
      isSmtpConfigured: emailService.isConfigured()
    }
  });
});

apiRouter.post('/settings', (req: Request, res: Response) => {
  const { messageTemplate, smtp } = req.body;
  if (messageTemplate !== undefined) {
    dbService.setSetting('message_template', messageTemplate);
  }
  if (smtp) {
    emailService.saveSmtpConfig(smtp);
  }
  res.json({ success: true, message: 'Ayarlar kaydedildi' });
});

// Test SMTP connection endpoint
apiRouter.post('/email/test-smtp', async (req: Request, res: Response) => {
  try {
    const { smtpConfig } = req.body;
    const result = await emailService.testConnection(smtpConfig);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: formatSmtpError(err) });
  }
});
