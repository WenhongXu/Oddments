import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// GET confidence evidence library
router.get('/', (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);

  const logs = db.prepare(
    'SELECT id, date, content, source, created_at FROM confidence_logs WHERE user_id = ? ORDER BY date DESC LIMIT ? OFFSET ?'
  ).all(req.userId, limit, offset);

  const total = db.prepare(
    'SELECT COUNT(*) as cnt FROM confidence_logs WHERE user_id = ?'
  ).get(req.userId);

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
  ).run(req.userId, entryDate, content.trim(), 'manual');

  res.status(201).json({
    id: result.lastInsertRowid,
    date: entryDate,
    content: content.trim(),
    source: 'manual',
  });
});

// DELETE a confidence entry
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM confidence_logs WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// GET random confidence entry
router.get('/random', (req, res) => {
  const log = db.prepare(
    'SELECT id, date, content, source FROM confidence_logs WHERE user_id = ? ORDER BY RANDOM() LIMIT 1'
  ).get(req.userId);

  if (!log) {
    return res.json({ log: null, message: '你的自信证据库还是空的，完成日记后会自动记录你的正向回答。' });
  }

  res.json({ log });
});

export default router;
