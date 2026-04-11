import express from 'express';
import db from '../db/database.js';

const router = express.Router();
const DIMS = ['BODY', 'DIET', 'MIND', 'CAREER', 'RELATION', 'FAMILY', 'FINANCE', 'INNER'];

// GET today's journal template (fixed + rotating questions)
router.get('/today', (req, res) => {
  const userId = req.userId;
  const today = new Date().toISOString().split('T')[0];

  const existing = db.prepare(
    'SELECT * FROM daily_journals WHERE user_id = ? AND date = ?'
  ).get(userId, today);

  const projects = db.prepare(
    "SELECT id, name, dimension FROM projects WHERE user_id = ? AND status = 'active'"
  ).all(userId);

  const rotatingQuestions = selectRotatingQuestions(today, userId);

  res.json({
    date: today,
    alreadyFilled: !!existing,
    existing: existing ? {
      fixed_data: JSON.parse(existing.fixed_data),
      rotating_data: JSON.parse(existing.rotating_data),
    } : null,
    projects,
    rotatingQuestions,
  });
});

// PUT save journal for a date
router.put('/:date', (req, res) => {
  const userId = req.userId;
  const { date } = req.params;
  const { fixed_data, rotating_data } = req.body;

  // Fix: validate date format to prevent garbage data
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: '日期格式无效，应为 YYYY-MM-DD' });
  }

  if (!fixed_data) {
    return res.status(400).json({ error: 'fixed_data is required' });
  }

  db.prepare(`
    INSERT INTO daily_journals (user_id, date, fixed_data, rotating_data)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
      fixed_data = excluded.fixed_data,
      rotating_data = excluded.rotating_data
  `).run(userId, date, JSON.stringify(fixed_data), JSON.stringify(rotating_data || {}));

  if (rotating_data) {
    for (const [qid, answer] of Object.entries(rotating_data)) {
      const q = db.prepare('SELECT * FROM question_pool WHERE id = ?').get(parseInt(qid));
      if (q && q.config) {
        const cfg = JSON.parse(q.config);
        if (cfg.is_confidence && answer && typeof answer === 'string' && answer.trim()) {
          db.prepare(
            'INSERT INTO confidence_logs (user_id, date, content, source) VALUES (?, ?, ?, ?)'
          ).run(userId, date, answer.trim(), 'daily');
        }
      }
    }
  }

  updateDimensionScores(fixed_data, rotating_data, userId);

  if (rotating_data) {
    const stmt = db.prepare("UPDATE question_pool SET last_asked_at = ? WHERE id = ?");
    for (const qid of Object.keys(rotating_data)) {
      stmt.run(date, parseInt(qid));
    }
  }

  res.json({ success: true, date });
});

// GET journal history
router.get('/history', (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 7, 1), 90);
  const journals = db.prepare(
    'SELECT date, fixed_data, rotating_data FROM daily_journals WHERE user_id = ? ORDER BY date DESC LIMIT ?'
  ).all(req.userId, limit);

  res.json(journals.map(j => ({
    date: j.date,
    fixed_data: JSON.parse(j.fixed_data),
    rotating_data: JSON.parse(j.rotating_data),
  })));
});

// GET weekly mood data for chart
router.get('/week-mood', (req, res) => {
  const journals = db.prepare(
    'SELECT date, fixed_data FROM daily_journals WHERE user_id = ? ORDER BY date DESC LIMIT 14'
  ).all(req.userId);

  const data = journals.map(j => {
    const fd = JSON.parse(j.fixed_data);
    return {
      date: j.date,
      morning_body: fd.morning_body || null,
      morning_sleep: fd.morning_sleep || null,
      evening_mood: fd.evening_mood || null,
    };
  }).reverse();

  res.json(data);
});

function selectRotatingQuestions(today, userId) {
  const dims = db.prepare('SELECT dimension_code, score FROM dimensions WHERE user_id = ?').all(userId);
  const dimScores = {};
  for (const d of dims) dimScores[d.dimension_code] = d.score;

  const sortedDims = [...DIMS].sort((a, b) => (dimScores[a] || 3) - (dimScores[b] || 3));

  const selected = [];
  const usedDims = new Set();

  for (const dim of sortedDims) {
    if (selected.length >= 3) break;
    if (usedDims.has(dim)) continue;

    const q = db.prepare(`
      SELECT * FROM question_pool
      WHERE dimension = ? AND is_active = 1 AND (user_id IS NULL OR user_id = ?)
      ORDER BY last_asked_at ASC NULLS FIRST, RANDOM()
      LIMIT 1
    `).get(dim, userId);

    if (q) {
      selected.push({
        id: q.id,
        dimension: q.dimension,
        question_text: q.question_text,
        question_type: q.question_type,
        config: JSON.parse(q.config),
      });
      usedDims.add(dim);
    }
  }

  if (selected.length < 2) {
    const extra = db.prepare(`
      SELECT * FROM question_pool
      WHERE is_active = 1 AND (user_id IS NULL OR user_id = ?)
      AND id NOT IN (${selected.map(() => '?').join(',') || '0'})
      ORDER BY RANDOM()
      LIMIT ?
    `).all(userId, ...selected.map(q => q.id), 3 - selected.length);

    for (const q of extra) {
      selected.push({
        id: q.id,
        dimension: q.dimension,
        question_text: q.question_text,
        question_type: q.question_type,
        config: JSON.parse(q.config),
      });
    }
  }

  return selected;
}

function updateDimensionScores(fixed_data, rotating_data, userId) {
  const dimScores = {};
  const dimCounts = {};

  if (rotating_data) {
    for (const [qid, answer] of Object.entries(rotating_data)) {
      const q = db.prepare('SELECT dimension, question_type FROM question_pool WHERE id = ?').get(parseInt(qid));
      if (!q) continue;

      let numericScore = null;
      if (q.question_type === 'scale' && typeof answer === 'number') {
        numericScore = answer;
      } else if (q.question_type === 'yesno') {
        numericScore = answer === true || answer === 'yes' ? 4 : 2;
      }

      if (numericScore !== null) {
        if (!dimScores[q.dimension]) { dimScores[q.dimension] = 0; dimCounts[q.dimension] = 0; }
        dimScores[q.dimension] += numericScore;
        dimCounts[q.dimension]++;
      }
    }
  }

  if (fixed_data.morning_body) {
    const v = fixed_data.morning_body;
    if (!dimScores['BODY']) { dimScores['BODY'] = 0; dimCounts['BODY'] = 0; }
    dimScores['BODY'] += v;
    dimCounts['BODY']++;
  }

  if (fixed_data.evening_mood) {
    const v = fixed_data.evening_mood;
    if (!dimScores['MIND']) { dimScores['MIND'] = 0; dimCounts['MIND'] = 0; }
    dimScores['MIND'] += v;
    dimCounts['MIND']++;
  }

  const update = db.prepare(
    'UPDATE dimensions SET score = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND dimension_code = ?'
  );

  for (const [dim, total] of Object.entries(dimScores)) {
    if (dimCounts[dim] === 0) continue;
    const newScore = total / dimCounts[dim];
    const existing = db.prepare('SELECT score FROM dimensions WHERE user_id = ? AND dimension_code = ?').get(userId, dim);
    const blendedScore = existing ? (existing.score * 0.7 + newScore * 0.3) : newScore;
    const status = blendedScore >= 3.8 ? 'Z' : blendedScore >= 2.5 ? 'L' : 'C';
    update.run(blendedScore, status, userId, dim);
  }
}

export default router;
