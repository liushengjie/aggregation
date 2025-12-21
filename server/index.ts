import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { initDatabase } from './services/database.js';
import authRouter from './routes/auth.js';
import accountsRouter from './routes/accounts.js';
import itemsRouter from './routes/items.js';
import imageProxyRouter from './routes/imageProxy.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
initDatabase();

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
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

// Routes
app.use('/api/auth', authRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/items', itemsRouter);
app.use('/api/image', imageProxyRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// Import and start scheduler
import { startScheduler } from './services/schedulerService.js';

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    startScheduler();
});
