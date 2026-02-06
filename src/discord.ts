export interface DiscordEmbed {
    title: string;
    description?: string;
    color: number;
    fields?: { name: string; value: string; inline?: boolean }[];
    timestamp?: string;
    footer?: { text: string };
}

export interface DiscordWebhookPayload {
    username?: string;
    avatar_url?: string;
    embeds: DiscordEmbed[];
}

// Status colors for Discord embeds
const STATUS_COLORS = {
    operational: 0x10b981, // Green
    degraded: 0xf59e0b,    // Yellow
    outage: 0xef4444,      // Red
};

const STATUS_EMOJIS = {
    operational: '✅',
    degraded: '⚠️',
    outage: '🔴',
};

export async function sendDiscordNotification(
    webhookUrl: string,
    serviceName: string,
    previousStatus: string | null,
    newStatus: 'operational' | 'degraded' | 'outage',
    details?: { responseTime?: number; statusCode?: number; errorMessage?: string }
): Promise<void> {
    if (!webhookUrl) return;

    const statusEmoji = STATUS_EMOJIS[newStatus];
    const statusLabel = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);

    let description = `**${serviceName}** is now **${statusLabel}**`;
    if (previousStatus) {
        description += ` (was ${previousStatus})`;
    }

    const fields: { name: string; value: string; inline?: boolean }[] = [];

    if (details?.responseTime !== undefined) {
        fields.push({ name: 'Response Time', value: `${details.responseTime}ms`, inline: true });
    }
    if (details?.statusCode !== undefined) {
        fields.push({ name: 'Status Code', value: `${details.statusCode}`, inline: true });
    }
    if (details?.errorMessage) {
        fields.push({ name: 'Error', value: details.errorMessage, inline: false });
    }

    const payload: DiscordWebhookPayload = {
        username: 'Status Bot',
        embeds: [{
            title: `${statusEmoji} Service Status Update`,
            description,
            color: STATUS_COLORS[newStatus],
            fields: fields.length > 0 ? fields : undefined,
            timestamp: new Date().toISOString(),
            footer: { text: 'Service Status Monitor' }
        }]
    };

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error('Failed to send Discord notification:', error);
    }
}
