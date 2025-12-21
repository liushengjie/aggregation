import { Request, Response, NextFunction } from 'express';

// Extend express-session types
declare module 'express-session' {
    interface SessionData {
        userId?: number;
        username?: string;
    }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}
