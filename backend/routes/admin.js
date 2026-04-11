import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// GET user config
router.get('/config', (req, res) => {
  const user = db.prepare('SELECT name, username, config_json FROM users WHERE id = ?').get(req.userId);
  res.json({
    name: user.name,
    username: user.username,
    config: JSON.parse(user.config_json || '{}'),
  });
});

// PUT update user config and advisor notes
router.put('/config', (req, res) => {
  const { advisor_notes, name } = req.body;

  const user = db.prepare('SELECT config_json FROM users WHERE id = ?').get(req.userId);
  const config = JSON.parse(user.config_json || '{}');

  if (advisor_notes !== undefined) config.advisor_notes = advisor_notes;

  db.prepare('UPDATE users SET config_json = ?, name = ? WHERE id = ?').run(
    JSON.stringify(config),
    name || '守明',
    req.userId
  );

  res.json({ success: true });
});

// GET question pool
router.get('/questions', (req, res) => {
  const { dimension } = req.query;
  let query = 'SELECT * FROM question_pool WHERE (user_id IS NULL OR user_id = ?)';
  const params = [req.userId];

  if (dimension) {
    query += ' AND dimension = ?';
    params.push(dimension);
  }
  query += ' ORDER BY dimension, id';

  const questions = db.prepare(query).all(...params);
  res.json(questions.map(q => ({ ...q, config: JSON.parse(q.config) })));
});

// POST add custom question
router.post('/questions', (req, res) => {
  const { dimension, question_text, question_type, config } = req.body;

  if (!dimension || !question_text || !question_type) {
    return res.status(400).json({ error: 'dimension, question_text, and question_type are required' });
  }

  const result = db.prepare(
    'INSERT INTO question_pool (user_id, dimension, question_text, question_type, config) VALUES (?, ?, ?, ?, ?)'
  ).run(req.userId, dimension, question_text, question_type, JSON.stringify(config || {}));

  res.status(201).json({ id: result.lastInsertRowid, success: true });
});

// PUT toggle question active/inactive
// Fix: only allow toggling questions owned by this user — not shared (system) questions
router.put('/questions/:id/toggle', (req, res) => {
  const q = db.prepare(
    'SELECT id, is_active FROM question_pool WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);
  if (!q) return res.status(404).json({ error: '问题不存在或无权修改（系统问题不可更改）' });

  db.prepare('UPDATE question_pool SET is_active = ? WHERE id = ?').run(q.is_active ? 0 : 1, req.params.id);
  res.json({ success: true, is_active: !q.is_active });
});

// GET dimension scores
router.get('/dimensions', (req, res) => {
  const dims = db.prepare('SELECT * FROM dimensions WHERE user_id = ?').all(req.userId);
  res.json(dims);
});

// GET stats overview
router.get('/stats', (req, res) => {
  const userId = req.userId;
  const journalCount = db.prepare('SELECT COUNT(*) as cnt FROM daily_journals WHERE user_id = ?').get(userId);
  const projectCount = db.prepare('SELECT COUNT(*) as cnt FROM projects WHERE user_id = ?').get(userId);
  const confidenceCount = db.prepare('SELECT COUNT(*) as cnt FROM confidence_logs WHERE user_id = ?').get(userId);
  const checkinCount = db.prepare(
    'SELECT COUNT(*) as cnt FROM project_checkins pc JOIN projects p ON pc.project_id = p.id WHERE p.user_id = ?'
  ).get(userId);

  const journals = db.prepare(
    'SELECT date FROM daily_journals WHERE user_id = ? ORDER BY date DESC'
  ).all(userId);

  let journalStreak = 0;
  const todayStr = new Date().toISOString().split('T')[0];
  let expectedDate = new Date(todayStr);

  for (const j of journals) {
    const d = new Date(j.date);
    const diff = Math.round((expectedDate - d) / (1000 * 60 * 60 * 24));
    if (diff <= 1) {
      journalStreak++;
      expectedDate = d;
    } else {
      break;
    }
  }

  res.json({
    journalCount: journalCount.cnt,
    projectCount: projectCount.cnt,
    confidenceCount: confidenceCount.cnt,
    checkinCount: checkinCount.cnt,
    journalStreak,
  });
});

export default router;
