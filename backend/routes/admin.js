import express from 'express';
import db from '../db/database.js';

const router = express.Router();
const USER_ID = 1;

// GET user config
router.get('/config', (req, res) => {
  const user = db.prepare('SELECT name, config_json FROM users WHERE id = ?').get(USER_ID);
  res.json({
    name: user.name,
    config: JSON.parse(user.config_json || '{}'),
  });
});

// PUT update advisor notes (命理师指导原则)
router.put('/config', (req, res) => {
  const { advisor_notes, name } = req.body;

  const user = db.prepare('SELECT config_json FROM users WHERE id = ?').get(USER_ID);
  const config = JSON.parse(user.config_json || '{}');

  if (advisor_notes !== undefined) config.advisor_notes = advisor_notes;

  db.prepare('UPDATE users SET config_json = ?, name = ? WHERE id = ?').run(
    JSON.stringify(config),
    name || '守明',
    USER_ID
  );

  res.json({ success: true });
});

// GET question pool
router.get('/questions', (req, res) => {
  const { dimension } = req.query;
  let query = 'SELECT * FROM question_pool WHERE (user_id IS NULL OR user_id = ?)';
  const params = [USER_ID];

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
  ).run(USER_ID, dimension, question_text, question_type, JSON.stringify(config || {}));

  res.status(201).json({ id: result.lastInsertRowid, success: true });
});

// PUT toggle question active/inactive
router.put('/questions/:id/toggle', (req, res) => {
  const q = db.prepare('SELECT is_active FROM question_pool WHERE id = ?').get(req.params.id);
  if (!q) return res.status(404).json({ error: 'Question not found' });

  db.prepare('UPDATE question_pool SET is_active = ? WHERE id = ?').run(q.is_active ? 0 : 1, req.params.id);
  res.json({ success: true, is_active: !q.is_active });
});

// GET dimension scores (for admin review)
router.get('/dimensions', (req, res) => {
  const dims = db.prepare('SELECT * FROM dimensions WHERE user_id = ?').all(USER_ID);
  res.json(dims);
});

// GET stats overview
router.get('/stats', (req, res) => {
  const journalCount = db.prepare('SELECT COUNT(*) as cnt FROM daily_journals WHERE user_id = ?').get(USER_ID);
  const projectCount = db.prepare('SELECT COUNT(*) as cnt FROM projects WHERE user_id = ?').get(USER_ID);
  const confidenceCount = db.prepare('SELECT COUNT(*) as cnt FROM confidence_logs WHERE user_id = ?').get(USER_ID);
  const checkinCount = db.prepare(
    'SELECT COUNT(*) as cnt FROM project_checkins pc JOIN projects p ON pc.project_id = p.id WHERE p.user_id = ?'
  ).get(USER_ID);

  // Streak: consecutive days with journal entries
  const journals = db.prepare(
    'SELECT date FROM daily_journals WHERE user_id = ? ORDER BY date DESC'
  ).all(USER_ID);

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
