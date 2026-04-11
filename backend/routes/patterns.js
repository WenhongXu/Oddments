import express from 'express';
import db from '../db/database.js';
import { calculatePattern, DIMENSION_META, scoreToStatus } from '../utils/patternCalc.js';

const router = express.Router();
const USER_ID = 1;

// GET current pattern
router.get('/current', (req, res) => {
  const dimensions = db.prepare(
    'SELECT dimension_code, score, status, updated_at FROM dimensions WHERE user_id = ? ORDER BY dimension_code'
  ).all(USER_ID);

  const pattern = calculatePattern(dimensions);

  // Get or create latest pattern record
  const latestPattern = db.prepare(
    'SELECT * FROM patterns WHERE user_id = ? ORDER BY evaluated_at DESC LIMIT 1'
  ).get(USER_ID);

  // Save pattern if changed or no pattern exists
  if (!latestPattern || latestPattern.pattern_code !== pattern.code) {
    db.prepare(
      'INSERT INTO patterns (user_id, pattern_code, pattern_name) VALUES (?, ?, ?)'
    ).run(USER_ID, pattern.code, pattern.name);
  }

  // Enrich dimensions with metadata
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
  ).all(USER_ID);

  res.json(history);
});

// POST manually recalculate pattern
router.post('/recalculate', (req, res) => {
  const dimensions = db.prepare(
    'SELECT dimension_code, score, status FROM dimensions WHERE user_id = ?'
  ).all(USER_ID);

  // Recalculate status from scores
  const updateStatus = db.prepare(
    'UPDATE dimensions SET status = ? WHERE user_id = ? AND dimension_code = ?'
  );

  for (const d of dimensions) {
    const newStatus = scoreToStatus(d.score);
    updateStatus.run(newStatus, USER_ID, d.dimension_code);
  }

  const updatedDims = db.prepare(
    'SELECT dimension_code, score, status FROM dimensions WHERE user_id = ?'
  ).all(USER_ID);

  const pattern = calculatePattern(updatedDims);
  db.prepare(
    'INSERT INTO patterns (user_id, pattern_code, pattern_name) VALUES (?, ?, ?)'
  ).run(USER_ID, pattern.code, pattern.name);

  res.json({ success: true, pattern });
});

// PUT update a single dimension score (for testing/admin)
router.put('/dimension/:code', (req, res) => {
  const { score } = req.body;
  const { code } = req.params;

  if (score === undefined || score < 1 || score > 5) {
    return res.status(400).json({ error: 'Score must be between 1 and 5' });
  }

  const status = scoreToStatus(score);
  db.prepare(
    'UPDATE dimensions SET score = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND dimension_code = ?'
  ).run(score, status, USER_ID, code);

  res.json({ success: true, code, score, status });
});

export default router;
