import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import db from '../db/database.js';
import { calculatePattern, DIMENSION_META } from '../utils/patternCalc.js';

const router = express.Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function buildSystemPrompt(userId) {
  const user = db.prepare('SELECT name, config_json FROM users WHERE id = ?').get(userId);
  const config = JSON.parse(user?.config_json || '{}');
  const userName = user?.name || '守明';

  const dimensions = db.prepare(
    'SELECT dimension_code, score, status FROM dimensions WHERE user_id = ?'
  ).all(userId);

  const pattern = calculatePattern(dimensions);
  const dimSummary = dimensions.map(d => {
    const meta = DIMENSION_META[d.dimension_code];
    const statusLabel = { C: '蓄势', L: '流动', Z: '绽放' }[d.status];
    return `${meta.label}（${d.dimension_code}）: ${d.score.toFixed(1)}/5 [${statusLabel}]`;
  }).join('\n  ');

  const advisorNotes = config.advisor_notes ? `\n【顾问特别指引】\n${config.advisor_notes}` : '';

  return `你是${userName}的专属成长教练，一个融合心理学、身心训练、职业规划与内修实践的智慧伴侣。

你的职责：
1. 基于用户的生活数据，提供有温度、有深度的个人化建议
2. 使用现代心理学（CBT、积极心理学、ACT）和中国传统内修（道家功法、正念）的综合视角
3. 语气温暖、直接、真诚，不过分励志，不空洞鼓励
4. 每次回应简洁有力，3-5段为宜，不用列举过多

用户当前状态：
  模式：${pattern.name}（${pattern.code}）
  ${dimSummary}
${advisorNotes}

重要原则：
- 不提及命理、八字、占星等术语
- 不说教，不评判，以陪伴者而非权威者的姿态
- 给出具体可操作的建议，而非泛泛而谈
- 关注用户说的具体情况，做出针对性回应`;
}

// POST chat with AI coach
router.post('/chat', async (req, res) => {
  const userId = req.userId;
  const { message } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI服务未配置，请设置 ANTHROPIC_API_KEY' });
  }

  const history = db.prepare(
    "SELECT role, content FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT 10"
  ).all(userId).reverse();

  db.prepare('INSERT INTO ai_conversations (user_id, role, content) VALUES (?, ?, ?)').run(
    userId, 'user', message
  );

  try {
    const messages = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: buildSystemPrompt(userId),
      messages,
    });

    const assistantMessage = response.content[0].text;

    db.prepare('INSERT INTO ai_conversations (user_id, role, content) VALUES (?, ?, ?)').run(
      userId, 'assistant', assistantMessage
    );

    res.json({ message: assistantMessage, usage: response.usage });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: '与AI教练通信失败，请稍后再试' });
  }
});

// POST generate weekly report
router.post('/weekly-report', async (req, res) => {
  const userId = req.userId;

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI服务未配置，请设置 ANTHROPIC_API_KEY' });
  }

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const journals = db.prepare(
    'SELECT date, fixed_data, rotating_data FROM daily_journals WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date'
  ).all(userId, weekStartStr, todayStr);

  const projects = db.prepare(
    "SELECT p.name, p.dimension, p.status, COUNT(pc.id) as checkin_count FROM projects p LEFT JOIN project_checkins pc ON p.id = pc.project_id AND pc.date >= ? AND pc.completed = 1 WHERE p.user_id = ? GROUP BY p.id"
  ).all(weekStartStr, userId);

  const dimensions = db.prepare(
    'SELECT dimension_code, score, status FROM dimensions WHERE user_id = ?'
  ).all(userId);

  const pattern = calculatePattern(dimensions);

  const journalSummary = journals.map(j => {
    const fd = JSON.parse(j.fixed_data);
    return `${j.date}: 身体${fd.morning_body || '?'}/5, 心情${fd.evening_mood || '?'}/5, 好事"${fd.good_thing || '-'}"`;
  }).join('\n');

  const projectSummary = projects.map(p => {
    const meta = DIMENSION_META[p.dimension];
    return `[${meta?.label || p.dimension}] ${p.name}: 打卡${p.checkin_count}次`;
  }).join('\n');

  const dimSummary = dimensions.map(d => {
    const meta = DIMENSION_META[d.dimension_code];
    const label = { C: '蓄势', L: '流动', Z: '绽放' }[d.status];
    return `${meta.label}: ${d.score.toFixed(1)}/5 [${label}]`;
  }).join(', ');

  const prompt = `请为以下一周的生活数据生成一份温暖、有洞见的周报。

本周数据（${weekStartStr} 至 ${todayStr}）：

【日记记录】
${journalSummary || '本周暂无日记记录'}

【项目进度】
${projectSummary || '本周暂无活跃项目'}

【当前维度状态】
${dimSummary}

【当前模式】${pattern.name}（${pattern.code}）

请生成一份周报，包含：
1. 本周亮点（2-3个具体值得肯定的点）
2. 值得关注的信号（从数据中发现的规律或需要留意的点）
3. 下周行动建议（2-3个具体可操作的建议）
4. 一句有力量的话作为结语

语气温暖而直接，避免空洞鼓励，字数控制在400字以内。`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: buildSystemPrompt(userId),
      messages: [{ role: 'user', content: prompt }],
    });

    const reportContent = response.content[0].text;

    db.prepare(
      'INSERT INTO weekly_reports (user_id, week_start, report_content) VALUES (?, ?, ?)'
    ).run(userId, weekStartStr, reportContent);

    res.json({ report: reportContent, weekStart: weekStartStr, weekEnd: todayStr });
  } catch (err) {
    console.error('Weekly report error:', err);
    res.status(500).json({ error: '生成周报失败，请稍后再试' });
  }
});

// GET conversation history
router.get('/history', (req, res) => {
  const { limit = 20 } = req.query;
  const history = db.prepare(
    'SELECT role, content, created_at FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(req.userId, parseInt(limit));

  res.json(history.reverse());
});

// DELETE clear conversation history
router.delete('/history', (req, res) => {
  db.prepare('DELETE FROM ai_conversations WHERE user_id = ?').run(req.userId);
  res.json({ success: true });
});

// GET weekly reports list
router.get('/weekly-reports', (req, res) => {
  const reports = db.prepare(
    'SELECT id, week_start, report_content, created_at FROM weekly_reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 5'
  ).all(req.userId);
  res.json(reports);
});

export default router;
