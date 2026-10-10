import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import healthcareRoutes from './routes/healthcareRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIST = path.resolve(__dirname, '../../carepulse-health-app/dist');

const app = express();

// Trust proxy for Render / Railway reverse proxies (needed for secure cookies and rate-limiting)
app.set('trust proxy', 1);

// Security Headers with Helmet
app.use(helmet({
  crossOriginResourcePolicy: false
}));

// CORS Configuration - Restrict to configured FRONTEND_URL or mobile/native clients
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);

    const isAllowed = ENV.FRONTEND_URL.some(allowed => {
      return origin === allowed || allowed === '*';
    });

    if (isAllowed || ENV.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Preflight handler
app.options('*', cors());

// Body & Cookie Parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Audit logger without logging sensitive parameters or plain-text OTPs
app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${ip}`);
  next();
});

// Health check endpoint (Returns exact requested JSON { status: "ok" })
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'CarePulse Healthcare API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Backward compatibility alias for /health
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Mount Authentication Routes
app.use('/api/auth', authRoutes);
app.use('/api', authRoutes); // Compatibility alias
app.use('/', authRoutes);    // Direct path alias (e.g. /send-otp, /verify-otp)

// Mount Healthcare API Routes (Doctors, Appointments, Blood Tests, Overtime, SOS, Registrations)
app.use('/api', healthcareRoutes);
app.use('/', healthcareRoutes); // Direct path alias (e.g. /doctors, /appointments)


// Serve Frontend static assets if built
app.use(express.static(FRONTEND_DIST));

// SPA Client-side routing fallback for non-API GET requests
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/health') {
    return next();
  }
  const indexHtml = path.join(FRONTEND_DIST, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) next();
  });
});

// 404 Route for unmatched API endpoints
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

export default app;
