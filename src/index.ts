import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
    getServices,
    getCategories,
    getSettings,
    getLatestStatuses,
    getHourlyHistory,
    calculateUptime,
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

// Auto-initialize database on first request
app.use('*', async (c, next) => {
    await initializeDatabase(c.env.DB);
    await next();
});

// Enable CORS for API routes
app.use('/api/*', cors());

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

    // Calculate uptime for each service using hourly data
    const historyHours = parseInt(settings.history_hours) || 48;
    const uptimes: Record<string, number> = {};
    const histories: Record<string, HourlyStatus[]> = {};

    await Promise.all(services.map(async (service) => {
        uptimes[service.id] = await calculateUptime(db, service.id, historyHours);
        histories[service.id] = await getHourlyHistory(db, service.id, historyHours);
    }));

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
    const hours = parseInt(c.req.query('hours') || '48');

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
    const body = await c.req.json<{ token: string }>();

    if (body.token === c.env.SITE_TOKEN) {
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

    const service = await createService(c.env.DB, body);
    return c.json({ service }, 201);
});

app.put('/api/admin/services/:id', adminAuth, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json<Partial<Service>>();

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
