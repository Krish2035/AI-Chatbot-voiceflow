import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDB, getDBStatus } from './config/db.js';
import chatRoutes from './routes/chatRoutes.js';
import voiceRoutes from './routes/voiceRoutes.js';
import historyRoutes from './routes/historyRoutes.js';
import { groqKeyPool, hfKeyPool } from './services/keyManager.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend clients (Local + Production Vercel / Custom domain)
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or Postman)
    if (!origin) return callback(null, true);
    
    // Allow if in explicit list or if matches vercel.app preview URLs
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      process.env.NODE_ENV !== 'production' ||
      !process.env.FRONTEND_URL // Allow all if FRONTEND_URL is not explicitly configured
    ) {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const groqStatus = groqKeyPool.getStatus();
  const hfStatus = hfKeyPool.getStatus();
  const dbStatus = getDBStatus();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      backend: 'online',
      groqConfigured: groqStatus.configured,
      groqKeysCount: groqStatus.totalKeys,
      groqActiveKeys: groqStatus.activeKeys,
      groqPool: groqStatus,
      huggingFaceConfigured: hfStatus.configured,
      huggingFaceKeysCount: hfStatus.totalKeys,
      huggingFaceActiveKeys: hfStatus.activeKeys,
      huggingFacePool: hfStatus,
      database: dbStatus
    }
  });
});

// Register API routes
app.use('/api/chat', chatRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/history', historyRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('💥 Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// Start Server & Connect Database
const startServer = async () => {
  await initDB();

  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🚀 Voiceflow AI Backend is running on http://localhost:${PORT}`);
    console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
    console.log(`💬 Chat API: http://localhost:${PORT}/api/chat`);
    console.log(`🎤 Voice API: http://localhost:${PORT}/api/voice/chat`);
    console.log(`📚 History API: http://localhost:${PORT}/api/history/conversations`);
    console.log('====================================================');
  });
};

startServer();
