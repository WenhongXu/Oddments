import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter, { authMiddleware } from './routes/auth.js';
import journalRoutes from './routes/journal.js';
import projectRoutes from './routes/projects.js';
import patternRoutes from './routes/patterns.js';
import aiRoutes from './routes/ai.js';
import confidenceRoutes from './routes/confidence.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Public routes
app.use('/api/auth', authRouter);

// Health check (public)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// All other API routes require auth
app.use('/api/journal', authMiddleware, journalRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/pattern', authMiddleware, patternRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/confidence', authMiddleware, confidenceRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);

app.listen(PORT, () => {
  console.log(`守明 backend running on http://localhost:${PORT}`);
});
