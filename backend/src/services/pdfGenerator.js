const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const pdfsDir = path.join(__dirname, '..', '..', 'pdfs');

function ensurePdfsDir() {
  if (!fs.existsSync(pdfsDir)) {
    fs.mkdirSync(pdfsDir, { recursive: true });
  }
}

function formatUSD(amount) {
  return '$' + Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function generateInvoicePDF({ invoiceNumber, date, createdBy, client, items, type = 'invoice' }) {
  return new Promise((resolve, reject) => {
    ensurePdfsDir();

    const filePath = path.join(pdfsDir, `${invoiceNumber}.pdf`);
    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const W = doc.page.width;   // 595.28
    const H = doc.page.height;  // 841.89
    const ML = 50;              // margin left
    const MR = 50;              // margin right
    const CW = W - ML - MR;    // content width = 495.28

    // ─── FOND GRIS ───────────────────────────────────────────────────────────
    doc.rect(0, 0, W, H).fill('#FDFEFD');

    // ─── LOGO + NUMÉRO (même niveau) ─────────────────────────────────────────
    const logoPath = path.join(__dirname, '..', '..', 'logo.png');
    const LOGO_Y = 40;
    const LOGO_H = 60;
    let LOGO_BOTTOM = LOGO_Y;

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, ML, LOGO_Y, { height: LOGO_H, fit: [120, LOGO_H] });
      LOGO_BOTTOM = LOGO_Y + LOGO_H;
    }

    // Numéro aligné à droite, centré verticalement sur le logo
    const NUM_Y = LOGO_Y + (LOGO_H - 22) / 2;
    doc.font('Helvetica').fontSize(22).fillColor('#999999')
       .text(`No. ${invoiceNumber}`, ML, NUM_Y, {
         width: CW, align: 'right', lineBreak: false,
       });

    // ─── PROFORMA LABEL (if proforma) ────────────────────────────────────────
    if (type === 'proforma') {
      doc.font('Helvetica-Bold').fontSize(36).fillColor('#CCCCCC')
         .text('PROFORMA', ML, NUM_Y + 30, {
           width: CW, align: 'right', lineBreak: false,
         });
    }

    // ─── NOM ENTREPRISE : centré horizontalement, avec grande marge verticale ─
    const HEADER_Y = LOGO_BOTTOM + 30;

    doc.font('Helvetica-Bold').fontSize(30).fillColor('#111111')
       .text('Le Consulat Express', ML, HEADER_Y, { width: CW, align: 'center', lineBreak: false });

    // ─── LIGNE SÉPARATRICE ────────────────────────────────────────────────────
    const SEP1_Y = HEADER_Y + 52;
    doc.moveTo(ML, SEP1_Y).lineTo(W - MR, SEP1_Y).lineWidth(0.5).stroke('#CCCCCC');

    // ─── BLOC CLIENT + DATE ──────────────────────────────────────────────────
    const CLIENT_Y = SEP1_Y + 16;

    // Gauche : client
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#999999')
       .text('FACTURÉ À :', ML, CLIENT_Y);

    doc.font('Helvetica-Bold').fontSize(12).fillColor('#111111')
       .text(client.name, ML, CLIENT_Y + 14);

    let clientExtraY = CLIENT_Y + 30;
    if (client.phone) {
      doc.font('Helvetica').fontSize(10).fillColor('#555555')
         .text(client.phone, ML, clientExtraY);
      clientExtraY += 14;
    }
    if (client.notes) {
      doc.font('Helvetica').fontSize(10).fillColor('#555555')
         .text(client.notes, ML, clientExtraY, { width: 240 });
    }

    // Droite : date
    doc.font('Helvetica').fontSize(10).fillColor('#555555')
       .text(`Date : ${date}`, ML, CLIENT_Y + 14, {
         width: CW, align: 'right', lineBreak: false,
       });

    // ─── LIGNE SÉPARATRICE ────────────────────────────────────────────────────
    const SEP2_Y = CLIENT_Y + 70;
    doc.moveTo(ML, SEP2_Y).lineTo(W - MR, SEP2_Y).lineWidth(0.5).stroke('#CCCCCC');

    // ─── TABLEAU ─────────────────────────────────────────────────────────────
    // Colonnes : x de départ + largeur
    const COL = {
      desc:  { x: ML,        w: 200 },
      date:  { x: ML + 200,  w: 70  },
      qty:   { x: ML + 270,  w: 50  },
      price: { x: ML + 320,  w: 80  },
      total: { x: ML + 400,  w: 95  },
    };
    const ROW_H = 30;
    const HEADER_ROW_H = 26;
    const TABLE_Y = SEP2_Y + 12;

    // En-tête du tableau
    doc.rect(ML, TABLE_Y, CW, HEADER_ROW_H).fill('#DCDCDC');

    const H_TEXT_Y = TABLE_Y + 8;
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#666666');
    doc.text('DESCRIPTION', COL.desc.x + 4,  H_TEXT_Y, { width: COL.desc.w  - 8,  lineBreak: false });
    doc.text('DATE',        COL.date.x,       H_TEXT_Y, { width: COL.date.w,  align: 'center', lineBreak: false });
    doc.text('QTÉ',         COL.qty.x,        H_TEXT_Y, { width: COL.qty.w,   align: 'center', lineBreak: false });
    doc.text('PRIX UNIT.',  COL.price.x,      H_TEXT_Y, { width: COL.price.w, align: 'right',  lineBreak: false });
    doc.text('SOUS-TOTAL',  COL.total.x,      H_TEXT_Y, { width: COL.total.w, align: 'right',  lineBreak: false });

    // Lignes de données
    const MIN_ROWS = 8;
    const totalRows = Math.max(items.length, MIN_ROWS);
    let grandTotal = 0;
    let rowY = TABLE_Y + HEADER_ROW_H;

    for (let i = 0; i < totalRows; i++) {
      const bgColor = i % 2 === 0 ? '#F0F0F0' : '#E6E6E6';
      doc.rect(ML, rowY, CW, ROW_H).fill(bgColor);

      if (i < items.length) {
        const item = items[i];
        const lineTotal = item.quantity * item.unit_price;
        grandTotal += lineTotal;

        const textY = rowY + 9;
        doc.font('Helvetica').fontSize(10).fillColor('#222222');
        doc.text(item.product_name,      COL.desc.x + 4,  textY, { width: COL.desc.w  - 8,  lineBreak: false });
        doc.text(formatDate(item.item_date), COL.date.x,   textY, { width: COL.date.w,  align: 'center', lineBreak: false });
        doc.text(String(item.quantity),  COL.qty.x,        textY, { width: COL.qty.w,   align: 'center', lineBreak: false });
        doc.text(formatUSD(item.unit_price), COL.price.x,  textY, { width: COL.price.w, align: 'right',  lineBreak: false });
        doc.text(formatUSD(lineTotal),   COL.total.x,      textY, { width: COL.total.w, align: 'right',  lineBreak: false });
      }

      rowY += ROW_H;
    }

    // Ligne TOTAL
    doc.rect(ML, rowY, CW, 36).fill('#DCDCDC');
    doc.moveTo(ML, rowY).lineTo(W - MR, rowY).lineWidth(1.5).stroke('#111111');

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#555555')
       .text('TOTAL', COL.price.x, rowY + 11, { width: COL.price.w, align: 'right', lineBreak: false });

    doc.font('Helvetica-Bold').fontSize(13).fillColor('#111111')
       .text(formatUSD(grandTotal), COL.total.x, rowY + 9, { width: COL.total.w, align: 'right', lineBreak: false });

    // ─── FOOTER ──────────────────────────────────────────────────────────────
    const FOOTER_LINE_Y = H - 95;
    doc.moveTo(ML, FOOTER_LINE_Y).lineTo(W - MR, FOOTER_LINE_Y).lineWidth(0.5).stroke('#BBBBBB');

    const FY = FOOTER_LINE_Y + 12;

    // Gauche
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#111111')
       .text('LE CONSULAT EXPRESS', ML, FY);
    doc.font('Helvetica').fontSize(8).fillColor('#777777')
       .text('326. AV HAUT-COMMANDEMENT REF,',          ML, FY + 13)
       .text("CROISEMENT AVEC L'AVENUE LES PALMIERS",   ML, FY + 24)
       .text('GOMBE / KINSHASA / RDC',                  ML, FY + 35)
       .text('+243 810 001 904',                        ML, FY + 46);

    // Droite
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#111111')
       .text('MERCI DE VOTRE CONFIANCE', ML, FY + 18, {
         width: CW, align: 'right', lineBreak: false,
       });

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

module.exports = { generateInvoicePDF };
