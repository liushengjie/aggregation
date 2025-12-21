import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { userOps } from '../services/database';
import { requireAuth } from '../services/auth';

const router = Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user exists
        const existingUser = userOps.findByUsername.get(username);
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Hash password and create user
        const passwordHash = await bcrypt.hash(password, 10);
        const result = userOps.create.run(username, passwordHash);

        // Set session
        req.session.userId = result.lastInsertRowid as number;
        req.session.username = username;

        res.status(201).json({
            message: 'User created successfully',
            user: { id: result.lastInsertRowid, username },
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = userOps.findByUsername.get(username) as { id: number; username: string; password_hash: string } | undefined;
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Set session
        req.session.userId = user.id;
        req.session.username = user.username;

        res.json({
            message: 'Login successful',
            user: { id: user.id, username: user.username },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to logout' });
        }
        res.json({ message: 'Logged out successfully' });
    });
});

// Get current user
router.get('/me', requireAuth, (req, res) => {
    const user = userOps.findById.get(req.session.userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
});

export default router;
