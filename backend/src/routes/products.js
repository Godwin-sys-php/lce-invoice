const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
  res.json(products);
});

router.post('/', (req, res) => {
  const { name, price } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Product name is required' });
  }

  const result = db.prepare('INSERT INTO products (name, price) VALUES (?, ?)').run(
    name.trim(),
    price != null ? price : null
  );

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(product);
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, price } = req.body;

  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Product not found' });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Product name is required' });
  }

  db.prepare('UPDATE products SET name = ?, price = ? WHERE id = ?').run(
    name.trim(),
    price != null ? price : null,
    id
  );

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.json(product);
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const usedInInvoice = db.prepare('SELECT COUNT(*) as count FROM invoice_items WHERE product_id = ?').get(id);
  if (usedInInvoice.count > 0) {
    return res.status(409).json({ error: 'Cannot delete product: it is used in existing invoices' });
  }

  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  res.json({ message: 'Product deleted' });
});

router.get('/:id/last-price', (req, res) => {
  const { id } = req.params;

  const row = db.prepare(`
    SELECT ii.unit_price
    FROM invoice_items ii
    JOIN invoices i ON i.id = ii.invoice_id
    WHERE ii.product_id = ?
    ORDER BY i.created_at DESC
    LIMIT 1
  `).get(id);

  res.json({ last_price: row ? row.unit_price : null });
});

module.exports = router;
