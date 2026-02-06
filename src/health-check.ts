import {
    getServices,
    getLatestStatuses,
    addStatusHistory,
    getSettings,
    cleanupOldHistory,
    StatusHistory
} from './db';
import { sendDiscordNotification } from './discord';

export interface Env {
    DB: D1Database;
    SITE_TOKEN: string;
}

interface CheckResult {
    status: 'operational' | 'degraded' | 'outage';
    responseTime: number;
    statusCode: number | null;
    errorMessage: string | null;
}

async function checkService(
    url: string,
    expectedStatus: number,
    timeout: number
): Promise<CheckResult> {
    const startTime = Date.now();

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'User-Agent': 'ServiceStatusMonitor/1.0'
            }
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        // Determine status based on response
        if (response.status === expectedStatus) {
            // Check if response time is too slow (over 3 seconds = degraded)
            if (responseTime > 3000) {
                return {
                    status: 'degraded',
                    responseTime,
                    statusCode: response.status,
                    errorMessage: 'Slow response time'
                };
            }
            return {
                status: 'operational',
                responseTime,
                statusCode: response.status,
                errorMessage: null
            };
        } else if (response.status >= 500) {
            return {
                status: 'outage',
                responseTime,
                statusCode: response.status,
                errorMessage: `Server error: ${response.status}`
            };
        } else {
            return {
                status: 'degraded',
                responseTime,
                statusCode: response.status,
                errorMessage: `Unexpected status: ${response.status} (expected ${expectedStatus})`
            };
        }
    } catch (error) {
        const responseTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return {
            status: 'outage',
            responseTime,
            statusCode: null,
            errorMessage: errorMessage.includes('abort') ? 'Request timeout' : errorMessage
        };
    }
}

export async function runHealthChecks(env: Env): Promise<void> {
    const db = env.DB;

    // Get all services and their latest statuses
    const [services, latestStatuses, settings] = await Promise.all([
        getServices(db),
        getLatestStatuses(db),
        getSettings(db)
    ]);

    if (services.length === 0) {
        console.log('No services to check');
        return;
    }

    // Check each service
    for (const service of services) {
        const result = await checkService(service.url, service.expected_status, service.timeout);

        // Get previous status
        const previousHistory = latestStatuses.get(service.id);
        const previousStatus = previousHistory?.status ?? null;

        // Record the new status
        await addStatusHistory(
            db,
            service.id,
            result.status,
            result.responseTime,
            result.statusCode,
            result.errorMessage
        );

        // Send Discord notification if status changed
        if (previousStatus !== result.status && settings.discord_webhook) {
            await sendDiscordNotification(
                settings.discord_webhook,
                service.name,
                previousStatus,
                result.status,
                {
                    responseTime: result.responseTime,
                    statusCode: result.statusCode ?? undefined,
                    errorMessage: result.errorMessage ?? undefined
                }
            );
        }

        console.log(`Checked ${service.name}: ${result.status} (${result.responseTime}ms)`);
    }

    // Cleanup old history (keep 90 days)
    await cleanupOldHistory(db, 90);
}
