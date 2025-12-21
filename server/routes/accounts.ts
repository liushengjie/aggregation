import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../services/auth';
import { accountOps } from '../services/database';
import { startLoginSession, getLoginSession, getSessionScreenshot, submitCredentials } from '../services/loginService';

const router = Router();

type Platform = 'Weibo' | 'Bilibili' | 'Xiaohongshu';

// Get all platform accounts for current user
router.get('/', requireAuth, (req, res) => {
    try {
        const accounts = accountOps.findByUser.all(req.session.userId);
        // Don't return cookies in the response
        const safeAccounts = (accounts as any[]).map(({ cookies, ...rest }) => rest);
        res.json({ accounts: safeAccounts });
    } catch (error) {
        console.error('Get accounts error:', error);
        res.status(500).json({ error: 'Failed to get accounts' });
    }
});

// Initiate platform login - opens a browser window for the user
router.post('/:platform/login', requireAuth, async (req, res) => {
    try {
        const { platform } = req.params;

        if (!['Weibo', 'Bilibili', 'Xiaohongshu'].includes(platform)) {
            return res.status(400).json({ error: 'Invalid platform' });
        }

        // Generate a unique session ID
        const sessionId = uuidv4();

        // Start the login session with Playwright
        const session = await startLoginSession(
            sessionId,
            req.session.userId!,
            platform as Platform
        );

        // Update or create account with pending status
        const existingAccount = accountOps.findByUserAndPlatform.get(req.session.userId, platform);
        if (!existingAccount) {
            accountOps.create.run(req.session.userId, platform, null, null, 'pending');
        } else {
            accountOps.updateStatus.run('pending', (existingAccount as any).id);
        }

        res.json({
            message: 'Login browser opened. Please complete login in the browser window.',
            sessionId,
            platform,
            status: session.status,
        });
    } catch (error) {
        console.error('Login initiation error:', error);
        res.status(500).json({ error: 'Failed to initiate login' });
    }
});

// Check login session status
router.get('/:platform/login/status/:sessionId', requireAuth, async (req, res) => {
    try {
        const { platform, sessionId } = req.params;

        if (!['Weibo', 'Bilibili', 'Xiaohongshu'].includes(platform)) {
            return res.status(400).json({ error: 'Invalid platform' });
        }

        const session = getLoginSession(sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found or expired' });
        }

        // If login was successful, save the cookies
        if (session.status === 'success' && session.cookies) {
            const cookieString = JSON.stringify(session.cookies);

            const existingAccount = accountOps.findByUserAndPlatform.get(req.session.userId, platform);
            if (!existingAccount) {
                accountOps.create.run(
                    req.session.userId,
                    platform,
                    session.platformUsername || null,
                    cookieString,
                    'connected'
                );
            } else {
                accountOps.updateCookies.run(cookieString, req.session.userId, platform);
            }
        }

        // All platforms support password login based on current config
        const supportsPassword = true;

        res.json({
            sessionId,
            platform,
            status: session.status,
            platformUsername: session.platformUsername,
            error: session.error,
            screenshot: session.screenshot,
            screenshotVersion: session.screenshotVersion,
            supportsPassword,
        });
    } catch (error) {
        console.error('Check login status error:', error);
        res.status(500).json({ error: 'Failed to check login status' });
    }
});

// Save cookies manually (backup method)
router.post('/:platform/cookie', requireAuth, async (req, res) => {
    try {
        const { platform } = req.params;
        const { cookies, platformUsername } = req.body;

        if (!['Weibo', 'Bilibili', 'Xiaohongshu'].includes(platform)) {
            return res.status(400).json({ error: 'Invalid platform' });
        }

        if (!cookies) {
            return res.status(400).json({ error: 'Cookies are required' });
        }

        const cookieString = typeof cookies === 'string' ? cookies : JSON.stringify(cookies);

        const existingAccount = accountOps.findByUserAndPlatform.get(req.session.userId, platform);
        if (!existingAccount) {
            accountOps.create.run(req.session.userId, platform, platformUsername || null, cookieString, 'connected');
        } else {
            accountOps.updateCookies.run(cookieString, req.session.userId, platform);
        }

        res.json({ message: 'Cookies saved successfully', platform });
    } catch (error) {
        console.error('Save cookies error:', error);
        res.status(500).json({ error: 'Failed to save cookies' });
    }
});

// Get login screenshot
router.get('/:platform/login/screenshot/:sessionId', requireAuth, async (req, res) => {
    try {
        const { platform, sessionId } = req.params;

        if (!['Weibo', 'Bilibili', 'Xiaohongshu'].includes(platform)) {
            return res.status(400).json({ error: 'Invalid platform' });
        }

        const screenshot = await getSessionScreenshot(sessionId);

        if (!screenshot) {
            return res.status(404).json({ error: 'Screenshot not available' });
        }

        res.json({ screenshot });
    } catch (error) {
        console.error('Get screenshot error:', error);
        res.status(500).json({ error: 'Failed to get screenshot' });
    }
});

// Submit credentials for password login
router.post('/:platform/login/credentials/:sessionId', requireAuth, async (req, res) => {
    try {
        const { platform, sessionId } = req.params;
        const { username, password } = req.body;

        if (!['Weibo', 'Bilibili', 'Xiaohongshu'].includes(platform)) {
            return res.status(400).json({ error: 'Invalid platform' });
        }

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const result = await submitCredentials(sessionId, username, password);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json({ message: 'Credentials submitted successfully' });
    } catch (error) {
        console.error('Submit credentials error:', error);
        res.status(500).json({ error: 'Failed to submit credentials' });
    }
});

// Disconnect platform account
router.delete('/:platform', requireAuth, (req, res) => {
    try {
        const { platform } = req.params;

        if (!['Weibo', 'Bilibili', 'Xiaohongshu'].includes(platform)) {
            return res.status(400).json({ error: 'Invalid platform' });
        }

        // Clear cookies and reset status instead of deleting
        const account = accountOps.findByUserAndPlatform.get(req.session.userId, platform) as any;
        if (account) {
            // Use clearCookies to avoid setting status to 'connected'
            accountOps.clearCookies.run(req.session.userId, platform);
            accountOps.updateStatus.run('disconnected', account.id);
        }
        res.json({ message: 'Account disconnected successfully' });
    } catch (error) {
        console.error('Disconnect error:', error);
        res.status(500).json({ error: 'Failed to disconnect account' });
    }
});

// Trigger sync for a platform
router.post('/:platform/sync', requireAuth, async (req, res) => {
    try {
        const { platform } = req.params;

        if (!['Weibo', 'Bilibili', 'Xiaohongshu'].includes(platform)) {
            return res.status(400).json({ error: 'Invalid platform' });
        }

        const account = accountOps.findByUserAndPlatform.get(req.session.userId, platform) as any;

        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        if (!account.cookies) {
            return res.status(400).json({ error: 'Account not connected. Please login first.' });
        }

        // Import and call sync service
        const { syncPlatformContent } = await import('../services/syncService');

        // Return immediately, sync runs in background
        res.json({ message: 'Sync started', platform, status: 'running' });

        // Execute sync asynchronously
        syncPlatformContent(account.id, platform as any, account.cookies)
            .then(result => {
                console.log(`Sync completed for ${platform}:`, result);
            })
            .catch(err => {
                console.error(`Sync failed for ${platform}:`, err);
            });
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ error: 'Failed to sync' });
    }
});

export default router;
