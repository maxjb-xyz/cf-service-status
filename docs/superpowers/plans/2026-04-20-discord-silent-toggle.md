# Discord Silent Notification Toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global "deliver silently" toggle to admin settings that sets Discord's `SUPPRESS_NOTIFICATIONS` flag (`4096`) on webhook payloads.

**Architecture:** A new `discord_silent` key is stored in the existing D1 `settings` key-value table. It flows from DB → `getSettings` → `runHealthChecks` → `sendDiscordNotification`, which conditionally adds `flags: 4096` to the payload. The admin UI gets a checkbox in the Notifications card that reads/writes the setting alongside the existing webhook URL.

**Tech Stack:** TypeScript, Cloudflare Workers, Hono, D1 (SQLite), Discord Webhook API

---

## File Map

| File | Change |
|------|--------|
| `src/db.ts` | Add `discord_silent: string` to `Settings` interface |
| `src/migrate.ts` | Add `('discord_silent', 'false')` to `DEFAULT_SETTINGS` |
| `src/discord.ts` | Add `flags?: number` to payload interface; add `silent?` param |
| `src/health-check.ts` | Read `settings.discord_silent`, pass `silent` to `sendDiscordNotification` |
| `src/static.ts` | Add checkbox to Notifications card; wire into `loadSettings` and submit handler |

---

## Task 1: Data layer — Settings interface + default value

**Files:**
- Modify: `src/db.ts` (Settings interface)
- Modify: `src/migrate.ts` (DEFAULT_SETTINGS)

- [ ] **Step 1: Add `discord_silent` to the Settings interface in `src/db.ts`**

  Find the `Settings` interface (currently ends at `discord_webhook: string;`) and add the new field:

  ```typescript
  export interface Settings {
      site_title: string;
      site_description: string;
      history_hours: string;
      discord_webhook: string;
      discord_silent: string;
  }
  ```

- [ ] **Step 2: Add the default value in `src/migrate.ts`**

  Find `DEFAULT_SETTINGS`. It currently reads:

  ```typescript
  export const DEFAULT_SETTINGS = `
  INSERT OR IGNORE INTO settings (key, value) VALUES 
    ('site_title', 'Service Status'),
    ('site_description', 'Current status of our services'),
    ('history_hours', '48'),
    ('discord_webhook', '');
  `;
  ```

  Add the new row (note: the semicolon is the SQL statement terminator used by the migration splitter, so add it on the last value line):

  ```typescript
  export const DEFAULT_SETTINGS = `
  INSERT OR IGNORE INTO settings (key, value) VALUES 
    ('site_title', 'Service Status'),
    ('site_description', 'Current status of our services'),
    ('history_hours', '48'),
    ('discord_webhook', ''),
    ('discord_silent', 'false');
  `;
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add src/db.ts src/migrate.ts
  git commit -m "feat: add discord_silent setting to schema and defaults"
  ```

---

## Task 2: Notification layer — `discord.ts` silent flag

**Files:**
- Modify: `src/discord.ts`

- [ ] **Step 1: Add `flags?: number` to `DiscordWebhookPayload`**

  Find the `DiscordWebhookPayload` interface and add the optional `flags` field:

  ```typescript
  export interface DiscordWebhookPayload {
      username?: string;
      avatar_url?: string;
      embeds: DiscordEmbed[];
      flags?: number;
  }
  ```

- [ ] **Step 2: Add `silent` parameter to `sendDiscordNotification`**

  The function signature currently is:

  ```typescript
  export async function sendDiscordNotification(
      webhookUrl: string,
      serviceName: string,
      previousStatus: string | null,
      newStatus: 'operational' | 'degraded' | 'outage',
      details?: { responseTime?: number; statusCode?: number; errorMessage?: string }
  ): Promise<void> {
  ```

  Add `silent` as a final optional parameter:

  ```typescript
  export async function sendDiscordNotification(
      webhookUrl: string,
      serviceName: string,
      previousStatus: string | null,
      newStatus: 'operational' | 'degraded' | 'outage',
      details?: { responseTime?: number; statusCode?: number; errorMessage?: string },
      silent?: boolean
  ): Promise<void> {
  ```

- [ ] **Step 3: Set `flags: 4096` on the payload when `silent` is true**

  Find where `payload` is constructed. Currently:

  ```typescript
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
  ```

  Replace with:

  ```typescript
  const payload: DiscordWebhookPayload = {
      username: 'Status Bot',
      embeds: [{
          title: `${statusEmoji} Service Status Update`,
          description,
          color: STATUS_COLORS[newStatus],
          fields: fields.length > 0 ? fields : undefined,
          timestamp: new Date().toISOString(),
          footer: { text: 'Service Status Monitor' }
      }],
      ...(silent ? { flags: 4096 } : {})
  };
  ```

- [ ] **Step 4: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 5: Commit**

  ```bash
  git add src/discord.ts
  git commit -m "feat: support silent delivery flag in Discord webhook payload"
  ```

---

## Task 3: Health check layer — pass `silent` setting

**Files:**
- Modify: `src/health-check.ts`

- [ ] **Step 1: Read `discord_silent` and pass it to `sendDiscordNotification`**

  Find the block that sends the Discord notification (around line 165):

  ```typescript
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
  ```

  Replace with:

  ```typescript
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
          },
          settings.discord_silent === 'true'
      );
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/health-check.ts
  git commit -m "feat: pass discord_silent setting to notification sender"
  ```

---

## Task 4: Admin UI — checkbox in Notifications card

**Files:**
- Modify: `src/static.ts`

This file embeds the entire admin HTML and JS as template literals. There are three touch points.

- [ ] **Step 1: Add the checkbox to the Notifications card HTML**

  Find this block (around line 361–368):

  ```html
                  <div class="settings-card">
                      <h3 class="settings-card__title">Notifications</h3>
                      <div class="form-group">
                          <label class="form-label" for="discord_webhook">Discord Webhook URL</label>
                          <input type="url" id="discord_webhook" class="form-input"
                              placeholder="https://discord.com/api/webhooks/...">
                      </div>
                  </div>
  ```

  Replace with:

  ```html
                  <div class="settings-card">
                      <h3 class="settings-card__title">Notifications</h3>
                      <div class="form-group">
                          <label class="form-label" for="discord_webhook">Discord Webhook URL</label>
                          <input type="url" id="discord_webhook" class="form-input"
                              placeholder="https://discord.com/api/webhooks/...">
                      </div>
                      <div class="form-group">
                          <label class="form-label" style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                              <input type="checkbox" id="discord_silent">
                              Deliver silently (suppress notifications)
                          </label>
                      </div>
                  </div>
  ```

- [ ] **Step 2: Include `discord_silent` in the settings form submit handler**

  Find the submit handler data object (around line 625–630):

  ```typescript
  const data = {
      site_title: document.getElementById('site_title').value,
      site_description: document.getElementById('site_description').value,
      history_hours: document.getElementById('history_hours').value,
      discord_webhook: document.getElementById('discord_webhook').value
  };
  ```

  Replace with:

  ```typescript
  const data = {
      site_title: document.getElementById('site_title').value,
      site_description: document.getElementById('site_description').value,
      history_hours: document.getElementById('history_hours').value,
      discord_webhook: document.getElementById('discord_webhook').value,
      discord_silent: document.getElementById('discord_silent').checked ? 'true' : 'false'
  };
  ```

- [ ] **Step 3: Set the checkbox state in `loadSettings`**

  Find the `loadSettings` function body (around line 698–702):

  ```typescript
  document.getElementById('site_title').value = data.settings.site_title || '';
  document.getElementById('site_description').value = data.settings.site_description || '';
  document.getElementById('history_hours').value = data.settings.history_hours || '48';
  document.getElementById('discord_webhook').value = data.settings.discord_webhook || '';
  ```

  Replace with:

  ```typescript
  document.getElementById('site_title').value = data.settings.site_title || '';
  document.getElementById('site_description').value = data.settings.site_description || '';
  document.getElementById('history_hours').value = data.settings.history_hours || '48';
  document.getElementById('discord_webhook').value = data.settings.discord_webhook || '';
  document.getElementById('discord_silent').checked = data.settings.discord_silent === 'true';
  ```

- [ ] **Step 4: Verify TypeScript compiles**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 5: Manual verification with `wrangler dev`**

  ```bash
  npm run dev
  ```

  1. Open `http://localhost:8787/admin` and log in.
  2. Go to the **Settings** tab → **Notifications** card.
  3. Confirm the "Deliver silently" checkbox appears below the webhook URL field.
  4. Check the box and click **Save Settings** — confirm toast shows "Settings saved".
  5. Reload the page and re-open Settings — confirm the checkbox is still checked.
  6. Uncheck, save, reload — confirm it stays unchecked.

- [ ] **Step 6: Commit**

  ```bash
  git add src/static.ts
  git commit -m "feat: add discord silent toggle to admin notifications settings"
  ```
