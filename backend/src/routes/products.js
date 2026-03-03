const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM products ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { name, price } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Product name is required' });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO products (name, price) VALUES (?, ?)',
      [name.trim(), price != null ? price : null]
    );

    const [rows] = await db.execute('SELECT * FROM products WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price } = req.body;

  try {
    const [existing] = await db.execute('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing[0]) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    await db.execute(
      'UPDATE products SET name = ?, price = ? WHERE id = ?',
      [name.trim(), price != null ? price : null, id]
    );

    const [rows] = await db.execute('SELECT * FROM products WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await db.execute('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing[0]) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const [usedInInvoice] = await db.execute(
      'SELECT COUNT(*) as count FROM invoice_items WHERE product_id = ?',
      [id]
    );
    
    if (usedInInvoice[0].count > 0) {
      return res.status(409).json({ error: 'Cannot delete product: it is used in existing invoices' });
    }

    await db.execute('DELETE FROM products WHERE id = ?', [id]);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/last-price', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.execute(`
      SELECT ii.unit_price
      FROM invoice_items ii
      JOIN invoices i ON i.id = ii.invoice_id
      WHERE ii.product_id = ?
      ORDER BY i.created_at DESC
      LIMIT 1
    `, [id]);

    res.json({ last_price: rows[0] ? rows[0].unit_price : null });
  } catch (err) {
    console.error('Get last price error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
