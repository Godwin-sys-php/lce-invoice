const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { generateInvoicePDF } = require('../services/pdfGenerator');

const router = express.Router();

function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const lastInvoice = db.prepare(
    "SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1"
  ).get(`CE-${year}-%`);

  let seq = 1;
  if (lastInvoice) {
    const parts = lastInvoice.invoice_number.split('-');
    seq = parseInt(parts[2], 10) + 1;
  }

  return `CE-${year}-${String(seq).padStart(4, '0')}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

router.get('/', (req, res) => {
  const invoices = db.prepare(`
    SELECT
      i.id,
      i.invoice_number,
      c.name AS client_name,
      u.username AS created_by,
      (SELECT COUNT(*) FROM invoice_items ii WHERE ii.invoice_id = i.id) AS item_count,
      i.pdf_path,
      i.created_at
    FROM invoices i
    JOIN clients c ON c.id = i.client_id
    JOIN users u ON u.id = i.created_by
    ORDER BY i.created_at DESC
  `).all();

  const result = invoices.map(inv => ({
    ...inv,
    pdf_url: `/pdfs/${inv.invoice_number}.pdf`,
  }));

  res.json(result);
});

router.get('/:id', (req, res) => {
  const { id } = req.params;

  const invoice = db.prepare(`
    SELECT
      i.*,
      c.name AS client_name,
      c.phone AS client_phone,
      c.birthday AS client_birthday,
      u.username AS created_by
    FROM invoices i
    JOIN clients c ON c.id = i.client_id
    JOIN users u ON u.id = i.created_by
    WHERE i.id = ?
  `).get(id);

  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  const items = db.prepare(`
    SELECT
      ii.*,
      p.name AS product_name
    FROM invoice_items ii
    JOIN products p ON p.id = ii.product_id
    WHERE ii.invoice_id = ?
  `).all(id);

  res.json({ ...invoice, items });
});

router.post('/', async (req, res) => {
  const { client_id, items } = req.body;

  if (!client_id) {
    return res.status(400).json({ error: 'client_id is required' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required' });
  }

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(client_id);
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }

  for (const item of items) {
    if (!item.product_id || !item.quantity || item.unit_price == null) {
      return res.status(400).json({ error: 'Each item must have product_id, quantity, and unit_price' });
    }
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
    if (!product) {
      return res.status(404).json({ error: `Product with id ${item.product_id} not found` });
    }
  }

  const invoiceNumber = generateInvoiceNumber();
  const now = new Date().toISOString();

  try {
    // Build items with product names for PDF
    const pdfItems = items.map(item => {
      const product = db.prepare('SELECT name FROM products WHERE id = ?').get(item.product_id);
      return {
        product_name: product.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
      };
    });

    const pdfPath = await generateInvoicePDF({
      invoiceNumber,
      date: formatDate(now),
      createdBy: req.user.username,
      client: {
        name: client.name,
        phone: client.phone,
      },
      items: pdfItems,
    });

    const relativePdfPath = path.relative(path.join(__dirname, '..', '..'), pdfPath);

    const insertInvoice = db.prepare(
      'INSERT INTO invoices (invoice_number, client_id, created_by, pdf_path, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    const insertItem = db.prepare(
      'INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)'
    );

    const transaction = db.transaction(() => {
      const result = insertInvoice.run(invoiceNumber, client_id, req.user.id, relativePdfPath, now);
      const invoiceId = result.lastInsertRowid;

      for (const item of items) {
        insertItem.run(invoiceId, item.product_id, item.quantity, item.unit_price);
      }

      return invoiceId;
    });

    const invoiceId = transaction();

    const invoice = db.prepare(`
      SELECT i.*, c.name AS client_name, u.username AS created_by
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
      JOIN users u ON u.id = i.created_by
      WHERE i.id = ?
    `).get(invoiceId);

    const invoiceItems = db.prepare(`
      SELECT ii.*, p.name AS product_name
      FROM invoice_items ii
      JOIN products p ON p.id = ii.product_id
      WHERE ii.invoice_id = ?
    `).all(invoiceId);

    res.status(201).json({ ...invoice, items: invoiceItems });
  } catch (err) {
    console.error('Error creating invoice:', err);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

module.exports = router;
