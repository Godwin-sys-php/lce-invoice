const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { generateInvoicePDF } = require('../services/pdfGenerator');

const router = express.Router();

async function generateInvoiceNumber(type = 'invoice') {
  const year = new Date().getFullYear();
  
  const prefix = type === 'proforma' ? `CE-PF-${year}-` : `CE-${year}-`;
  
  const [rows] = await db.execute(
    "SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1",
    [`${prefix}%`]
  );

  let seq = 1;
  if (rows[0]) {
    const parts = rows[0].invoice_number.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
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
        i.type,
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

// GET /:id/history - Full invoice detail with proforma history
router.get('/:id/history', async (req, res) => {
  const { id } = req.params;

  try {
    const [invoiceRows] = await db.execute(`
      SELECT
        i.*,
        c.name AS client_name,
        c.phone AS client_phone,
        u.username AS created_by_username
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
      JOIN users u ON u.id = i.created_by
      WHERE i.id = ?
    `, [id]);

    if (!invoiceRows[0]) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const [itemRows] = await db.execute(`
      SELECT ii.*, p.name AS product_name
      FROM invoice_items ii
      JOIN products p ON p.id = ii.product_id
      WHERE ii.invoice_id = ?
    `, [id]);

    const [historyRows] = await db.execute(
      'SELECT id, pdf_path, created_at FROM proforma_history WHERE invoice_id = ? ORDER BY created_at ASC',
      [id]
    );

    const proformaHistory = historyRows.map(h => ({
      id: h.id,
      pdf_filename: path.basename(h.pdf_path),
      created_at: h.created_at,
    }));

    res.json({
      ...invoiceRows[0],
      items: itemRows,
      proforma_history: proformaHistory,
    });
  } catch (err) {
    console.error('Get invoice history error:', err);
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
  const { client_id, items, type = 'invoice' } = req.body;

  if (!client_id) {
    return res.status(400).json({ error: 'client_id is required' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required' });
  }
  if (!['invoice', 'proforma'].includes(type)) {
    return res.status(400).json({ error: 'type must be invoice or proforma' });
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

    const invoiceNumber = await generateInvoiceNumber(type);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Build items with product names for PDF
    const pdfItems = [];
    for (const item of items) {
      const [productRows] = await db.execute('SELECT name FROM products WHERE id = ?', [item.product_id]);
      pdfItems.push({
        product_name: productRows[0].name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        item_date: item.item_date,
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
      type,
    });

    const relativePdfPath = path.relative(path.join(__dirname, '..', '..'), pdfPath);

    // Insert invoice
    const [invoiceResult] = await db.execute(
      'INSERT INTO invoices (invoice_number, client_id, created_by, pdf_path, type, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [invoiceNumber, client_id, req.user.id, relativePdfPath, type, now]
    );
    
    const invoiceId = invoiceResult.insertId;

    // Insert items
    for (const item of items) {
      await db.execute(
        'INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, item_date) VALUES (?, ?, ?, ?, ?)',
        [invoiceId, item.product_id, item.quantity, item.unit_price, item.item_date || null]
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

// PUT /:id - Update proforma invoice (only allowed for proforma)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { client_id, items } = req.body;

  try {
    // Check if invoice exists and is a proforma
    const [invoiceRows] = await db.execute('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!invoiceRows[0]) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    if (invoiceRows[0].type !== 'proforma') {
      return res.status(403).json({ error: 'Only proforma invoices can be edited' });
    }

    if (!client_id) {
      return res.status(400).json({ error: 'client_id is required' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

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

    const invoiceNumber = invoiceRows[0].invoice_number;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Save current PDF to proforma_history before overwriting
    const oldPdfPath = invoiceRows[0].pdf_path;
    if (oldPdfPath) {
      // Rename old PDF with version timestamp to avoid overwriting
      const oldFullPath = path.join(__dirname, '..', '..', oldPdfPath);
      if (fs.existsSync(oldFullPath)) {
        const ts = Date.now();
        const ext = path.extname(oldFullPath);
        const base = oldFullPath.slice(0, -ext.length);
        const archivedPath = `${base}_v${ts}${ext}`;
        fs.copyFileSync(oldFullPath, archivedPath);
        const relativeArchivedPath = path.relative(path.join(__dirname, '..', '..'), archivedPath);
        await db.execute(
          'INSERT INTO proforma_history (invoice_id, pdf_path, created_at) VALUES (?, ?, ?)',
          [id, relativeArchivedPath, now]
        );
      }
    }

    // Build items with product names for PDF
    const pdfItems = [];
    for (const item of items) {
      const [productRows] = await db.execute('SELECT name FROM products WHERE id = ?', [item.product_id]);
      pdfItems.push({
        product_name: productRows[0].name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        item_date: item.item_date,
      });
    }

    // Generate new PDF
    const pdfPath = await generateInvoicePDF({
      invoiceNumber,
      date: formatDate(now),
      createdBy: req.user.username,
      client: {
        name: client.name,
        phone: client.phone,
      },
      items: pdfItems,
      type: 'proforma',
    });

    const relativePdfPath = path.relative(path.join(__dirname, '..', '..'), pdfPath);

    // Update invoice
    await db.execute(
      'UPDATE invoices SET client_id = ?, pdf_path = ? WHERE id = ?',
      [client_id, relativePdfPath, id]
    );

    // Delete old items and insert new ones
    await db.execute('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);
    
    for (const item of items) {
      await db.execute(
        'INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, item_date) VALUES (?, ?, ?, ?, ?)',
        [id, item.product_id, item.quantity, item.unit_price, item.item_date || null]
      );
    }

    // Fetch updated invoice
    const [updatedInvoiceRows] = await db.execute(`
      SELECT i.*, c.name AS client_name, u.username AS created_by
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
      JOIN users u ON u.id = i.created_by
      WHERE i.id = ?
    `, [id]);

    const [itemRows] = await db.execute(`
      SELECT ii.*, p.name AS product_name
      FROM invoice_items ii
      JOIN products p ON p.id = ii.product_id
      WHERE ii.invoice_id = ?
    `, [id]);

    res.json({ ...updatedInvoiceRows[0], items: itemRows });
  } catch (err) {
    console.error('Error updating invoice:', err);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// POST /:id/convert - Convert proforma to definitive invoice
router.post('/:id/convert', async (req, res) => {
  const { id } = req.params;

  try {
    // Check if invoice exists and is a proforma
    const [invoiceRows] = await db.execute('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!invoiceRows[0]) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    if (invoiceRows[0].type !== 'proforma') {
      return res.status(403).json({ error: 'Only proforma invoices can be converted' });
    }

    // Get client info
    const [clientRows] = await db.execute('SELECT * FROM clients WHERE id = ?', [invoiceRows[0].client_id]);
    const client = clientRows[0];

    // Get items
    const [itemRows] = await db.execute(`
      SELECT ii.*, p.name AS product_name
      FROM invoice_items ii
      JOIN products p ON p.id = ii.product_id
      WHERE ii.invoice_id = ?
    `, [id]);

    // Save final proforma PDF to history before conversion
    const oldPdfPath = invoiceRows[0].pdf_path;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    if (oldPdfPath) {
      const oldFullPath = path.join(__dirname, '..', '..', oldPdfPath);
      if (fs.existsSync(oldFullPath)) {
        const ts = Date.now();
        const ext = path.extname(oldFullPath);
        const base = oldFullPath.slice(0, -ext.length);
        const archivedPath = `${base}_v${ts}${ext}`;
        fs.copyFileSync(oldFullPath, archivedPath);
        const relativeArchivedPath = path.relative(path.join(__dirname, '..', '..'), archivedPath);
        await db.execute(
          'INSERT INTO proforma_history (invoice_id, pdf_path, created_at) VALUES (?, ?, ?)',
          [id, relativeArchivedPath, now]
        );
      }
    }

    // Generate new definitive invoice number
    const newInvoiceNumber = await generateInvoiceNumber('invoice');

    // Generate new PDF
    const pdfItems = itemRows.map(item => ({
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      item_date: item.item_date,
    }));

    const pdfPath = await generateInvoicePDF({
      invoiceNumber: newInvoiceNumber,
      date: formatDate(now),
      createdBy: req.user.username,
      client: {
        name: client.name,
        phone: client.phone,
      },
      items: pdfItems,
      type: 'invoice',
    });

    const relativePdfPath = path.relative(path.join(__dirname, '..', '..'), pdfPath);

    // Update invoice to definitive
    await db.execute(
      'UPDATE invoices SET invoice_number = ?, pdf_path = ?, type = ? WHERE id = ?',
      [newInvoiceNumber, relativePdfPath, 'invoice', id]
    );

    // Fetch updated invoice
    const [updatedInvoiceRows] = await db.execute(`
      SELECT i.*, c.name AS client_name, u.username AS created_by
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
      JOIN users u ON u.id = i.created_by
      WHERE i.id = ?
    `, [id]);

    const [updatedItemRows] = await db.execute(`
      SELECT ii.*, p.name AS product_name
      FROM invoice_items ii
      JOIN products p ON p.id = ii.product_id
      WHERE ii.invoice_id = ?
    `, [id]);

    res.json({ ...updatedInvoiceRows[0], items: updatedItemRows });
  } catch (err) {
    console.error('Error converting invoice:', err);
    res.status(500).json({ error: 'Failed to convert invoice' });
  }
});

module.exports = router;
