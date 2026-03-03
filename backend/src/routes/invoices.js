const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { generateInvoicePDF } = require('../services/pdfGenerator');

const router = express.Router();

async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  
  const [rows] = await db.execute(
    "SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1",
    [`CE-${year}-%`]
  );

  let seq = 1;
  if (rows[0]) {
    const parts = rows[0].invoice_number.split('-');
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

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(`
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
    `);

    const result = rows.map(inv => ({
      ...inv,
      pdf_url: `/pdfs/${inv.invoice_number}.pdf`,
    }));

    res.json(result);
  } catch (err) {
    console.error('Get invoices error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [invoiceRows] = await db.execute(`
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
    `, [id]);

    if (!invoiceRows[0]) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const [itemRows] = await db.execute(`
      SELECT
        ii.*,
        p.name AS product_name
      FROM invoice_items ii
      JOIN products p ON p.id = ii.product_id
      WHERE ii.invoice_id = ?
    `, [id]);

    res.json({ ...invoiceRows[0], items: itemRows });
  } catch (err) {
    console.error('Get invoice error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { client_id, items } = req.body;

  if (!client_id) {
    return res.status(400).json({ error: 'client_id is required' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required' });
  }

  try {
    const [clientRows] = await db.execute('SELECT * FROM clients WHERE id = ?', [client_id]);
    const client = clientRows[0];
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    for (const item of items) {
      if (!item.product_id || !item.quantity || item.unit_price == null) {
        return res.status(400).json({ error: 'Each item must have product_id, quantity, and unit_price' });
      }
      const [productRows] = await db.execute('SELECT * FROM products WHERE id = ?', [item.product_id]);
      if (!productRows[0]) {
        return res.status(404).json({ error: `Product with id ${item.product_id} not found` });
      }
    }

    const invoiceNumber = await generateInvoiceNumber();
    const now = new Date().toISOString();

    // Build items with product names for PDF
    const pdfItems = [];
    for (const item of items) {
      const [productRows] = await db.execute('SELECT name FROM products WHERE id = ?', [item.product_id]);
      pdfItems.push({
        product_name: productRows[0].name,
        quantity: item.quantity,
        unit_price: item.unit_price,
      });
    }

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

    // Insert invoice
    const [invoiceResult] = await db.execute(
      'INSERT INTO invoices (invoice_number, client_id, created_by, pdf_path, created_at) VALUES (?, ?, ?, ?, ?)',
      [invoiceNumber, client_id, req.user.id, relativePdfPath, now]
    );
    
    const invoiceId = invoiceResult.insertId;

    // Insert items
    for (const item of items) {
      await db.execute(
        'INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [invoiceId, item.product_id, item.quantity, item.unit_price]
      );
    }

    // Fetch created invoice
    const [invoiceRows] = await db.execute(`
      SELECT i.*, c.name AS client_name, u.username AS created_by
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
      JOIN users u ON u.id = i.created_by
      WHERE i.id = ?
    `, [invoiceId]);

    const [itemRows] = await db.execute(`
      SELECT ii.*, p.name AS product_name
      FROM invoice_items ii
      JOIN products p ON p.id = ii.product_id
      WHERE ii.invoice_id = ?
    `, [invoiceId]);

    res.status(201).json({ ...invoiceRows[0], items: itemRows });
  } catch (err) {
    console.error('Error creating invoice:', err);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

module.exports = router;
