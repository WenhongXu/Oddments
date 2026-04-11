import express from 'express';
import db from '../db/database.js';
import { calculatePattern, DIMENSION_META, scoreToStatus } from '../utils/patternCalc.js';

const router = express.Router();

// GET current pattern
router.get('/current', (req, res) => {
  const userId = req.userId;
  const dimensions = db.prepare(
    'SELECT dimension_code, score, status, updated_at FROM dimensions WHERE user_id = ? ORDER BY dimension_code'
  ).all(userId);

  const pattern = calculatePattern(dimensions);

  const latestPattern = db.prepare(
    'SELECT * FROM patterns WHERE user_id = ? ORDER BY evaluated_at DESC LIMIT 1'
  ).get(userId);

  if (!latestPattern || latestPattern.pattern_code !== pattern.code) {
    db.prepare(
      'INSERT INTO patterns (user_id, pattern_code, pattern_name) VALUES (?, ?, ?)'
    ).run(userId, pattern.code, pattern.name);
  }

  const enrichedDimensions = dimensions.map(d => ({
    ...d,
    ...DIMENSION_META[d.dimension_code],
    status: d.status,
    statusLabel: { C: '蓄势', L: '流动', Z: '绽放' }[d.status] || '蓄势',
  }));

  res.json({
    pattern,
    dimensions: enrichedDimensions,
    lastUpdated: latestPattern?.evaluated_at || new Date().toISOString(),
  });
});

// GET pattern history
router.get('/history', (req, res) => {
  const history = db.prepare(
    'SELECT pattern_code, pattern_name, evaluated_at FROM patterns WHERE user_id = ? ORDER BY evaluated_at DESC LIMIT 10'
  ).all(req.userId);

  res.json(history);
});

// POST manually recalculate pattern
router.post('/recalculate', (req, res) => {
  const userId = req.userId;
  const dimensions = db.prepare(
    'SELECT dimension_code, score, status FROM dimensions WHERE user_id = ?'
  ).all(userId);

  const updateStatus = db.prepare(
    'UPDATE dimensions SET status = ? WHERE user_id = ? AND dimension_code = ?'
  );

  for (const d of dimensions) {
    const newStatus = scoreToStatus(d.score);
    updateStatus.run(newStatus, userId, d.dimension_code);
  }

  const updatedDims = db.prepare(
    'SELECT dimension_code, score, status FROM dimensions WHERE user_id = ?'
  ).all(userId);

  const pattern = calculatePattern(updatedDims);
  db.prepare(
    'INSERT INTO patterns (user_id, pattern_code, pattern_name) VALUES (?, ?, ?)'
  ).run(userId, pattern.code, pattern.name);

  res.json({ success: true, pattern });
});

// PUT update a single dimension score
router.put('/dimension/:code', (req, res) => {
  const { score } = req.body;
  const { code } = req.params;

  if (score === undefined || score < 1 || score > 5) {
    return res.status(400).json({ error: 'Score must be between 1 and 5' });
  }

  const status = scoreToStatus(score);
  db.prepare(
    'UPDATE dimensions SET score = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND dimension_code = ?'
  ).run(score, status, req.userId, code);

  res.json({ success: true, code, score, status });
});

export default router;
