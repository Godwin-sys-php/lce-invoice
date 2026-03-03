const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const clients = db.prepare('SELECT * FROM clients ORDER BY created_at DESC').all();
  res.json(clients);
});

router.post('/', (req, res) => {
  const { name, phone, birthday, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Client name is required' });
  }

  const result = db.prepare(
    'INSERT INTO clients (name, phone, birthday, notes) VALUES (?, ?, ?, ?)'
  ).run(name.trim(), phone || null, birthday || null, notes || null);

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(client);
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, phone, birthday, notes } = req.body;

  const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Client not found' });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Client name is required' });
  }

  db.prepare(
    'UPDATE clients SET name = ?, phone = ?, birthday = ?, notes = ? WHERE id = ?'
  ).run(name.trim(), phone || null, birthday || null, notes || null, id);

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  res.json(client);
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Client not found' });
  }

  const usedInInvoice = db.prepare('SELECT COUNT(*) as count FROM invoices WHERE client_id = ?').get(id);
  if (usedInInvoice.count > 0) {
    return res.status(409).json({ error: 'Cannot delete client: they have existing invoices' });
  }

  db.prepare('DELETE FROM clients WHERE id = ?').run(id);
  res.json({ message: 'Client deleted' });
});

module.exports = router;
