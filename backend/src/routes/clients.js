const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM clients ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('Get clients error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { name, phone, birthday, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Client name is required' });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO clients (name, phone, birthday, notes) VALUES (?, ?, ?, ?)',
      [name.trim(), phone || null, birthday || null, notes || null]
    );

    const [rows] = await db.execute('SELECT * FROM clients WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create client error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, birthday, notes } = req.body;

  try {
    const [existing] = await db.execute('SELECT * FROM clients WHERE id = ?', [id]);
    if (!existing[0]) {
      return res.status(404).json({ error: 'Client not found' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Client name is required' });
    }

    await db.execute(
      'UPDATE clients SET name = ?, phone = ?, birthday = ?, notes = ? WHERE id = ?',
      [name.trim(), phone || null, birthday || null, notes || null, id]
    );

    const [rows] = await db.execute('SELECT * FROM clients WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Update client error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await db.execute('SELECT * FROM clients WHERE id = ?', [id]);
    if (!existing[0]) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const [usedInInvoice] = await db.execute(
      'SELECT COUNT(*) as count FROM invoices WHERE client_id = ?',
      [id]
    );
    
    if (usedInInvoice[0].count > 0) {
      return res.status(409).json({ error: 'Cannot delete client: they have existing invoices' });
    }

    await db.execute('DELETE FROM clients WHERE id = ?', [id]);
    res.json({ message: 'Client deleted' });
  } catch (err) {
    console.error('Delete client error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
