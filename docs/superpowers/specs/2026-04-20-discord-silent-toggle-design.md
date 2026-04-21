# Discord Silent Notification Toggle — Design Spec

**Date:** 2026-04-20  
**Status:** Approved

## Overview

Add a global toggle in the admin settings panel that controls whether Discord webhook notifications are delivered silently (suppressing the ping/sound) or normally. When enabled, the Discord payload includes `flags: 4096` (`SUPPRESS_NOTIFICATIONS`), which prevents Discord from playing a sound or showing an unread badge, while still posting the message visibly.

## Scope

- Global toggle — applies to all Discord notifications regardless of severity.
- No per-service or per-status-type granularity.

## Changes

### `src/db.ts`

- Add `discord_silent: string` to the `Settings` interface.
- Valid values: `'true'` or `'false'`.

### `src/migrate.ts`

- Add `('discord_silent', 'false')` to `DEFAULT_SETTINGS`.
- Uses `INSERT OR IGNORE` so existing installs are unaffected until first save.

### `src/discord.ts`

- Add optional `silent?: boolean` parameter to `sendDiscordNotification`.
- When `silent` is `true`, add `flags: 4096` to the `DiscordWebhookPayload`.
- The `DiscordWebhookPayload` interface gains an optional `flags?: number` field.

### `src/health-check.ts`

- Read `settings.discord_silent` from the already-fetched settings object.
- Pass `silent: settings.discord_silent === 'true'` to `sendDiscordNotification`.

### `src/static.ts` (Admin UI)

- In the Notifications settings card, add a checkbox input:
  - `id="discord_silent"`, label: "Deliver silently (suppress notifications)"
  - Placed below the Discord Webhook URL field.
- `loadSettings`: set `discord_silent` checkbox `checked` state from loaded settings.
- `settings-form` submit handler: include `discord_silent: checked ? 'true' : 'false'` in the PUT body.

## Data Flow

```
Admin toggles checkbox → PUT /api/admin/settings { discord_silent: 'true' }
→ updateSetting(db, 'discord_silent', 'true') upserts into settings table

Health check runs → getSettings(db) includes discord_silent
→ sendDiscordNotification(..., { silent: true })
→ POST webhook payload includes flags: 4096
```

## No Migration Required

The `DEFAULT_SETTINGS` `INSERT OR IGNORE` handles new installs. Existing installs default to `'false'` (audible) on first save, which is backwards-compatible.

## Discord API Reference

`SUPPRESS_NOTIFICATIONS` flag value: `4096` (`1 << 12`). Documented in the Discord developer portal under Message Flags. Suppresses push and desktop notifications without hiding the message.
