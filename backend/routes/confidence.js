import express from 'express';
import db from '../db/database.js';

const router = express.Router();
const USER_ID = 1;

// GET confidence evidence library
router.get('/', (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  const logs = db.prepare(
    'SELECT id, date, content, source, created_at FROM confidence_logs WHERE user_id = ? ORDER BY date DESC LIMIT ? OFFSET ?'
  ).all(USER_ID, parseInt(limit), parseInt(offset));

  const total = db.prepare(
    'SELECT COUNT(*) as cnt FROM confidence_logs WHERE user_id = ?'
  ).get(USER_ID);

  res.json({ logs, total: total.cnt });
});

// POST add manual confidence entry
router.post('/', (req, res) => {
  const { content, date } = req.body;

  if (!content?.trim()) {
    return res.status(400).json({ error: 'content is required' });
  }

  const entryDate = date || new Date().toISOString().split('T')[0];

  const result = db.prepare(
    'INSERT INTO confidence_logs (user_id, date, content, source) VALUES (?, ?, ?, ?)'
  ).run(USER_ID, entryDate, content.trim(), 'manual');

  res.status(201).json({
    id: result.lastInsertRowid,
    date: entryDate,
    content: content.trim(),
    source: 'manual',
  });
});

// DELETE a confidence entry
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM confidence_logs WHERE id = ? AND user_id = ?').run(req.params.id, USER_ID);
  res.json({ success: true });
});

// GET random confidence entry (for daily motivation)
router.get('/random', (req, res) => {
  const log = db.prepare(
    'SELECT id, date, content, source FROM confidence_logs WHERE user_id = ? ORDER BY RANDOM() LIMIT 1'
  ).get(USER_ID);

  if (!log) {
    return res.json({ log: null, message: '你的自信证据库还是空的，完成日记后会自动记录你的正向回答。' });
  }

  res.json({ log });
});

export default router;
