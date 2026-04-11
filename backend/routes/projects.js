import express from 'express';
import db from '../db/database.js';

const router = express.Router();
const USER_ID = 1;

// GET all projects
router.get('/', (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM projects WHERE user_id = ?';
  const params = [USER_ID];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  query += ' ORDER BY created_at DESC';

  const projects = db.prepare(query).all(...params);

  // Enrich with checkin stats
  const enriched = projects.map(p => {
    const checkins = db.prepare(
      'SELECT date, completed, note FROM project_checkins WHERE project_id = ? ORDER BY date DESC'
    ).all(p.id);

    const totalCheckins = checkins.filter(c => c.completed).length;
    const lastCheckin = checkins[0] || null;
    const todayStr = new Date().toISOString().split('T')[0];
    const checkedInToday = checkins.some(c => c.date === todayStr && c.completed);

    // Calculate streak
    let streak = 0;
    const sortedDates = checkins
      .filter(c => c.completed)
      .map(c => c.date)
      .sort((a, b) => b.localeCompare(a));

    if (sortedDates.length > 0) {
      let expectedDate = new Date(todayStr);
      for (const dateStr of sortedDates) {
        const d = new Date(dateStr);
        const diffDays = Math.round((expectedDate - d) / (1000 * 60 * 60 * 24));
        if (diffDays <= 1) {
          streak++;
          expectedDate = d;
        } else {
          break;
        }
      }
    }

    return {
      ...p,
      rules: JSON.parse(p.rules || '{}'),
      milestones: JSON.parse(p.milestones || '[]'),
      totalCheckins,
      lastCheckin,
      checkedInToday,
      streak,
      recentCheckins: checkins.slice(0, 7),
    };
  });

  res.json(enriched);
});

// GET single project
router.get('/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, USER_ID);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const checkins = db.prepare(
    'SELECT * FROM project_checkins WHERE project_id = ? ORDER BY date DESC'
  ).all(project.id);

  res.json({
    ...project,
    rules: JSON.parse(project.rules || '{}'),
    milestones: JSON.parse(project.milestones || '[]'),
    checkins,
  });
});

// POST create project
router.post('/', (req, res) => {
  const { dimension, name, goal, start_date, end_date, rules, milestones, completion_criteria } = req.body;

  if (!name || !dimension) {
    return res.status(400).json({ error: 'name and dimension are required' });
  }

  // Check active project limit
  const activeCount = db.prepare(
    "SELECT COUNT(*) as cnt FROM projects WHERE user_id = ? AND status = 'active'"
  ).get(USER_ID);

  if (activeCount.cnt >= 5) {
    return res.status(400).json({
      error: '当前活跃项目已达上限（5个），请先完成或放弃已有项目再创建新项目',
      code: 'ACTIVE_LIMIT_EXCEEDED'
    });
  }

  const result = db.prepare(`
    INSERT INTO projects (user_id, dimension, name, goal, start_date, end_date, rules, milestones, completion_criteria)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    USER_ID, dimension, name, goal || null,
    start_date || new Date().toISOString().split('T')[0],
    end_date || null,
    JSON.stringify(rules || {}),
    JSON.stringify(milestones || []),
    completion_criteria || null
  );

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({
    ...project,
    rules: JSON.parse(project.rules),
    milestones: JSON.parse(project.milestones),
  });
});

// POST check-in for a project
router.post('/:id/checkin', (req, res) => {
  const { id } = req.params;
  const { note, date } = req.body;
  const checkinDate = date || new Date().toISOString().split('T')[0];

  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(id, USER_ID);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.status !== 'active') return res.status(400).json({ error: '项目不在进行中状态' });

  // Upsert check-in
  db.prepare(`
    INSERT INTO project_checkins (project_id, date, completed, note)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(project_id, date) DO UPDATE SET completed = 1, note = excluded.note
  `).run(id, checkinDate, note || null);

  // Auto-check completion
  checkProjectCompletion(id, project);

  res.json({ success: true, date: checkinDate });
});

// Add unique constraint for checkins
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_checkin_project_date ON project_checkins(project_id, date);
`);

// PUT update project status
router.put('/:id/status', (req, res) => {
  const { status, abandon_reason } = req.body;
  const validStatuses = ['active', 'completed', 'abandoned', 'expired'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, USER_ID);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const rules = JSON.parse(project.rules || '{}');
  if (status === 'abandoned' && abandon_reason) {
    rules.abandon_reason = abandon_reason;
  }

  db.prepare('UPDATE projects SET status = ?, rules = ? WHERE id = ?').run(
    status, JSON.stringify(rules), req.params.id
  );

  res.json({ success: true, status });
});

// GET project checkin calendar (for visualizing)
router.get('/:id/calendar', (req, res) => {
  const checkins = db.prepare(
    'SELECT date, completed, note FROM project_checkins WHERE project_id = ? ORDER BY date ASC'
  ).all(req.params.id);

  res.json(checkins);
});

function checkProjectCompletion(projectId, project) {
  if (!project.completion_criteria) return;

  const checkins = db.prepare(
    'SELECT COUNT(*) as cnt FROM project_checkins WHERE project_id = ? AND completed = 1'
  ).get(projectId);

  // Simple check: if criteria mentions a number (e.g. "25天"), check if reached
  const match = project.completion_criteria.match(/(\d+)/);
  if (match && checkins.cnt >= parseInt(match[1])) {
    db.prepare("UPDATE projects SET status = 'completed' WHERE id = ?").run(projectId);
  }

  // Also check if past end_date
  if (project.end_date) {
    const today = new Date().toISOString().split('T')[0];
    if (today > project.end_date && project.status === 'active') {
      db.prepare("UPDATE projects SET status = 'expired' WHERE id = ?").run(projectId);
    }
  }
}

export default router;
