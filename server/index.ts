// 加载环境变量（必须在其他导入之前）
import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// 加载 .env 文件
dotenv.config({ path: resolve(process.cwd(), '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { initDatabase } from './services/database.js';
import authRouter from './routes/auth.js';
import accountsRouter from './routes/accounts.js';
import globalFocusRouter from './routes/globalFocus.js';
import imageProxyRouter from './routes/imageProxy.js';
import hotTrendsRouter from './routes/hotTrends.js';
import hotDramaRouter, { maoyanRouter } from './routes/hotDrama.js';
import schedulerRouter, { initializeSchedulers } from './routes/scheduler.js';
import opensourceRouter from './routes/opensource.js';
import analyticsRouter from './routes/analytics.js';
import searchRouter from './routes/search.js';

const app = express();

// 信任代理（因为请求通过 Nginx 反向代理）
// 这样 req.secure 和 req.ip 等才能正确工作
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3351;

// Initialize database
initDatabase();

// Middleware
// CORS配置 - 允许前端访问（支持 HTTP 和 HTTPS）
const FRONTEND_PORT = process.env.FRONTEND_PORT || 3350;
const ALLOWED_ORIGINS = [
    // 开发环境
    `http://localhost:${FRONTEND_PORT}`,
    `http://127.0.0.1:${FRONTEND_PORT}`,
    // 生产环境 HTTP（IP访问）
    `http://182.92.92.43:${FRONTEND_PORT}`,
    `http://182.92.92.43`,
    // 生产环境 HTTPS（域名访问）
    'https://prism.xin',
    'https://www.prism.xin',
];

app.use(cors({
    origin: function (origin, callback) {
        // 允许没有 origin 的请求（如移动应用、Postman、微信小程序等）
        if (!origin) return callback(null, true);
        
        // 允许微信开发者工具的请求（开发环境）
        if (origin.startsWith('http://127.0.0.1:') || origin.startsWith('http://localhost:')) {
            return callback(null, true);
        }
        
        if (ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            // 开发环境：允许所有来源（方便调试）
            if (process.env.NODE_ENV !== 'production') {
                console.log('CORS: Allowing origin in dev mode:', origin);
                return callback(null, true);
            }
            console.warn('CORS: Blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    // 允许的请求头
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    // 允许的请求方法
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'aggregation-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // 生产环境使用 secure
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: 'lax',
    },
}));

// 动态设置 cookie secure（根据实际请求协议）
app.use((req, res, next) => {
    // 如果是 HTTPS（通过 Nginx 代理，检查 X-Forwarded-Proto）
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    if (req.session && isSecure) {
        req.session.cookie.secure = true;
    }
    next();
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/global-focus', globalFocusRouter);
app.use('/api/image', imageProxyRouter);
app.use('/api/hot-trends', hotTrendsRouter);
app.use('/api/hot-drama', hotDramaRouter);
app.use('/api/scheduler', schedulerRouter);
app.use('/api/opensource', opensourceRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/search', searchRouter);
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
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        // 开发环境可能没有构建前端，返回提示信息
        res.status(404).json({ 
            error: 'Frontend not built', 
            message: 'Please run "npm run build" to build the frontend, or access the frontend dev server at http://localhost:3350' 
        });
    }
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`[Scheduler] Initializing schedulers from database...`);
    // Initialize schedulers from database configuration
    initializeSchedulers();
});
