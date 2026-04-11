import crypto from 'crypto';
import db from '../db/database.js';

// Hash a PIN with a salt
export function hashPin(pin, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHmac('sha256', s).update(String(pin)).digest('hex');
  return `${s}:${hash}`;
}

export function verifyPin(pin, stored) {
  const [salt] = stored.split(':');
  return hashPin(pin, salt) === stored;
}

// Generate a session token
function generateToken(userId) {
  const rand = crypto.randomBytes(32).toString('hex');
  const secret = process.env.SESSION_SECRET || 'shoumingapp-dev-secret';
  const sig = crypto.createHmac('sha256', secret).update(`${userId}:${rand}`).digest('hex');
  return `${userId}.${rand}.${sig}`;
}

// Verify and extract userId from token
function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [userId, rand, sig] = parts;
  const secret = process.env.SESSION_SECRET || 'shoumingapp-dev-secret';
  const expected = crypto.createHmac('sha256', secret).update(`${userId}:${rand}`).digest('hex');
  if (sig !== expected) return null;

  // Check session exists in DB
  const session = db.prepare(
    'SELECT user_id FROM user_sessions WHERE token = ?'
  ).get(token);
  if (!session) return null;

  return session.user_id;
}

// Auth middleware — attaches req.userId or returns 401
export function authMiddleware(req, res, next) {
  // Support Bearer token in Authorization header OR cookie
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.headers['x-auth-token'] || '';

  const userId = verifyToken(token);
  if (!userId) {
    return res.status(401).json({ error: '请先登录', code: 'UNAUTHORIZED' });
  }

  req.userId = userId;
  next();
}

// Auth routes handler (no middleware needed here)
import express from 'express';
const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, pin } = req.body;

  if (!username || !pin) {
    return res.status(400).json({ error: '请输入用户名和PIN码' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());

  if (!user) {
    return res.status(401).json({ error: '用户名或PIN码错误' });
  }

  // If no PIN set yet (legacy user), allow setup
  if (!user.pin_hash) {
    return res.status(403).json({ error: '此账户尚未设置PIN码，请联系管理员', code: 'NO_PIN' });
  }

  if (!verifyPin(String(pin), user.pin_hash)) {
    return res.status(401).json({ error: '用户名或PIN码错误' });
  }

  // Create session
  const token = generateToken(user.id);
  db.prepare('INSERT INTO user_sessions (user_id, token) VALUES (?, ?)').run(user.id, token);

  res.json({
    token,
    user: { id: user.id, name: user.name, username: user.username },
  });
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, (req, res) => {
  const token = (req.headers.authorization || '').slice(7);
  db.prepare('DELETE FROM user_sessions WHERE token = ?').run(token);
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, name, username FROM users WHERE id = ?').get(req.userId);
  res.json(user);
});

// POST /api/auth/users — create a new user (requires existing admin session OR no users yet)
router.post('/users', (req, res) => {
  const { name, username, pin } = req.body;

  if (!name || !username || !pin) {
    return res.status(400).json({ error: 'name, username, pin 均为必填' });
  }

  if (String(pin).length < 4) {
    return res.status(400).json({ error: 'PIN码至少4位' });
  }

  // Only allow creation if: caller is authenticated admin OR no users with PIN exist yet
  const existingWithPin = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE pin_hash IS NOT NULL').get();
  if (existingWithPin.cnt > 0) {
    // Must be authenticated
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return res.status(401).json({ error: '需要管理员权限' });
    }
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing) {
    return res.status(409).json({ error: '用户名已存在' });
  }

  const pin_hash = hashPin(String(pin));
  const result = db.prepare(
    'INSERT INTO users (name, username, pin_hash) VALUES (?, ?, ?)'
  ).run(name.trim(), username.trim(), pin_hash);

  // Seed default dimensions for new user
  const DIMS = ['BODY', 'DIET', 'MIND', 'CAREER', 'RELATION', 'FAMILY', 'FINANCE', 'INNER'];
  const dimInsert = db.prepare(
    'INSERT OR IGNORE INTO dimensions (user_id, dimension_code, score, status) VALUES (?, ?, 3.0, ?)'
  );
  for (const dim of DIMS) {
    dimInsert.run(result.lastInsertRowid, dim, 'C');
  }

  res.status(201).json({ id: result.lastInsertRowid, name, username });
});

// PUT /api/auth/pin — change own PIN
router.put('/pin', authMiddleware, (req, res) => {
  const { current_pin, new_pin } = req.body;

  if (!new_pin || String(new_pin).length < 4) {
    return res.status(400).json({ error: '新PIN码至少4位' });
  }

  const user = db.prepare('SELECT pin_hash FROM users WHERE id = ?').get(req.userId);

  if (user.pin_hash && !verifyPin(String(current_pin), user.pin_hash)) {
    return res.status(401).json({ error: '当前PIN码错误' });
  }

  const pin_hash = hashPin(String(new_pin));
  db.prepare('UPDATE users SET pin_hash = ? WHERE id = ?').run(pin_hash, req.userId);

  // Invalidate all existing sessions
  db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(req.userId);

  res.json({ success: true, message: 'PIN码已更新，请重新登录' });
});

export default router;
