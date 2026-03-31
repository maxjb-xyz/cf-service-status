import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
    getServices,
    getCategories,
    getSettings,
    getLatestStatuses,
    getHourlyHistory,
    getHourlyHistoryBatch,
    calculateUptimeBatch,
    createService,
    updateService,
    deleteService,
    createCategory,
    updateCategory,
    deleteCategory,
    updateSetting,
    Service,
    Category,
    StatusHistory,
    HourlyStatus
} from './db';
import { runHealthChecks } from './health-check';
import { indexHtml, adminHtml, stylesCSS } from './static';
import { initializeDatabase } from './migrate';

export interface Env {
    DB: D1Database;
    SITE_TOKEN: string;
    WORKER_URL?: string;  // Optional: set this to enable HTTP-triggered checks for Smart Placement
}

const app = new Hono<{ Bindings: Env }>();

// =====================
// Security Headers
// =====================

app.use('*', async (c, next) => {
    await next();
    c.res.headers.set('X-Content-Type-Options', 'nosniff');
    c.res.headers.set('X-Frame-Options', 'DENY');
    c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.res.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'"
    );
});

// Initialize DB on first request per Worker instance; subsequent calls are no-ops (module-level flag)
app.use('*', async (c, next) => {
    await initializeDatabase(c.env.DB);
    await next();
});

// Enable CORS for public API routes only (admin routes are same-origin)
app.use('/api/status', cors());
app.use('/api/history/*', cors());

// =====================
// Rate Limiting (login endpoint)
// =====================

// In-memory rate limit store — not persistent across Worker cold starts,
// but provides meaningful brute-force protection within a running instance.
const loginRateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 10;

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = loginRateLimit.get(ip);
    if (entry) {
        if (now > entry.resetAt) {
            loginRateLimit.delete(ip);
        } else if (entry.count >= RATE_LIMIT_MAX) {
            return false;
        }
    }
    return true;
}

function recordLoginAttempt(ip: string, succeeded: boolean): void {
    if (succeeded) {
        loginRateLimit.delete(ip);
        return;
    }
    const now = Date.now();
    const entry = loginRateLimit.get(ip);
    if (entry && now <= entry.resetAt) {
        entry.count += 1;
    } else {
        loginRateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    }
}

// =====================
// URL Validation (SSRF prevention)
// =====================

const PRIVATE_IP_PATTERNS = [
    /^localhost$/i,
    /^127\./,
    /^0\.0\.0\.0$/,
    /^::1$/,
    /^169\.254\./,           // link-local / cloud metadata
    /^10\./,                  // RFC 1918
    /^172\.(1[6-9]|2\d|3[01])\./, // RFC 1918
    /^192\.168\./,            // RFC 1918
    /^fc00:/i,                // IPv6 private
    /^fe80:/i,                // IPv6 link-local
];

function validateServiceUrl(rawUrl: string): string | null {
    let parsed: URL;
    try {
        parsed = new URL(rawUrl);
    } catch {
        return 'Invalid URL format';
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return 'URL must use http or https';
    }
    const hostname = parsed.hostname.replace(/^\[|\]$/g, ''); // strip IPv6 brackets
    for (const pattern of PRIVATE_IP_PATTERNS) {
        if (pattern.test(hostname)) {
            return 'URL must not point to a private or internal address';
        }
    }
    return null; // valid
}

// =====================
// Static Files
// =====================

app.get('/', (c) => {
    return c.html(indexHtml);
});

app.get('/index.html', (c) => {
    return c.html(indexHtml);
});

app.get('/admin', (c) => {
    return c.html(adminHtml);
});

app.get('/admin.html', (c) => {
    return c.html(adminHtml);
});

app.get('/styles.css', (c) => {
    return c.text(stylesCSS, 200, { 'Content-Type': 'text/css' });
});

// =====================
// Public API Routes
// =====================

// Get full status data for the public page
app.get('/api/status', async (c) => {
    const db = c.env.DB;

    const [services, categories, settings, latestStatuses] = await Promise.all([
        getServices(db),
        getCategories(db),
        getSettings(db),
        getLatestStatuses(db)
    ]);

    // Fetch uptime and history for all services in two batch queries (not N per service)
    const historyHours = Math.min(Math.max(parseInt(settings.history_hours) || 48, 1), 720);
    const serviceIds = services.map(s => s.id);

    const [uptimeMap, historyMap] = await Promise.all([
        calculateUptimeBatch(db, serviceIds, historyHours),
        getHourlyHistoryBatch(db, serviceIds, historyHours)
    ]);

    const uptimes: Record<string, number> = Object.fromEntries(uptimeMap);
    const histories: Record<string, HourlyStatus[]> = Object.fromEntries(historyMap);

    // Build response grouped by category
    const statusByCategory: Record<string, {
        category: Category | null;
        services: Array<{
            service: Service;
            status: StatusHistory | null;
            uptime: number;
            history: HourlyStatus[];
        }>;
    }> = {};

    // Initialize with null category for ungrouped services
    statusByCategory['uncategorized'] = { category: null, services: [] };

    // Initialize categories
    for (const category of categories) {
        statusByCategory[category.id] = { category, services: [] };
    }

    // Add services to their categories
    for (const service of services) {
        const categoryKey = service.category_id || 'uncategorized';
        if (!statusByCategory[categoryKey]) {
            statusByCategory[categoryKey] = { category: null, services: [] };
        }
        statusByCategory[categoryKey].services.push({
            service,
            status: latestStatuses.get(service.id) || null,
            uptime: uptimes[service.id] || 100,
            history: histories[service.id] || []
        });
    }

    // Remove empty categories
    for (const key of Object.keys(statusByCategory)) {
        if (statusByCategory[key].services.length === 0) {
            delete statusByCategory[key];
        }
    }

    // Calculate overall status
    let overallStatus: 'operational' | 'degraded' | 'outage' = 'operational';
    for (const service of services) {
        const status = latestStatuses.get(service.id)?.status;
        if (status === 'outage') {
            overallStatus = 'outage';
            break;
        } else if (status === 'degraded' && overallStatus === 'operational') {
            overallStatus = 'degraded';
        }
    }
    // Get last check info from most recent status
    let lastCheckTime: string | null = null;
    let lastCheckLocation: string | null = null;
    for (const [, status] of latestStatuses) {
        if (!lastCheckTime || status.checked_at > lastCheckTime) {
            lastCheckTime = status.checked_at;
            lastCheckLocation = status.check_location;
        }
    }

    return c.json({
        settings: {
            site_title: settings.site_title,
            site_description: settings.site_description,
            history_hours: historyHours
        },
        overall_status: overallStatus,
        categories: Object.values(statusByCategory),
        last_check: {
            time: lastCheckTime,
            location: lastCheckLocation
        },
        last_updated: new Date().toISOString()
    });
});

// Get hourly history for a specific service
app.get('/api/history/:serviceId', async (c) => {
    const db = c.env.DB;
    const serviceId = c.req.param('serviceId');
    const hours = Math.min(Math.max(parseInt(c.req.query('hours') || '48') || 48, 1), 720);

    const history = await getHourlyHistory(db, serviceId, hours);
    return c.json({ history });
});

// =====================
// Admin Authentication
// =====================

// Verify admin token middleware
const adminAuth = async (c: any, next: () => Promise<void>) => {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token || token !== c.env.SITE_TOKEN) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    await next();
};

// Login endpoint - validates token
app.post('/api/admin/login', async (c) => {
    const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'unknown';

    if (!checkRateLimit(ip)) {
        return c.json({ error: 'Too many login attempts. Try again later.' }, 429);
    }

    const body = await c.req.json<{ token: string }>();
    const succeeded = body.token === c.env.SITE_TOKEN;
    recordLoginAttempt(ip, succeeded);

    if (succeeded) {
        return c.json({ success: true, message: 'Authenticated' });
    }

    return c.json({ error: 'Invalid token' }, 401);
});

// =====================
// Admin API Routes
// =====================

// Services CRUD
app.get('/api/admin/services', adminAuth, async (c) => {
    const services = await getServices(c.env.DB);
    return c.json({ services });
});

app.post('/api/admin/services', adminAuth, async (c) => {
    const body = await c.req.json<{
        name: string;
        url: string;
        category_id?: string;
        expected_status?: number;
    }>();

    if (!body.name || !body.url) {
        return c.json({ error: 'Name and URL are required' }, 400);
    }

    const urlError = validateServiceUrl(body.url);
    if (urlError) {
        return c.json({ error: urlError }, 400);
    }

    const service = await createService(c.env.DB, body);
    return c.json({ service }, 201);
});

app.put('/api/admin/services/:id', adminAuth, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json<Partial<Service>>();

    if (body.url) {
        const urlError = validateServiceUrl(body.url);
        if (urlError) {
            return c.json({ error: urlError }, 400);
        }
    }

    await updateService(c.env.DB, id, body);
    return c.json({ success: true });
});

app.delete('/api/admin/services/:id', adminAuth, async (c) => {
    const id = c.req.param('id');
    await deleteService(c.env.DB, id);
    return c.json({ success: true });
});

// Categories CRUD
app.get('/api/admin/categories', adminAuth, async (c) => {
    const categories = await getCategories(c.env.DB);
    return c.json({ categories });
});

app.post('/api/admin/categories', adminAuth, async (c) => {
    const body = await c.req.json<{ name: string }>();

    if (!body.name) {
        return c.json({ error: 'Name is required' }, 400);
    }

    const category = await createCategory(c.env.DB, body.name);
    return c.json({ category }, 201);
});

app.put('/api/admin/categories/:id', adminAuth, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json<{ name: string; sort_order?: number }>();

    await updateCategory(c.env.DB, id, body.name, body.sort_order);
    return c.json({ success: true });
});

app.delete('/api/admin/categories/:id', adminAuth, async (c) => {
    const id = c.req.param('id');
    await deleteCategory(c.env.DB, id);
    return c.json({ success: true });
});

// Settings
app.get('/api/admin/settings', adminAuth, async (c) => {
    const settings = await getSettings(c.env.DB);
    return c.json({ settings });
});

app.put('/api/admin/settings', adminAuth, async (c) => {
    const body = await c.req.json<Record<string, string>>();

    for (const [key, value] of Object.entries(body)) {
        await updateSetting(c.env.DB, key, value);
    }

    return c.json({ success: true });
});

// Manual health check trigger (admin only)
app.post('/api/admin/check', adminAuth, async (c) => {
    await runHealthChecks(c.env);
    return c.json({ success: true, message: 'Health checks completed' });
});

// Internal health check endpoint (for cron to call via HTTP - respects Smart Placement)
app.post('/api/internal/check', async (c) => {
    // Verify internal call via header
    const internalKey = c.req.header('X-Internal-Key');
    if (internalKey !== c.env.SITE_TOKEN) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    await runHealthChecks(c.env);
    return c.json({ success: true });
});

// =====================
// Scheduled Handler
// =====================

export default {
    fetch: app.fetch,

    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
        // If WORKER_URL is set, call via HTTP to respect Smart Placement
        // Otherwise fall back to direct execution
        if (env.WORKER_URL) {
            try {
                const response = await fetch(`${env.WORKER_URL}/api/internal/check`, {
                    method: 'POST',
                    headers: {
                        'X-Internal-Key': env.SITE_TOKEN,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    return; // Success via HTTP
                }
                console.log('HTTP check failed, falling back to direct execution');
            } catch (error) {
                console.log('HTTP check error, falling back to direct execution:', error);
            }
        }

        // Direct execution (doesn't respect Smart Placement for cron)
        await runHealthChecks(env);
    }
};
