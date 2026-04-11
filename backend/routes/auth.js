import crypto from 'crypto';
import express from 'express';
import db from '../db/database.js';

// ── Session secret ──────────────────────────────────────────────────────────
// Throws at startup if not set in production, warns in dev
function getSecret() {
  const s = process.env.SESSION_SECRET;
  const placeholder = 'change-this-to-a-long-random-string';
  if (!s || s === placeholder) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SESSION_SECRET 未配置或使用了默认值。\n' +
        '生成方法：node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }
    console.warn('⚠️  SESSION_SECRET 使用默认值，仅适用于开发环境');
    return 'shoumingapp-dev-secret';
  }
  return s;
}

// ── PIN hashing ─────────────────────────────────────────────────────────────
export function hashPin(pin, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHmac('sha256', s).update(String(pin)).digest('hex');
  return `${s}:${hash}`;
}

// Fix: use timingSafeEqual to prevent timing-based brute-force
export function verifyPin(pin, stored) {
  try {
    const [salt] = stored.split(':');
    const expected = hashPin(String(pin), salt);
    // Both strings must be same length for timingSafeEqual
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(stored, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ── Token generation & verification ─────────────────────────────────────────
function generateToken(userId) {
  const rand = crypto.randomBytes(32).toString('hex');
  const secret = getSecret();
  const sig = crypto.createHmac('sha256', secret).update(`${userId}:${rand}`).digest('hex');
  return `${userId}.${rand}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [userId, rand, sig] = parts;
  try {
    const secret = getSecret();
    const expected = crypto.createHmac('sha256', secret).update(`${userId}:${rand}`).digest('hex');
    // Timing-safe comparison
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  const session = db.prepare(
    'SELECT user_id FROM user_sessions WHERE token = ?'
  ).get(token);
  if (!session) return null;

  return session.user_id;
}

// ── Auth middleware ──────────────────────────────────────────────────────────
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const userId = verifyToken(token);
  if (!userId) {
    return res.status(401).json({ error: '请先登录', code: 'UNAUTHORIZED' });
  }
  req.userId = userId;
  next();
}

// ── Simple in-memory rate limiter (no extra deps) ────────────────────────────
// 10 attempts per 15 minutes per IP; failed attempts count double
const loginAttempts = new Map();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 min

function checkLoginRateLimit(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

function penaliseFailedLogin(ip) {
  const entry = loginAttempts.get(ip);
  if (entry) entry.count = Math.min(entry.count + 2, MAX_ATTEMPTS + 5);
}

function resetLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

// Periodically clean up stale entries (avoid memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts) {
    if (now > entry.resetAt) loginAttempts.delete(ip);
  }
}, 10 * 60 * 1000);

// ── Routes ───────────────────────────────────────────────────────────────────
const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';

  if (!checkLoginRateLimit(ip)) {
    return res.status(429).json({ error: '登录尝试过多，请15分钟后再试' });
  }

  const { username, pin } = req.body;
  if (!username || !pin) {
    return res.status(400).json({ error: '请输入用户名和PIN码' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username).trim());

  if (!user || !user.pin_hash) {
    penaliseFailedLogin(ip);
    // Same error message whether user exists or not (prevents user enumeration)
    return res.status(401).json({ error: '用户名或PIN码错误' });
  }

  if (!verifyPin(String(pin), user.pin_hash)) {
    penaliseFailedLogin(ip);
    return res.status(401).json({ error: '用户名或PIN码错误' });
  }

  resetLoginAttempts(ip);

  const token = generateToken(user.id);
  db.prepare('INSERT INTO user_sessions (user_id, token) VALUES (?, ?)').run(user.id, token);

  res.json({ token, user: { id: user.id, name: user.name, username: user.username } });
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

// POST /api/auth/users — create user
// Requires: valid session token if any users with PIN already exist
router.post('/users', (req, res) => {
  const { name, username, pin } = req.body;

  if (!name || !username || !pin) {
    return res.status(400).json({ error: 'name, username, pin 均为必填' });
  }
  if (String(pin).length < 4) {
    return res.status(400).json({ error: 'PIN码至少4位' });
  }

  const existingWithPin = db.prepare(
    'SELECT COUNT(*) as cnt FROM users WHERE pin_hash IS NOT NULL'
  ).get();

  if (existingWithPin.cnt > 0) {
    // Fix: actually verify the token, not just check presence
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const callerId = verifyToken(token);
    if (!callerId) {
      return res.status(401).json({ error: '需要已登录用户授权才能创建新账户' });
    }
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(String(username).trim());
  if (existing) {
    return res.status(409).json({ error: '用户名已存在' });
  }

  const pin_hash = hashPin(String(pin));
  const result = db.prepare(
    'INSERT INTO users (name, username, pin_hash) VALUES (?, ?, ?)'
  ).run(String(name).trim(), String(username).trim(), pin_hash);

  const DIMS = ['BODY', 'DIET', 'MIND', 'CAREER', 'RELATION', 'FAMILY', 'FINANCE', 'INNER'];
  const dimInsert = db.prepare(
    'INSERT OR IGNORE INTO dimensions (user_id, dimension_code, score, status) VALUES (?, ?, 3.0, ?)'
  );
  for (const dim of DIMS) dimInsert.run(result.lastInsertRowid, dim, 'C');

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

  db.prepare('UPDATE users SET pin_hash = ? WHERE id = ?').run(hashPin(String(new_pin)), req.userId);
  db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(req.userId);

  res.json({ success: true, message: 'PIN码已更新，请重新登录' });
});

export default router;
