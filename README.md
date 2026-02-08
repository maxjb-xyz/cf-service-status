# Cloudflare Service Status Page

### A clean, self-hosted status page for your services — built on Cloudflare Workers.

![Dark Theme](https://img.shields.io/badge/Theme-Dark%20%2B%20Light-blue)
![D1 Database](https://img.shields.io/badge/Database-D1-F38020?logo=cloudflare)
![Auto Health Checks](https://img.shields.io/badge/Health%20Checks-Every%20Minute-22c55e)

---

<img width="1484" height="795" alt="ServiceStatusPage" src="https://github.com/user-attachments/assets/59b9b542-b35f-4f85-a38e-c16c0c0a7e93" />

---

## Features

- **Live Status** — Real-time service monitoring with uptime percentages
- **Dark/Light Theme** — Toggle between themes, preference saved
- **Discord Alerts** — Get notified when services go down
- **Admin Panel** — Token-protected service management
- **Auto Checks** — Health checks every 5 minutes (configurable) via cron triggers
- **Responsive** — Works on all devices

## One-Click Deploy

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/maxjb-xyz/cf-service-status)

**What happens automatically:**
1. ✅ D1 database created and linked
2. ✅ Worker deployed with all bindings
3. ✅ Schema initialized on first request
4. ✅ You'll be prompted to set your admin token (SITE_TOKEN)

Just click deploy, enter your admin password, and you're done!

## Local Development

```bash
git clone https://github.com/maxjb-xyz/cf-service-status
cd cf-service-status
npm install
npm run dev
# Open http://localhost:8787
```

The database auto-initializes on first request — no manual setup needed.

## Project Structure

```
├── src/
│   ├── index.ts        # API routes (Hono)
│   ├── db.ts           # Database helpers
│   ├── migrate.ts      # Auto-migration
│   ├── discord.ts      # Notifications
│   └── health-check.ts # Scheduled checks
├── public/             # HTML/CSS source
├── wrangler.toml       # Cloudflare config
└── deploy.json         # Deploy button config
```

## Admin Panel

Access `/admin` and log in with your SITE_TOKEN to:

- Add/edit/delete services to monitor
- Organize services into categories
- Configure site branding
- Set up Discord webhook notifications
- Manually trigger health checks

## Troubleshooting

If you're having issues with request timeouts to your services, your worker may be running from a suboptimal location.
You can change the location by using the "Placement" feature in the Worker settings.
You can set it to either "Smart" or "Region".

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/status` | Get all services with current status |
| `GET /api/history/:id` | Get service history |
| `POST /api/admin/*` | Admin endpoints (requires auth) |
