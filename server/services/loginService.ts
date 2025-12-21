import { chromium, Browser, BrowserContext, Page, Cookie } from 'playwright';
import crypto from 'crypto';

type Platform = 'Weibo' | 'Bilibili' | 'Xiaohongshu';

interface LoginSession {
    id: string;
    userId: number;
    platform: Platform;
    status: 'pending' | 'waiting' | 'success' | 'failed' | 'timeout';
    cookies?: Cookie[];
    platformUsername?: string;
    error?: string;
    createdAt: Date;
    screenshot?: string;          // base64 截图
    screenshotVersion: number;    // 截图版本号
    lastScreenshotHash?: string;  // 上次截图的哈希值
    browser?: Browser;            // 浏览器实例
    context?: BrowserContext;     // 浏览器上下文
    page?: Page;                  // 页面实例
    needsCaptcha?: boolean;       // 是否需要验证码
}

// Store active login sessions
const activeSessions = new Map<string, LoginSession>();

// Platform configuration
const PLATFORM_CONFIG: Record<Platform, {
    loginUrl: string;
    authCookieNames: string[];
    minCookieCount: number;
    getUsernameSelector?: string;
    usernameSelector?: string;    // 用户名输入框
    passwordSelector?: string;    // 密码输入框
    submitSelector?: string;      // 提交按钮
    captchaInputSelector?: string; // 验证码输入框
    captchaSubmitSelector?: string; // 验证码提交按钮
}> = {
    Weibo: {
        loginUrl: 'https://passport.weibo.com/sso/signin?entry=miniblog&source=miniblog&disp=popup',
        authCookieNames: ['SUB', 'SUBP', 'SSOLoginState', 'XSRF-TOKEN', 'login_sid_t', 'WB'],
        minCookieCount: 3,
        getUsernameSelector: '.gn_name, .NavBar_avatar',
        usernameSelector: 'input[name="username"]',
        passwordSelector: 'input[name="password"]',
        submitSelector: 'a.btn_submit',
    },
    Bilibili: {
        loginUrl: 'https://passport.bilibili.com/login',
        authCookieNames: ['SESSDATA', 'bili_jct', 'DedeUserID', 'sid'],
        minCookieCount: 5,
        getUsernameSelector: '.header-avatar-wrap img',
        usernameSelector: 'input[placeholder="请输入账号"]',
        passwordSelector: 'input[placeholder="请输入密码"]',
        submitSelector: '.btn-login',
    },
    Xiaohongshu: {
        loginUrl: 'https://www.xiaohongshu.com/',
        authCookieNames: ['id_token', 'customer'],
        minCookieCount: 8,
        getUsernameSelector: '.user-name, .nickname',
        usernameSelector: 'input[placeholder="请输入手机号"]',
        passwordSelector: 'input[placeholder="请输入密码"]',
        submitSelector: '.login-btn',
        captchaInputSelector: 'input[placeholder*="验证码"], input[name*="captcha"], input[id*="captcha"]', // 验证码输入框
        captchaSubmitSelector: '.login-btn, button[type="submit"]', // 验证码提交按钮
    },
};

/**
 * Start a login session with Playwright (headless mode)
 */
export async function startLoginSession(
    sessionId: string,
    userId: number,
    platform: Platform
): Promise<LoginSession> {
    const session: LoginSession = {
        id: sessionId,
        userId,
        platform,
        status: 'pending',
        createdAt: new Date(),
        screenshotVersion: 0,
    };

    activeSessions.set(sessionId, session);

    // Start browser in background
    runLoginBrowser(session).catch((err) => {
        console.error(`Login session ${sessionId} error:`, err);
        session.status = 'failed';
        session.error = err.message;
    });

    return session;
}

/**
 * Get login session status
 */
export async function getLoginSession(sessionId: string): Promise<LoginSession | undefined> {
    const session = activeSessions.get(sessionId);
    if (!session) return undefined;

    // Check if SMS captcha is needed (only for Xiaohongshu, after credentials are submitted)
    // SMS captcha only appears after submitting username/password
    if (session.platform === 'Xiaohongshu' && session.page && session.status === 'waiting') {
        try {
            const config = PLATFORM_CONFIG[session.platform];
            if (config.captchaInputSelector) {
                const captchaInput = await session.page.$(config.captchaInputSelector);
                if (captchaInput) {
                    const isVisible = await captchaInput.isVisible().catch(() => false);
                    if (isVisible) {
                        session.needsCaptcha = true;
                    }
                } else {
                    // If input doesn't exist, reset needsCaptcha
                    session.needsCaptcha = false;
                }
            }
        } catch {
            // If check fails, keep current state
        }
    }

    // Return a safe copy without browser instances
    return {
        id: session.id,
        userId: session.userId,
        platform: session.platform,
        status: session.status,
        cookies: session.cookies,
        platformUsername: session.platformUsername,
        error: session.error,
        createdAt: session.createdAt,
        screenshot: session.screenshot,
        screenshotVersion: session.screenshotVersion,
        needsCaptcha: session.needsCaptcha,
    };
}

/**
 * Get screenshot for a session
 */
export async function getSessionScreenshot(sessionId: string): Promise<string | null> {
    const session = activeSessions.get(sessionId);
    if (!session || !session.page || !session.browser) {
        // Return last known screenshot if available
        return session?.screenshot || null;
    }

    try {
        const screenshot = await session.page.screenshot({
            type: 'png',
            fullPage: false
        });
        const base64 = screenshot.toString('base64');
        return `data:image/png;base64,${base64}`;
    } catch (error: any) {
        // If browser/page is closed, return last known screenshot silently
        if (error.message?.includes('closed') || 
            error.message?.includes('Target page') || 
            error.message?.includes('Target closed')) {
            return session.screenshot || null;
        }
        // Only log unexpected errors
        console.error('Screenshot error:', error);
        return session.screenshot || null;
    }
}

/**
 * Submit credentials for password login
 */
export async function submitCredentials(
    sessionId: string,
    username: string,
    password: string
): Promise<{ success: boolean; error?: string }> {
    const session = activeSessions.get(sessionId);
    if (!session || !session.page) {
        return { success: false, error: 'Session not found or page not ready' };
    }

    const config = PLATFORM_CONFIG[session.platform];
    if (!config.usernameSelector || !config.passwordSelector || !config.submitSelector) {
        return { success: false, error: 'Password login not supported for this platform' };
    }

    try {
        const page = session.page;

        // Fill username
        await page.fill(config.usernameSelector, username);
        await page.waitForTimeout(500);

        // Fill password
        await page.fill(config.passwordSelector, password);
        await page.waitForTimeout(500);

        // Click submit to send credentials
        await page.click(config.submitSelector);
        
        // Wait for server response (SMS code to be sent if needed)
        // Usually takes 2-3 seconds for SMS to be sent and UI to update
        await page.waitForTimeout(3000);
        
        // For Xiaohongshu, check if SMS captcha input field appears after submitting credentials
        // SMS captcha only shows up after username/password validation
        if (session.platform === 'Xiaohongshu' && config.captchaInputSelector) {
            try {
                // Wait a bit more for the captcha input field to appear in DOM
                const captchaInput = await page.$(config.captchaInputSelector).catch(() => null);
                if (captchaInput) {
                    // Check if the input is actually visible (not hidden)
                    const isVisible = await captchaInput.isVisible().catch(() => false);
                    if (isVisible) {
                        session.needsCaptcha = true;
                        console.log(`[${session.platform}] SMS verification code required after credentials submission`);
                    } else {
                        session.needsCaptcha = false;
                    }
                } else {
                    // Input field not found, no SMS captcha needed
                    session.needsCaptcha = false;
                }
            } catch (error) {
                // If check fails, assume no captcha needed for now
                console.error(`[${session.platform}] Error checking for SMS captcha:`, error);
                session.needsCaptcha = false;
            }
        }

        console.log(`Credentials submitted for ${session.platform}, needsCaptcha: ${session.needsCaptcha || false}`);
        return { success: true };
    } catch (error: any) {
        console.error('Submit credentials error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Submit captcha code (for Xiaohongshu)
 */
export async function submitCaptcha(
    sessionId: string,
    captchaCode: string
): Promise<{ success: boolean; error?: string }> {
    const session = activeSessions.get(sessionId);
    if (!session || !session.page) {
        return { success: false, error: 'Session not found or page not ready' };
    }

    const config = PLATFORM_CONFIG[session.platform];
    if (!config.captchaInputSelector || !config.captchaSubmitSelector) {
        return { success: false, error: 'Captcha not supported for this platform' };
    }

    try {
        const page = session.page;

        // Fill captcha code
        await page.fill(config.captchaInputSelector, captchaCode);
        await page.waitForTimeout(500);

        // Click submit
        await page.click(config.captchaSubmitSelector);

        console.log(`Captcha submitted for ${session.platform}`);
        return { success: true };
    } catch (error: any) {
        console.error('Submit captcha error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Cancel a login session and close its browser
 */
export async function cancelLoginSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    const session = activeSessions.get(sessionId);
    if (!session) {
        return { success: false, error: 'Session not found' };
    }

    try {
        // Close browser if still open (regardless of session status)
        if (session.browser) {
            try {
                await session.browser.close();
                console.log(`Login session ${sessionId} cancelled, browser closed`);
            } catch (err) {
                console.error('Error closing browser:', err);
            }
        }

        // Update status if still pending or waiting
        if (session.status === 'pending' || session.status === 'waiting') {
            session.status = 'failed';
            session.error = 'Cancelled by user';
        }

        // Clear browser references
        session.browser = undefined;
        session.context = undefined;
        session.page = undefined;

        // Remove from active sessions
        activeSessions.delete(sessionId);

        return { success: true };
    } catch (error: any) {
        console.error('Cancel login session error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Clean up expired sessions (older than 30 minutes)
 */
export function cleanupSessions(): void {
    const now = new Date();
    for (const [id, session] of activeSessions.entries()) {
        const age = now.getTime() - session.createdAt.getTime();
        if (age > 30 * 60 * 1000) {
            // Close browser if still open
            if (session.browser) {
                session.browser.close().catch(err =>
                    console.error('Error closing browser:', err)
                );
            }
            activeSessions.delete(id);
        }
    }
}

/**
 * Calculate hash of screenshot for change detection
 */
function calculateHash(data: string): string {
    return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Capture screenshot and detect changes
 */
async function captureAndCheckScreenshot(session: LoginSession): Promise<void> {
    if (!session.page || !session.browser) return;

    try {
        const screenshot = await session.page.screenshot({
            type: 'png',
            fullPage: false
        });
        const base64 = screenshot.toString('base64');
        const hash = calculateHash(base64);

        // Check if screenshot changed (QR code refresh)
        if (session.lastScreenshotHash && hash !== session.lastScreenshotHash) {
            console.log(`[${session.platform}] Screenshot changed - QR code may have refreshed`);
            session.screenshotVersion++;
        }

        session.screenshot = `data:image/png;base64,${base64}`;
        session.lastScreenshotHash = hash;
    } catch (error: any) {
        // Silently ignore errors if browser/page is closed (expected behavior)
        if (error.message?.includes('closed') || 
            error.message?.includes('Target page') || 
            error.message?.includes('Target closed')) {
            return;
        }
        // Only log unexpected errors
        console.error('Screenshot capture error:', error);
    }
}

/**
 * Run the browser login flow (headless)
 */
async function runLoginBrowser(session: LoginSession): Promise<void> {
    const config = PLATFORM_CONFIG[session.platform];
    let browser: Browser | null = null;

    try {
        console.log(`Starting headless login browser for ${session.platform}...`);

        // Launch browser in headless mode
        browser = await chromium.launch({
            headless: true,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--disable-extensions',
            ],
        });

        session.browser = browser;

        // Create context with clean state
        const context = await browser.newContext({
            viewport: { width: 1280, height: 800 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            storageState: undefined,
        });

        session.context = context;
        const page = await context.newPage();
        session.page = page;

        // Navigate to login page
        await page.goto(config.loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        session.status = 'waiting';

        // Initial screenshot
        await page.waitForTimeout(2000);
        await captureAndCheckScreenshot(session);

        console.log(`Waiting for user to complete ${session.platform} login...`);

        // Start screenshot monitoring loop
        const screenshotInterval = setInterval(async () => {
            if (session.status === 'success' || session.status === 'failed' || session.status === 'timeout') {
                clearInterval(screenshotInterval);
                return;
            }
            await captureAndCheckScreenshot(session);
        }, 2000); // Check every 2 seconds

        // Wait for login success via cookie detection
        try {
            const startTime = Date.now();
            const maxWait = 1800000; // 30 minutes
            let loggedIn = false;

            // Get initial cookies
            const initialCookies = await context.cookies();
            const initialCookieNames = new Set(initialCookies.map(c => c.name));
            console.log(`[${session.platform}] Initial cookies: ${initialCookies.length}`);

            while (Date.now() - startTime < maxWait && !loggedIn) {
                await page.waitForTimeout(2000);

                const currentCookies = await context.cookies();
                const newCookies = currentCookies.filter(c => !initialCookieNames.has(c.name));

                // Check for authenticated cookies
                const foundAuthCookies = newCookies.filter(c =>
                    config.authCookieNames.some(authName =>
                        c.name.toLowerCase().includes(authName.toLowerCase())
                    )
                );

                if (foundAuthCookies.length > 0) {
                    console.log(`[${session.platform}] Found auth cookies: ${foundAuthCookies.map(c => c.name).join(', ')}`);
                    loggedIn = true;
                }

                // Also check cookie count increase
                if (currentCookies.length > initialCookies.length + 3) {
                    const allAuthCookies = currentCookies.filter(c =>
                        config.authCookieNames.some(authName =>
                            c.name.toLowerCase().includes(authName.toLowerCase())
                        )
                    );
                    if (allAuthCookies.length > 0 && newCookies.length > 0) {
                        console.log(`[${session.platform}] Login detected via cookie increase`);
                        loggedIn = true;
                    }
                }
            }

            clearInterval(screenshotInterval);

            if (!loggedIn) {
                throw new Error('Login timeout - no auth cookies detected');
            }

            // Give time for cookies to be set
            await page.waitForTimeout(3000);

            const cookies = await context.cookies();

            if (cookies.length > 0) {
                session.cookies = cookies;
                session.status = 'success';

                // Try to get username
                if (config.getUsernameSelector) {
                    try {
                        const usernameElement = await page.$(config.getUsernameSelector);
                        if (usernameElement) {
                            const username = await usernameElement.getAttribute('alt') ||
                                await usernameElement.textContent();
                            if (username) {
                                session.platformUsername = username.trim();
                            }
                        }
                    } catch {
                        // Ignore username extraction errors
                    }
                }

                console.log(`Login successful for ${session.platform}!`);
            } else {
                session.status = 'failed';
                session.error = 'No cookies found after login';
            }
        } catch (error: any) {
            if (error.message?.includes('timeout')) {
                session.status = 'timeout';
                session.error = 'Login timeout (30 minutes)';
            } else {
                session.status = 'failed';
                session.error = error.message;
            }
        }
    } catch (error: any) {
        session.status = 'failed';
        session.error = error.message;
        console.error(`Login browser error:`, error);
    } finally {
        // Close browser after completion or 3 seconds delay
        if (browser) {
            const closeDelay = session.status === 'success' ? 1000 : 3000;
            setTimeout(async () => {
                try {
                    console.log(`Closing browser for ${session.platform}...`);
                    // Clear browser references before closing
                    session.browser = undefined;
                    session.context = undefined;
                    session.page = undefined;
                    await browser?.close();
                } catch {
                    // Ignore close errors
                }
            }, closeDelay);
        }
    }
}

// Cleanup expired sessions every minute
setInterval(cleanupSessions, 60000);
