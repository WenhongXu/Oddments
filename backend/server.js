import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

// Routes
app.use('/api/journal', journalRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/pattern', patternRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/confidence', confidenceRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`守明 backend running on http://localhost:${PORT}`);
});
