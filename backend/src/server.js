import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDB, getDBStatus } from './config/db.js';
import { initRedis, getRedisStatus } from './services/redisService.js';
import { initQueue, getQueueStatus } from './services/queueService.js';
import chatRoutes from './routes/chatRoutes.js';
import voiceRoutes from './routes/voiceRoutes.js';
import historyRoutes from './routes/historyRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { groqKeyPool, hfKeyPool } from './services/keyManager.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { setupSwagger } from './config/swagger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy (for Load Balancer & Docker Nginx rate limit headers)
app.set('trust proxy', 1);

// Enable CORS for frontend clients (Local + Production Vercel / Custom domain)
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:80',
  'http://localhost',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman, Swagger UI)
    if (!origin) return callback(null, true);
    
    // Allow if in explicit list or matches vercel.app preview URLs
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      process.env.NODE_ENV !== 'production' ||
      !process.env.FRONTEND_URL
    ) {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsers
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Global API rate limiting
app.use('/api', apiLimiter);

// Setup Swagger UI Documentation at /api-docs
setupSwagger(app);

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint (Reporting infrastructure metrics)
app.get('/api/health', (req, res) => {
  const groqStatus = groqKeyPool.getStatus();
  const hfStatus = hfKeyPool.getStatus();
  const dbStatus = getDBStatus();
  const redisStatus = getRedisStatus();
  const queueStatus = getQueueStatus();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    architecture: {
      tier: 'Top 1% Scalable Architecture',
      orm: 'Drizzle ORM (Type-Safe Schema)',
      database: dbStatus,
      readReplica: {
        active: dbStatus.readReplicaActive,
        routing: dbStatus.readRouting
      },
      searchIndexing: {
        active: true,
        type: dbStatus.connected ? 'PostgreSQL Full-Text GIN Index' : 'In-Memory Substring & Token Indexer',
        endpoint: '/api/history/search'
      },
      cache: redisStatus,
      taskQueue: queueStatus,
      rateLimiter: 'Active (express-rate-limit + Redis)',
      swaggerDocs: '/api-docs',
      auth: {
        type: 'JWT + Firebase Google OAuth',
        endpoints: ['/api/auth/register', '/api/auth/login', '/api/auth/google', '/api/auth/me']
      }
    },
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
app.use('/api/auth', authRoutes);
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

// Start Server, Database, Redis, and BullMQ Queue
const startServer = async () => {
  // 1. Initialize Drizzle ORM & Read Replicas
  await initDB();

  // 2. Initialize Redis Cache
  initRedis();

  // 3. Initialize BullMQ Queue Worker
  initQueue();

  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🚀 Voiceflow AI Backend is running on http://localhost:${PORT}`);
    console.log(`📑 Swagger UI Docs: http://localhost:${PORT}/api-docs`);
    console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
    console.log(`💬 Chat API: http://localhost:${PORT}/api/chat`);
    console.log(`🎤 Voice API: http://localhost:${PORT}/api/voice/chat`);
    console.log(`🔎 Search API: http://localhost:${PORT}/api/history/search?q=...`);
    console.log(`📚 History API: http://localhost:${PORT}/api/history/conversations`);
    console.log('====================================================');
  });
};

startServer();
