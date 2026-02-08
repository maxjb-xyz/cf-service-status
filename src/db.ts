import { D1Database } from '@cloudflare/workers-types';

export interface Category {
    id: string;
    name: string;
    sort_order: number;
}

export interface Service {
    id: string;
    name: string;
    url: string;
    category_id: string | null;
    check_interval: number;
    timeout: number;
    expected_status: number;
    sort_order: number;
    created_at: string;
}

export interface StatusHistory {
    id: string;
    service_id: string;
    status: 'operational' | 'degraded' | 'outage';
    response_time: number | null;
    status_code: number | null;
    error_message: string | null;
    check_location: string | null;
    checked_at: string;
}

export interface Settings {
    site_title: string;
    site_description: string;
    history_hours: string;
    discord_webhook: string;
}

export interface HourlyStatus {
    id: string;
    service_id: string;
    hour_start: string;
    status: 'operational' | 'degraded' | 'outage';
    avg_response_time: number | null;
    check_count: number;
    check_location: string | null;
}

// Generate a simple unique ID
export function generateId(): string {
    return crypto.randomUUID();
}

// Get all settings as an object
export async function getSettings(db: D1Database): Promise<Settings> {
    const result = await db.prepare('SELECT key, value FROM settings').all();
    const settings: Record<string, string> = {};
    for (const row of result.results as { key: string; value: string }[]) {
        settings[row.key] = row.value;
    }
    return settings as unknown as Settings;
}

// Update a setting
export async function updateSetting(db: D1Database, key: string, value: string): Promise<void> {
    await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
        .bind(key, value)
        .run();
}

// Get all categories
export async function getCategories(db: D1Database): Promise<Category[]> {
    const result = await db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
    return result.results as unknown as Category[];
}

// Create a category
export async function createCategory(db: D1Database, name: string): Promise<Category> {
    const id = generateId();
    const maxOrder = await db.prepare('SELECT MAX(sort_order) as max FROM categories').first<{ max: number | null }>();
    const sortOrder = (maxOrder?.max ?? -1) + 1;
    await db.prepare('INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)')
        .bind(id, name, sortOrder)
        .run();
    return { id, name, sort_order: sortOrder };
}

// Update a category
export async function updateCategory(db: D1Database, id: string, name: string, sortOrder?: number): Promise<void> {
    if (sortOrder !== undefined) {
        await db.prepare('UPDATE categories SET name = ?, sort_order = ? WHERE id = ?')
            .bind(name, sortOrder, id)
            .run();
    } else {
        await db.prepare('UPDATE categories SET name = ? WHERE id = ?')
            .bind(name, id)
            .run();
    }
}

// Delete a category
export async function deleteCategory(db: D1Database, id: string): Promise<void> {
    await db.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
}

// Get all services
export async function getServices(db: D1Database): Promise<Service[]> {
    const result = await db.prepare('SELECT * FROM services ORDER BY sort_order, name').all();
    return result.results as unknown as Service[];
}

// Get a single service
export async function getService(db: D1Database, id: string): Promise<Service | null> {
    const result = await db.prepare('SELECT * FROM services WHERE id = ?').bind(id).first();
    return result as Service | null;
}

// Create a service
export async function createService(
    db: D1Database,
    data: { name: string; url: string; category_id?: string | null; expected_status?: number }
): Promise<Service> {
    const id = generateId();
    const maxOrder = await db.prepare('SELECT MAX(sort_order) as max FROM services').first<{ max: number | null }>();
    const sortOrder = (maxOrder?.max ?? -1) + 1;
    const now = new Date().toISOString();

    await db.prepare(`
    INSERT INTO services (id, name, url, category_id, expected_status, sort_order, created_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
        .bind(id, data.name, data.url, data.category_id ?? null, data.expected_status ?? 200, sortOrder, now)
        .run();

    return {
        id,
        name: data.name,
        url: data.url,
        category_id: data.category_id ?? null,
        check_interval: 60,
        timeout: 10000,
        expected_status: data.expected_status ?? 200,
        sort_order: sortOrder,
        created_at: now
    };
}

// Update a service
export async function updateService(
    db: D1Database,
    id: string,
    data: Partial<Omit<Service, 'id' | 'created_at'>>
): Promise<void> {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.url !== undefined) { fields.push('url = ?'); values.push(data.url); }
    if (data.category_id !== undefined) { fields.push('category_id = ?'); values.push(data.category_id); }
    if (data.check_interval !== undefined) { fields.push('check_interval = ?'); values.push(data.check_interval); }
    if (data.timeout !== undefined) { fields.push('timeout = ?'); values.push(data.timeout); }
    if (data.expected_status !== undefined) { fields.push('expected_status = ?'); values.push(data.expected_status); }
    if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }

    if (fields.length > 0) {
        values.push(id);
        await db.prepare(`UPDATE services SET ${fields.join(', ')} WHERE id = ?`)
            .bind(...values)
            .run();
    }
}

// Delete a service
export async function deleteService(db: D1Database, id: string): Promise<void> {
    await db.prepare('DELETE FROM services WHERE id = ?').bind(id).run();
}

// Add status history record
export async function addStatusHistory(
    db: D1Database,
    serviceId: string,
    status: 'operational' | 'degraded' | 'outage',
    responseTime: number | null,
    statusCode: number | null,
    errorMessage: string | null,
    checkLocation: string | null = null
): Promise<void> {
    const id = generateId();
    const now = new Date().toISOString();
    await db.prepare(`
    INSERT INTO status_history (id, service_id, status, response_time, status_code, error_message, check_location, checked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
        .bind(id, serviceId, status, responseTime, statusCode, errorMessage, checkLocation, now)
        .run();
}

// Get status history for a service
export async function getStatusHistory(
    db: D1Database,
    serviceId: string,
    days: number = 7
): Promise<StatusHistory[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const result = await db.prepare(`
    SELECT * FROM status_history 
    WHERE service_id = ? AND checked_at >= ?
    ORDER BY checked_at DESC
  `)
        .bind(serviceId, since)
        .all();
    return result.results as unknown as StatusHistory[];
}

// Get the latest status for each service
export async function getLatestStatuses(db: D1Database): Promise<Map<string, StatusHistory>> {
    const result = await db.prepare(`
    SELECT sh.* FROM status_history sh
    INNER JOIN (
      SELECT service_id, MAX(checked_at) as max_checked_at
      FROM status_history
      GROUP BY service_id
    ) latest ON sh.service_id = latest.service_id AND sh.checked_at = latest.max_checked_at
  `).all();

    const map = new Map<string, StatusHistory>();
    for (const row of result.results as unknown as StatusHistory[]) {
        map.set(row.service_id, row);
    }
    return map;
}

// Calculate uptime percentage from hourly data (much more efficient)
export async function calculateUptime(db: D1Database, serviceId: string, hours: number = 48): Promise<number> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const result = await db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'operational' THEN 1 ELSE 0 END) as operational
    FROM hourly_status
    WHERE service_id = ? AND hour_start >= ?
  `)
        .bind(serviceId, since)
        .first<{ total: number; operational: number }>();

    if (!result || result.total === 0) return 100;
    return Math.round((result.operational / result.total) * 10000) / 100;
}

// Get hourly status history for the status page (48 rows instead of 2880)
export async function getHourlyHistory(
    db: D1Database,
    serviceId: string,
    hours: number = 48
): Promise<HourlyStatus[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const result = await db.prepare(`
    SELECT * FROM hourly_status 
    WHERE service_id = ? AND hour_start >= ?
    ORDER BY hour_start ASC
  `)
        .bind(serviceId, since)
        .all();
    return result.results as unknown as HourlyStatus[];
}

// Upsert hourly status - worst status wins
export async function upsertHourlyStatus(
    db: D1Database,
    serviceId: string,
    status: 'operational' | 'degraded' | 'outage',
    responseTime: number | null,
    checkLocation: string | null
): Promise<void> {
    const now = new Date();
    // Round down to hour start
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0).toISOString();

    // Priority: outage > degraded > operational
    const statusPriority: Record<string, number> = { operational: 1, degraded: 2, outage: 3 };

    // Try to get existing record
    const existing = await db.prepare(`
        SELECT id, status, avg_response_time, check_count FROM hourly_status 
        WHERE service_id = ? AND hour_start = ?
    `)
        .bind(serviceId, hourStart)
        .first<{ id: string; status: string; avg_response_time: number | null; check_count: number }>();

    if (existing) {
        // Update existing - keep worst status, update running average
        const newStatus = statusPriority[status] > statusPriority[existing.status] ? status : existing.status;
        const newCount = existing.check_count + 1;
        const newAvg = responseTime !== null
            ? Math.round(((existing.avg_response_time || 0) * existing.check_count + responseTime) / newCount)
            : existing.avg_response_time;

        await db.prepare(`
            UPDATE hourly_status 
            SET status = ?, avg_response_time = ?, check_count = ?, check_location = ?
            WHERE id = ?
        `)
            .bind(newStatus, newAvg, newCount, checkLocation, existing.id)
            .run();
    } else {
        // Insert new record
        const id = generateId();
        await db.prepare(`
            INSERT INTO hourly_status (id, service_id, hour_start, status, avg_response_time, check_count, check_location)
            VALUES (?, ?, ?, ?, ?, 1, ?)
        `)
            .bind(id, serviceId, hourStart, status, responseTime, checkLocation)
            .run();
    }
}

// Clean up old history records (raw data kept for 24 hours, hourly for 90 days)
export async function cleanupOldHistory(db: D1Database): Promise<void> {
    const rawCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const hourlyCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    await db.prepare('DELETE FROM status_history WHERE checked_at < ?').bind(rawCutoff).run();
    await db.prepare('DELETE FROM hourly_status WHERE hour_start < ?').bind(hourlyCutoff).run();
}
