import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { CONFIG } from './config.js';
import { dbService } from './db.js';

interface MockCompany {
  code: string;
  name: string;
  phone: string;
  contactPerson: string;
  taxNumber: string;
  taxOffice: string;
  address: string;
  docs: Array<{
    category: 'BEYANNAME' | 'TAHAKKUK' | 'SGK';
    fileName: string;
    title: string;
    period: string;
    amount: string;
  }>;
}

const mockCompanies: MockCompany[] = [
  {
    code: 'KAYALAR_LTD',
    name: 'KAYALAR TEKSTİL VE KONFEKSİYON SAN. TİC. LTD. ŞTİ.',
    phone: '0532 555 12 34',
    contactPerson: 'Mustafa Kaya',
    taxNumber: '5480123456',
    taxOffice: 'Marmara Kurumlar V.D.',
    address: 'İkitelli OSB Mah. 24. Cad. No:12 Başakşehir / İSTANBUL',
    docs: [
      {
        category: 'BEYANNAME',
        fileName: '2026_09_KDV1_BEYAN.pdf',
        title: 'KDV1 Beyannamesi',
        period: '2026-09',
        amount: '0.00 TL'
      },
      {
        category: 'TAHAKKUK',
        fileName: '2026_09_KDV1_TAHAKKUK.pdf',
        title: 'KDV1 Tahakkuk Fişi',
        period: '2026-09',
        amount: '24,850.40 TL'
      },
      {
        category: 'BEYANNAME',
        fileName: '2026_09_MUHSGK_BEYAN.pdf',
        title: 'Muhtasar ve Prim Hizmet Beyannamesi',
        period: '2026-09',
        amount: '0.00 TL'
      },
      {
        category: 'TAHAKKUK',
        fileName: '2026_09_MUHSGK_TAHAKKUK.pdf',
        title: 'Muhtasar Tahakkuk Fişi',
        period: '2026-09',
        amount: '18,420.00 TL'
      },
      {
        category: 'SGK',
        fileName: '2026_09_SGK_TAHAKKUK.pdf',
        title: 'SGK Tahakkuk Fişi',
        period: '2026-09',
        amount: '42,180.65 TL'
      },
      {
        category: 'SGK',
        fileName: '2026_09_HIZMET_LISTESI.pdf',
        title: 'Sigortalı Hizmet Listesi',
        period: '2026-09',
        amount: '14 Kişi'
      },
      // 2026-10 (Current month documents)
      {
        category: 'BEYANNAME',
        fileName: '2026_10_KDV1_BEYAN.pdf',
        title: 'KDV1 Beyannamesi',
        period: '2026-10',
        amount: '0.00 TL'
      },
      {
        category: 'TAHAKKUK',
        fileName: '2026_10_KDV1_TAHAKKUK.pdf',
        title: 'KDV1 Tahakkuk Fişi',
        period: '2026-10',
        amount: '31,200.00 TL'
      }
    ]
  },
  {
    code: 'YILMAZLAR_AS',
    name: 'YILMAZLAR İNŞAAT VE TAAHHÜT A.Ş.',
    phone: '0542 444 56 78',
    contactPerson: 'Ahmet Yılmaz',
    taxNumber: '9840234567',
    taxOffice: 'Kozyatağı V.D.',
    address: 'Atatürk Cad. No:45 Kadıköy / İSTANBUL',
    docs: [
      {
        category: 'BEYANNAME',
        fileName: '2026_09_KDV1_BEYAN.pdf',
        title: 'KDV1 Beyannamesi',
        period: '2026-09',
        amount: '0.00 TL'
      },
      {
        category: 'TAHAKKUK',
        fileName: '2026_09_KDV1_TAHAKKUK.pdf',
        title: 'KDV1 Tahakkuk Fişi',
        period: '2026-09',
        amount: '89,640.20 TL'
      },
      {
        category: 'SGK',
        fileName: '2026_09_SGK_TAHAKKUK.pdf',
        title: 'SGK Tahakkuk Fişi',
        period: '2026-09',
        amount: '68,320.00 TL'
      }
    ]
  },
  {
    code: 'DEMIR_GIDA',
    name: 'DEMİR GIDA TİCARET VE PAZARLAMA',
    phone: '0555 333 88 99',
    contactPerson: 'Serkan Demir',
    taxNumber: '3120456789',
    taxOffice: 'Güneşli V.D.',
    address: 'Hal Yolu Cad. No:7 Bağcılar / İSTANBUL',
    docs: [
      {
        category: 'BEYANNAME',
        fileName: '2026_09_KDV1_BEYAN.pdf',
        title: 'KDV1 Beyannamesi',
        period: '2026-09',
        amount: '0.00 TL'
      },
      {
        category: 'TAHAKKUK',
        fileName: '2026_09_KDV1_TAHAKKUK.pdf',
        title: 'KDV1 Tahakkuk Fişi',
        period: '2026-09',
        amount: '12,450.00 TL'
      }
    ]
  },
  {
    code: 'AKDENIZ_LOJISTIK',
    name: 'AKDENİZ ULUSLARARASI LOJİSTİK HİZM. A.Ş.',
    phone: '0533 111 22 33',
    contactPerson: 'Cem Akdeniz',
    taxNumber: '1120987654',
    taxOffice: 'Büyük Mükellefler V.D.',
    address: 'Liman Cad. No:88 Beyoğlu / İSTANBUL',
    docs: [
      {
        category: 'BEYANNAME',
        fileName: '2026_09_KDV1_BEYAN.pdf',
        title: 'KDV1 Beyannamesi',
        period: '2026-09',
        amount: '0.00 TL'
      },
      {
        category: 'TAHAKKUK',
        fileName: '2026_09_KDV1_TAHAKKUK.pdf',
        title: 'KDV1 Tahakkuk Fişi',
        period: '2026-09',
        amount: '145,800.00 TL'
      },
      {
        category: 'SGK',
        fileName: '2026_09_SGK_TAHAKKUK.pdf',
        title: 'SGK Tahakkuk Fişi',
        period: '2026-09',
        amount: '94,250.00 TL'
      }
    ]
  },
  {
    code: 'OZKAN_MIMARLIK',
    name: 'ÖZKAN MİMARLIK VE MÜHENDİSLİK LTD. ŞTİ.',
    phone: '0505 777 99 00',
    contactPerson: 'Banu Özkan',
    taxNumber: '6740876512',
    taxOffice: 'Beşiktaş V.D.',
    address: 'Barbaros Bulvarı No:14 Beşiktaş / İSTANBUL',
    docs: [
      {
        category: 'BEYANNAME',
        fileName: '2026_09_KDV1_BEYAN.pdf',
        title: 'KDV1 Beyannamesi',
        period: '2026-09',
        amount: '0.00 TL'
      },
      {
        category: 'TAHAKKUK',
        fileName: '2026_09_KDV1_TAHAKKUK.pdf',
        title: 'KDV1 Tahakkuk Fişi',
        period: '2026-09',
        amount: '16,750.00 TL'
      }
    ]
  },
  {
    code: 'ANADOLU_RESTORAN',
    name: 'ANADOLU LEZZETLERİ RESTORAN İŞL. GIDA TİC.',
    phone: '0544 888 66 11',
    contactPerson: 'Halil Anadolu',
    taxNumber: '4580345612',
    taxOffice: 'Ümraniye V.D.',
    address: 'Alemdağ Cad. No:120 Ümraniye / İSTANBUL',
    docs: [
      {
        category: 'BEYANNAME',
        fileName: '2026_09_KDV1_BEYAN.pdf',
        title: 'KDV1 Beyannamesi',
        period: '2026-09',
        amount: '0.00 TL'
      },
      {
        category: 'TAHAKKUK',
        fileName: '2026_09_KDV1_TAHAKKUK.pdf',
        title: 'KDV1 Tahakkuk Fişi',
        period: '2026-09',
        amount: '9,350.50 TL'
      }
    ]
  }
];

function toAscii(text: string): string {
  return text
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'i')
    .replace(/Ş/g, 'S')
    .replace(/ş/g, 's')
    .replace(/Ğ/g, 'G')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'U')
    .replace(/ü/g, 'u')
    .replace(/Ö/g, 'O')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'C')
    .replace(/ç/g, 'c');
}

/**
 * Creates a visually realistic PDF for testing.
 */
async function generateSamplePdf(company: MockCompany, doc: MockCompany['docs'][0]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 portrait
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();

  // Top header bar
  page.drawRectangle({
    x: 40,
    y: height - 90,
    width: width - 80,
    height: 50,
    color: rgb(0.92, 0.95, 0.98),
    borderColor: rgb(0.2, 0.4, 0.7),
    borderWidth: 1
  });

  page.drawText('T.C. GELIR IDARESI BASKANLIGI', {
    x: 55,
    y: height - 60,
    size: 13,
    font: boldFont,
    color: rgb(0.1, 0.2, 0.5)
  });

  page.drawText(`VERGI / EVRAK BILDIRIMI - ${toAscii(doc.category)}`, {
    x: 55,
    y: height - 76,
    size: 10,
    font,
    color: rgb(0.3, 0.3, 0.3)
  });

  // Document details box
  page.drawRectangle({
    x: 40,
    y: height - 280,
    width: width - 80,
    height: 170,
    color: rgb(0.98, 0.98, 0.99),
    borderColor: rgb(0.8, 0.85, 0.9),
    borderWidth: 1
  });

  let curY = height - 120;
  const drawRow = (label: string, val: string) => {
    page.drawText(toAscii(label), { x: 55, y: curY, size: 10, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(toAscii(val), { x: 200, y: curY, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
    curY -= 22;
  };

  drawRow('Mukellef Unvani:', company.name.substring(0, 48));
  drawRow('Vergi Kimlik No:', company.taxNumber);
  drawRow('Vergi Dairesi:', company.taxOffice);
  drawRow('Ilgili Kisi:', company.contactPerson);
  drawRow('Vergilendirme Donemi:', doc.period);
  drawRow('Belge Adi:', doc.title);
  drawRow('Tahakkuk Eden Tutar:', doc.amount);

  // Footer / Watermark note
  page.drawText('Bu belge Zirve Musavir Otomasyonu tarafindan olusturulmustur (Test Mock Verisi).', {
    x: 55,
    y: 50,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5)
  });

  return await pdfDoc.save();
}

/**
 * Generates the mock Zirve data structure in mock_zirvedata folder.
 */
export async function generateMockZirveData(): Promise<void> {
  const targetDir = CONFIG.ZIRVE_DATA_PATH;
  console.log(`Generating mock Zirve data in: ${targetDir}`);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const company of mockCompanies) {
    const compDir = path.join(targetDir, company.code);
    if (!fs.existsSync(compDir)) {
      fs.mkdirSync(compDir, { recursive: true });
    }

    // 1. Write SirketBilgileri file
    const sirketBilgileriContent = `[GENEL]
Unvan=${company.name}
Yetkili=${company.contactPerson}
phone=${company.phone}
VergiNo=${company.taxNumber}
VergiDairesi=${company.taxOffice}
Adres=${company.address}
DBSirketKodu=${company.code}
`;
    fs.writeFileSync(path.join(compDir, 'SirketBilgileri'), sirketBilgileriContent, 'utf-8');

    // 2. Create DOKUMANLAR and subdirectories
    const dokDir = path.join(compDir, 'DOKUMANLAR');
    if (!fs.existsSync(dokDir)) {
      fs.mkdirSync(dokDir, { recursive: true });
    }

    for (const doc of company.docs) {
      const subCatDir = path.join(dokDir, doc.category);
      if (!fs.existsSync(subCatDir)) {
        fs.mkdirSync(subCatDir, { recursive: true });
      }

      const filePath = path.join(subCatDir, doc.fileName);
      if (!fs.existsSync(filePath)) {
        const pdfBytes = await generateSamplePdf(company, doc);
        fs.writeFileSync(filePath, Buffer.from(pdfBytes));
      }
    }
  }

  // Pre-seed some send logs for testing so the user sees a realistic dashboard immediately:
  // Let's mark DEMIR_GIDA as fully sent for 2026-09
  const demirGida = mockCompanies.find(c => c.code === 'DEMIR_GIDA')!;
  for (const doc of demirGida.docs.filter(d => d.period === '2026-09')) {
    const relPath = path.join(demirGida.code, 'DOKUMANLAR', doc.category, doc.fileName);
    dbService.recordSendLog({
      mukellef_code: demirGida.code,
      document_name: doc.fileName,
      document_path: relPath,
      period: doc.period,
      category: doc.category,
      phone: demirGida.phone,
      recipient_name: demirGida.name,
      status: 'SENT',
      wa_message_id: 'sample_seed_id_1',
      batch_id: 'batch_seed_1'
    });
  }

  // Mark 1 doc of KAYALAR_LTD as sent for 2026-09 (so it shows PARTIALLY_SENT)
  const kayalar = mockCompanies.find(c => c.code === 'KAYALAR_LTD')!;
  const firstDoc = kayalar.docs[0];
  const relPath = path.join(kayalar.code, 'DOKUMANLAR', firstDoc.category, firstDoc.fileName);
  dbService.recordSendLog({
    mukellef_code: kayalar.code,
    document_name: firstDoc.fileName,
    document_path: relPath,
    period: firstDoc.period,
    category: firstDoc.category,
    phone: kayalar.phone,
    recipient_name: kayalar.name,
    status: 'SENT',
    wa_message_id: 'sample_seed_id_2',
    batch_id: 'batch_seed_2'
  });

  console.log('Mock Zirve data generated successfully!');
}

// If executed directly from command line
if (process.argv[1]?.endsWith('mockGenerator.ts') || process.argv[1]?.endsWith('mockGenerator.js')) {
  generateMockZirveData().catch(console.error);
}
