import express from 'express';
import cors from 'cors';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './services/database.js';
import authRouter from './routes/auth.js';
import accountsRouter from './routes/accounts.js';
import globalFocusRouter from './routes/globalFocus.js';
import imageProxyRouter from './routes/imageProxy.js';
import hotTrendsRouter from './routes/hotTrends.js';
import hotDramaRouter, { maoyanRouter } from './routes/hotDrama.js';
import schedulerRouter from './routes/scheduler.js';
import opensourceRouter from './routes/opensource.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3351;

// Initialize database
initDatabase();

// Middleware
// CORS配置 - 允许前端端口访问
const FRONTEND_PORT = process.env.FRONTEND_PORT || 3350;
app.use(cors({
    origin: [`http://localhost:${FRONTEND_PORT}`, `http://182.92.92.43:${FRONTEND_PORT}`],
    credentials: true,
}));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'aggregation-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
}));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/global-focus', globalFocusRouter);
app.use('/api/image', imageProxyRouter);
app.use('/api/hot-trends', hotTrendsRouter);
app.use('/api/hot-drama', hotDramaRouter);
app.use('/api/scheduler', schedulerRouter);
app.use('/api/opensource', opensourceRouter);
// Public items routes are now under /api/global-focus/public
// Maoyan routes: /api/maoyan (legacy) and /api/hot-drama/maoyan (new)
app.use('/api/maoyan', maoyanRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from dist directory (frontend)
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Serve frontend for all non-API routes (must be last)
// Express 5.x doesn't support '*' wildcard, so we use a catch-all middleware
// This will only be reached if express.static didn't find a matching file
app.use((req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Not found' });
    }
    // Serve index.html for SPA client-side routing
    res.sendFile(path.join(distPath, 'index.html'));
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`[Scheduler] All schedulers are controlled via frontend settings page`);
    // Schedulers will be started/stopped via /api/scheduler/config endpoint
});
