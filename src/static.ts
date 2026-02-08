// Auto-generated from public folder - do not edit directly
// Run `npm run build:static` to regenerate

export const indexHtml = `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Status</title>
  <meta name="description" content="Current status of our services">
  <link rel="icon"
    href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%2322c55e'/><path d='M30 50 L45 65 L70 35' stroke='white' stroke-width='8' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>">
  <link rel="stylesheet" href="/styles.css">
</head>

<body>
  <div class="container">
    <header class="header">
      <div class="header__logo" id="site-title">Service Status</div>
      <div class="header__actions">
        <button class="theme-toggle" id="theme-toggle" title="Toggle theme">
          <svg id="theme-icon-dark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
          <svg id="theme-icon-light" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" style="display:none">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        </button>
        <a href="/admin" class="header__admin-link">Admin</a>
      </div>
    </header>

    <div id="status-banner"></div>
    <div id="services-container">
      <div class="loading">
        <div class="loading__spinner"></div>
        <p>Loading status...</p>
      </div>
    </div>

    <footer class="footer">
      <p><span id="last-updated">-</span></p>
    </footer>
  </div>

  <script>
    // Theme handling
    const themeToggle = document.getElementById('theme-toggle');
    const darkIcon = document.getElementById('theme-icon-dark');
    const lightIcon = document.getElementById('theme-icon-light');

    function setTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      if (theme === 'light') {
        darkIcon.style.display = 'none';
        lightIcon.style.display = 'block';
      } else {
        darkIcon.style.display = 'block';
        lightIcon.style.display = 'none';
      }
    }

    // Load saved theme or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);

    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      setTheme(current === 'light' ? 'dark' : 'light');
    });

    const STATUS_LABELS = {
      operational: 'All Systems Operational',
      degraded: 'Partial Outage',
      outage: 'Major Outage'
    };

    // Common CF datacenter airport codes to city names
    const CF_LOCATIONS = {
      'MIA': 'Miami', 'ATL': 'Atlanta', 'DFW': 'Dallas', 'IAD': 'Ashburn',
      'EWR': 'Newark', 'ORD': 'Chicago', 'LAX': 'Los Angeles', 'SJC': 'San Jose',
      'SEA': 'Seattle', 'DEN': 'Denver', 'PHX': 'Phoenix', 'IAH': 'Houston',
      'BOS': 'Boston', 'LHR': 'London', 'CDG': 'Paris', 'FRA': 'Frankfurt',
      'AMS': 'Amsterdam', 'SIN': 'Singapore', 'HKG': 'Hong Kong', 'NRT': 'Tokyo',
      'SYD': 'Sydney', 'GRU': 'São Paulo', 'YYZ': 'Toronto', 'MEX': 'Mexico City'
    };

    function getLocationName(code) {
      if (!code) return null;
      return CF_LOCATIONS[code] || code;
    }

    async function loadStatus() {
      try {
        const response = await fetch('/api/status');
        const data = await response.json();
        renderPage(data);
      } catch (error) {
        console.error('Failed to load status:', error);
        document.getElementById('services-container').innerHTML = \`
          <div class="empty-state">
            <div class="empty-state__icon">⚠️</div>
            <h3 class="empty-state__title">Unable to load status</h3>
            <p class="empty-state__description">Please try again later.</p>
          </div>
        \`;
      }
    }

    function renderPage(data) {
      // Update title
      document.getElementById('site-title').textContent = data.settings.site_title;
      document.title = data.settings.site_title;

      // Render overall status
      const statusIcon = data.overall_status === 'operational' ? '✓' :
        data.overall_status === 'degraded' ? '!' : '✕';
      const bannerHtml = \`
        <div class="overall-status">
          <div class="overall-status__icon overall-status__icon--\${data.overall_status}">
            \${statusIcon}
          </div>
          <h1 class="overall-status__text">\${STATUS_LABELS[data.overall_status]}</h1>
          <p class="overall-status__description">\${data.settings.site_description}</p>
        </div>
      \`;
      document.getElementById('status-banner').innerHTML = bannerHtml;

      // Render services
      const container = document.getElementById('services-container');

      if (data.categories.length === 0) {
        container.innerHTML = \`
          <div class="empty-state">
            <div class="empty-state__icon">📊</div>
            <h3 class="empty-state__title">No services configured</h3>
            <p class="empty-state__description">Add services in the admin panel to start monitoring.</p>
          </div>
        \`;
        return;
      }

      let html = '<div class="section-header"><h2 class="section-title">Live Status</h2></div>';

      for (const categoryData of data.categories) {
        const categoryName = categoryData.category?.name || '';
        html += \`<section class="category">\`;
        if (categoryName) {
          html += \`<h3 class="category__header">\${escapeHtml(categoryName)}</h3>\`;
        }
        html += categoryData.services.map(s => renderServiceCard(s, data.settings.history_hours)).join('');
        html += \`</section>\`;
      }
      container.innerHTML = html;

      // Update footer with last check info
      let footerText = \`Last updated: \${new Date(data.last_updated).toLocaleString()}\`;
      if (data.last_check?.time) {
        const checkTime = new Date(data.last_check.time).toLocaleTimeString();
        const locationName = getLocationName(data.last_check.location);
        footerText = \`Last checked: \${checkTime}\`;
        if (locationName) {
          footerText += \` (from \${locationName})\`;
        }
      }
      document.getElementById('last-updated').textContent = footerText;
    }

    function renderServiceCard(serviceData, historyHours) {
      const { service, status, uptime, history } = serviceData;
      const currentStatus = status?.status || 'unknown';
      const statusLabel = currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1);
      const historyBar = generateHistoryBar(history, historyHours);
      const statusClass = currentStatus !== 'operational' ? \`service-card__status--\${currentStatus}\` : '';

      return \`
        <article class="service-card">
          <div class="service-card__header">
            <div class="service-card__info">
              <div class="service-card__icon service-card__icon--\${currentStatus}">
                \${currentStatus === 'operational' ? '✓' : currentStatus === 'degraded' ? '!' : '✕'}
              </div>
              <div class="service-card__details">
                <div class="service-card__name">\${escapeHtml(service.name)}</div>
                <div class="service-card__status \${statusClass}">\${statusLabel}</div>
              </div>
            </div>
            <div class="service-card__uptime">
              <div class="service-card__uptime-value">\${uptime.toFixed(2)}%</div>
              <div class="service-card__uptime-label">Uptime</div>
            </div>
          </div>
          <div class="history-bar">\${historyBar}</div>
        </article>
      \`;
    }

    function generateHistoryBar(history, hours = 48) {
      const now = new Date();
      const segments = [];

      // Create a map of hour_start -> status from the hourly data
      const hourlyStatusMap = new Map();
      for (const h of history) {
        // hour_start is the key from HourlyStatus
        const hourKey = new Date(h.hour_start).getTime();
        hourlyStatusMap.set(hourKey, h.status);
      }

      for (let i = hours - 1; i >= 0; i--) {
        const hourStart = new Date(now);
        hourStart.setHours(hourStart.getHours() - i, 0, 0, 0);
        const hourKey = hourStart.getTime();

        // Look up the pre-aggregated status for this hour
        const status = hourlyStatusMap.get(hourKey) || 'unknown';

        const timeStr = hourStart.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const tooltip = \`\${timeStr}: \${status.charAt(0).toUpperCase() + status.slice(1)}\`;
        segments.push(\`<div class="history-bar__segment history-bar__segment--\${status}" data-tooltip="\${tooltip}"></div>\`);
      }

      return segments.join('');
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    loadStatus();
    setInterval(loadStatus, 60000);
  </script>
</body>

</html>`;

export const adminHtml = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin - Service Status</title>
    <link rel="icon"
        href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%2322c55e'/><path d='M30 50 L45 65 L70 35' stroke='white' stroke-width='8' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>">
    <link rel="stylesheet" href="/styles.css">
</head>

<body>
    <div class="container admin-container">
        <!-- Login Form -->
        <div id="login-view">
            <div class="login-card">
                <h1 class="login-card__title">Admin Login</h1>
                <p class="login-card__subtitle">Enter your site token to continue</p>
                <form id="login-form">
                    <div class="form-group">
                        <label class="form-label" for="token">Site Token</label>
                        <input type="password" id="token" class="form-input" placeholder="Enter your token" required>
                    </div>
                    <button type="submit" class="btn btn--primary btn--full">Login</button>
                </form>
                <p style="margin-top: 1.5rem; text-align: center;">
                    <a href="/" style="color: var(--text-muted); text-decoration: none;">← Back to Status Page</a>
                </p>
            </div>
        </div>

        <!-- Admin Dashboard -->
        <div id="admin-view" style="display: none;">
            <header class="admin-header">
                <h1 class="admin-header__title">Admin Dashboard</h1>
                <div class="admin-header__actions">
                    <button class="theme-toggle" id="theme-toggle" title="Toggle theme">
                        <svg id="theme-icon-dark" width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                        </svg>
                        <svg id="theme-icon-light" width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" style="display:none">
                            <circle cx="12" cy="12" r="5"></circle>
                            <line x1="12" y1="1" x2="12" y2="3"></line>
                            <line x1="12" y1="21" x2="12" y2="23"></line>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                            <line x1="1" y1="12" x2="3" y2="12"></line>
                            <line x1="21" y1="12" x2="23" y2="12"></line>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                        </svg>
                    </button>
                    <button class="btn btn--secondary" id="run-checks-btn">Run Checks</button>
                    <button class="btn btn--secondary" id="logout-btn">Logout</button>
                </div>
            </header>

            <nav class="tabs">
                <button class="tab tab--active" data-tab="services">Services</button>
                <button class="tab" data-tab="categories">Categories</button>
                <button class="tab" data-tab="settings">Settings</button>
            </nav>

            <!-- Services Tab -->
            <section id="tab-services" class="tab-content">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h2 style="font-size: 1.125rem; font-weight: 600;">Monitored Services</h2>
                    <button class="btn btn--primary" id="add-service-btn">+ Add Service</button>
                </div>
                <div id="services-table"></div>
            </section>

            <!-- Categories Tab -->
            <section id="tab-categories" class="tab-content" style="display: none;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h2 style="font-size: 1.125rem; font-weight: 600;">Categories</h2>
                    <button class="btn btn--primary" id="add-category-btn">+ Add Category</button>
                </div>
                <div id="categories-table"></div>
            </section>

            <!-- Settings Tab -->
            <section id="tab-settings" class="tab-content" style="display: none;">
                <h2 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem;">Site Settings</h2>
                <form id="settings-form" class="settings-grid">
                    <div class="settings-card">
                        <h3 class="settings-card__title">Branding</h3>
                        <div class="form-group">
                            <label class="form-label" for="site_title">Site Title</label>
                            <input type="text" id="site_title" class="form-input" placeholder="Service Status">
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="site_description">Description</label>
                            <input type="text" id="site_description" class="form-input"
                                placeholder="Current status of our services">
                        </div>
                    </div>
                    <div class="settings-card">
                        <h3 class="settings-card__title">History</h3>
                        <div class="form-group">
                            <label class="form-label" for="history_hours">Hours to Display</label>
                            <input type="number" id="history_hours" class="form-input" min="1" max="168"
                                placeholder="48">
                            <small style="color: var(--text-muted); margin-top: 0.25rem; display: block;">Each history
                                bar represents 1 hour</small>
                        </div>
                    </div>
                    <div class="settings-card">
                        <h3 class="settings-card__title">Notifications</h3>
                        <div class="form-group">
                            <label class="form-label" for="discord_webhook">Discord Webhook URL</label>
                            <input type="url" id="discord_webhook" class="form-input"
                                placeholder="https://discord.com/api/webhooks/...">
                        </div>
                    </div>
                    <button type="submit" class="btn btn--primary">Save Settings</button>
                </form>
            </section>
        </div>

        <!-- Service Modal -->
        <div class="modal-overlay" id="service-modal">
            <div class="modal">
                <div class="modal__header">
                    <h3 class="modal__title" id="service-modal-title">Add Service</h3>
                    <button class="modal__close" data-close-modal>&times;</button>
                </div>
                <form id="service-form">
                    <input type="hidden" id="service-id">
                    <div class="form-group">
                        <label class="form-label" for="service-name">Name</label>
                        <input type="text" id="service-name" class="form-input" placeholder="API Server" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="service-url">URL to Monitor</label>
                        <input type="url" id="service-url" class="form-input"
                            placeholder="https://api.example.com/health" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="service-category">Category</label>
                        <select id="service-category" class="form-input form-select">
                            <option value="">No Category</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="service-expected-status">Expected Status Code</label>
                        <input type="number" id="service-expected-status" class="form-input" value="200" min="100"
                            max="599">
                    </div>
                    <div class="modal__footer">
                        <button type="button" class="btn btn--secondary" data-close-modal>Cancel</button>
                        <button type="submit" class="btn btn--primary">Save</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Category Modal -->
        <div class="modal-overlay" id="category-modal">
            <div class="modal">
                <div class="modal__header">
                    <h3 class="modal__title" id="category-modal-title">Add Category</h3>
                    <button class="modal__close" data-close-modal>&times;</button>
                </div>
                <form id="category-form">
                    <input type="hidden" id="category-id">
                    <div class="form-group">
                        <label class="form-label" for="category-name">Name</label>
                        <input type="text" id="category-name" class="form-input" placeholder="Core Services" required>
                    </div>
                    <div class="modal__footer">
                        <button type="button" class="btn btn--secondary" data-close-modal>Cancel</button>
                        <button type="submit" class="btn btn--primary">Save</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Toast Container -->
        <div class="toast-container" id="toast-container"></div>
    </div>

    <script>
        // Theme handling
        const themeToggle = document.getElementById('theme-toggle');
        const darkIcon = document.getElementById('theme-icon-dark');
        const lightIcon = document.getElementById('theme-icon-light');

        function setTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            if (theme === 'light') {
                darkIcon.style.display = 'none';
                lightIcon.style.display = 'block';
            } else {
                darkIcon.style.display = 'block';
                lightIcon.style.display = 'none';
            }
        }

        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);

        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            setTheme(current === 'light' ? 'dark' : 'light');
        });

        // State
        let token = localStorage.getItem('admin_token') || '';
        let services = [];
        let categories = [];

        // DOM elements
        const loginView = document.getElementById('login-view');
        const adminView = document.getElementById('admin-view');

        // Check if already logged in
        if (token) {
            checkToken().then(valid => {
                if (valid) showAdminView();
                else localStorage.removeItem('admin_token');
            });
        }

        // Login form
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            token = document.getElementById('token').value;

            try {
                const response = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });

                if (response.ok) {
                    localStorage.setItem('admin_token', token);
                    showAdminView();
                } else {
                    showToast('Invalid token', 'error');
                }
            } catch (error) {
                showToast('Login failed', 'error');
            }
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            token = '';
            localStorage.removeItem('admin_token');
            loginView.style.display = 'block';
            adminView.style.display = 'none';
        });

        // Run health checks
        document.getElementById('run-checks-btn').addEventListener('click', async () => {
            try {
                await apiRequest('/api/admin/check', 'POST');
                showToast('Health checks completed', 'success');
                loadServices();
            } catch (error) {
                showToast('Failed to run health checks', 'error');
            }
        });

        // Tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('tab--active'));
                document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
                tab.classList.add('tab--active');
                document.getElementById(\`tab-\${tab.dataset.tab}\`).style.display = 'block';
            });
        });

        // Modal handling
        function openModal(modalId) {
            document.getElementById(modalId).classList.add('modal-overlay--visible');
        }

        function closeModal(modalId) {
            document.getElementById(modalId).classList.remove('modal-overlay--visible');
        }

        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('modal-overlay--visible'));
            });
        });

        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.classList.remove('modal-overlay--visible');
            });
        });

        // Add service button
        document.getElementById('add-service-btn').addEventListener('click', () => {
            document.getElementById('service-modal-title').textContent = 'Add Service';
            document.getElementById('service-form').reset();
            document.getElementById('service-id').value = '';
            openModal('service-modal');
        });

        // Add category button
        document.getElementById('add-category-btn').addEventListener('click', () => {
            document.getElementById('category-modal-title').textContent = 'Add Category';
            document.getElementById('category-form').reset();
            document.getElementById('category-id').value = '';
            openModal('category-modal');
        });

        // Service form
        document.getElementById('service-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('service-id').value;
            const data = {
                name: document.getElementById('service-name').value,
                url: document.getElementById('service-url').value,
                category_id: document.getElementById('service-category').value || null,
                expected_status: parseInt(document.getElementById('service-expected-status').value)
            };

            try {
                if (id) {
                    await apiRequest(\`/api/admin/services/\${id}\`, 'PUT', data);
                    showToast('Service updated', 'success');
                } else {
                    await apiRequest('/api/admin/services', 'POST', data);
                    showToast('Service created', 'success');
                }
                closeModal('service-modal');
                loadServices();
            } catch (error) {
                showToast('Failed to save service', 'error');
            }
        });

        // Category form
        document.getElementById('category-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('category-id').value;
            const data = { name: document.getElementById('category-name').value };

            try {
                if (id) {
                    await apiRequest(\`/api/admin/categories/\${id}\`, 'PUT', data);
                    showToast('Category updated', 'success');
                } else {
                    await apiRequest('/api/admin/categories', 'POST', data);
                    showToast('Category created', 'success');
                }
                closeModal('category-modal');
                loadCategories();
                loadServices();
            } catch (error) {
                showToast('Failed to save category', 'error');
            }
        });

        // Settings form
        document.getElementById('settings-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                site_title: document.getElementById('site_title').value,
                site_description: document.getElementById('site_description').value,
                history_hours: document.getElementById('history_hours').value,
                discord_webhook: document.getElementById('discord_webhook').value
            };

            try {
                await apiRequest('/api/admin/settings', 'PUT', data);
                showToast('Settings saved', 'success');
            } catch (error) {
                showToast('Failed to save settings', 'error');
            }
        });

        // API helper
        async function apiRequest(url, method = 'GET', body = null) {
            const options = {
                method,
                headers: {
                    'Authorization': \`Bearer \${token}\`,
                    'Content-Type': 'application/json'
                }
            };
            if (body) options.body = JSON.stringify(body);

            const response = await fetch(url, options);
            if (!response.ok) throw new Error('Request failed');
            return response.json();
        }

        async function checkToken() {
            try {
                const response = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });
                return response.ok;
            } catch {
                return false;
            }
        }

        async function showAdminView() {
            loginView.style.display = 'none';
            adminView.style.display = 'block';
            await Promise.all([loadServices(), loadCategories(), loadSettings()]);
        }

        async function loadServices() {
            try {
                const data = await apiRequest('/api/admin/services');
                services = data.services;
                renderServicesTable();
            } catch (error) {
                showToast('Failed to load services', 'error');
            }
        }

        async function loadCategories() {
            try {
                const data = await apiRequest('/api/admin/categories');
                categories = data.categories;
                renderCategoriesTable();
                updateCategorySelect();
            } catch (error) {
                showToast('Failed to load categories', 'error');
            }
        }

        async function loadSettings() {
            try {
                const data = await apiRequest('/api/admin/settings');
                document.getElementById('site_title').value = data.settings.site_title || '';
                document.getElementById('site_description').value = data.settings.site_description || '';
                document.getElementById('history_hours').value = data.settings.history_hours || '48';
                document.getElementById('discord_webhook').value = data.settings.discord_webhook || '';
            } catch (error) {
                showToast('Failed to load settings', 'error');
            }
        }

        function renderServicesTable() {
            const container = document.getElementById('services-table');
            if (services.length === 0) {
                container.innerHTML = \`
          <div class="empty-state">
            <div class="empty-state__icon">🔧</div>
            <h3 class="empty-state__title">No services yet</h3>
            <p class="empty-state__description">Add your first service to start monitoring.</p>
          </div>
        \`;
                return;
            }

            container.innerHTML = \`
        <div class="data-table">
          <div class="data-table__header">
            <span>Name</span>
            <span>URL</span>
            <span>Category</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          \${services.map(s => {
                const category = categories.find(c => c.id === s.category_id);
                return \`
              <div class="data-table__row">
                <span>\${escapeHtml(s.name)}</span>
                <span style="color: var(--text-muted); font-size: 0.875rem; overflow: hidden; text-overflow: ellipsis;">\${escapeHtml(s.url)}</span>
                <span>\${category ? escapeHtml(category.name) : '-'}</span>
                <span>Expected: \${s.expected_status}</span>
                <div class="data-table__actions">
                  <button class="btn btn--secondary btn--sm" onclick="editService('\${s.id}')">Edit</button>
                  <button class="btn btn--danger btn--sm" onclick="deleteService('\${s.id}')">Delete</button>
                </div>
              </div>
            \`;
            }).join('')}
        </div>
      \`;
        }

        function renderCategoriesTable() {
            const container = document.getElementById('categories-table');
            if (categories.length === 0) {
                container.innerHTML = \`
          <div class="empty-state">
            <div class="empty-state__icon">📁</div>
            <h3 class="empty-state__title">No categories yet</h3>
            <p class="empty-state__description">Create categories to organize your services.</p>
          </div>
        \`;
                return;
            }

            container.innerHTML = \`
        <div class="data-table">
          <div class="data-table__header" style="grid-template-columns: 2fr 1fr auto;">
            <span>Name</span>
            <span>Services</span>
            <span>Actions</span>
          </div>
          \${categories.map(c => {
                const serviceCount = services.filter(s => s.category_id === c.id).length;
                return \`
              <div class="data-table__row" style="grid-template-columns: 2fr 1fr auto;">
                <span>\${escapeHtml(c.name)}</span>
                <span>\${serviceCount}</span>
                <div class="data-table__actions">
                  <button class="btn btn--secondary btn--sm" onclick="editCategory('\${c.id}')">Edit</button>
                  <button class="btn btn--danger btn--sm" onclick="deleteCategory('\${c.id}')">Delete</button>
                </div>
              </div>
            \`;
            }).join('')}
        </div>
      \`;
        }

        function updateCategorySelect() {
            const select = document.getElementById('service-category');
            select.innerHTML = '<option value="">No Category</option>' +
                categories.map(c => \`<option value="\${c.id}">\${escapeHtml(c.name)}</option>\`).join('');
        }

        function editService(id) {
            const service = services.find(s => s.id === id);
            if (!service) return;

            document.getElementById('service-modal-title').textContent = 'Edit Service';
            document.getElementById('service-id').value = service.id;
            document.getElementById('service-name').value = service.name;
            document.getElementById('service-url').value = service.url;
            document.getElementById('service-category').value = service.category_id || '';
            document.getElementById('service-expected-status').value = service.expected_status;
            openModal('service-modal');
        }

        async function deleteService(id) {
            if (!confirm('Are you sure you want to delete this service?')) return;

            try {
                await apiRequest(\`/api/admin/services/\${id}\`, 'DELETE');
                showToast('Service deleted', 'success');
                loadServices();
            } catch (error) {
                showToast('Failed to delete service', 'error');
            }
        }

        function editCategory(id) {
            const category = categories.find(c => c.id === id);
            if (!category) return;

            document.getElementById('category-modal-title').textContent = 'Edit Category';
            document.getElementById('category-id').value = category.id;
            document.getElementById('category-name').value = category.name;
            openModal('category-modal');
        }

        async function deleteCategory(id) {
            if (!confirm('Are you sure you want to delete this category?')) return;

            try {
                await apiRequest(\`/api/admin/categories/\${id}\`, 'DELETE');
                showToast('Category deleted', 'success');
                loadCategories();
                loadServices();
            } catch (error) {
                showToast('Failed to delete category', 'error');
            }
        }

        function showToast(message, type = 'success') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = \`toast toast--\${type}\`;
            toast.innerHTML = \`
        <span>\${type === 'success' ? '✓' : '✕'}</span>
        <span>\${escapeHtml(message)}</span>
      \`;
            container.appendChild(toast);

            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    </script>
</body>

</html>`;

export const stylesCSS = `/* Theme variables */
:root {
  /* Status colors */
  --color-operational: #22c55e;
  --color-degraded: #f59e0b;
  --color-outage: #ef4444;
  --color-unknown: #9ca3af;

  /* Dark theme (default) */
  --bg-page: #111827;
  --bg-card: #1f2937;
  --bg-card-hover: #252f3f;
  --bg-input: #374151;
  --text-primary: #f9fafb;
  --text-secondary: #9ca3af;
  --text-muted: #6b7280;
  --border-color: #374151;
  --divider: #374151;
  --bar-unknown: #4b5563;
}

[data-theme="light"] {
  --bg-page: #f9fafb;
  --bg-card: #ffffff;
  --bg-card-hover: #f3f4f6;
  --bg-input: #f3f4f6;
  --text-primary: #111827;
  --text-secondary: #4b5563;
  --text-muted: #6b7280;
  --border-color: #e5e7eb;
  --divider: #e5e7eb;
  --bar-unknown: #d1d5db;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: var(--bg-page);
  color: var(--text-primary);
  line-height: 1.5;
  min-height: 100vh;
  transition: background 0.2s, color 0.2s;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3rem;
}

.header__logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.header__actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.theme-toggle {
  background: none;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.theme-toggle:hover {
  background: var(--bg-card);
  border-color: var(--text-muted);
}

.header__admin-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.875rem;
  padding: 0.5rem 0.875rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  transition: all 0.2s;
}

.header__admin-link:hover {
  background: var(--bg-card);
  border-color: var(--text-muted);
}

/* Overall Status */
.overall-status {
  text-align: center;
  padding: 2.5rem 0;
  margin-bottom: 2.5rem;
}

.overall-status__icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  font-size: 2rem;
}

.overall-status__icon--operational {
  background: var(--color-operational);
  color: white;
}

.overall-status__icon--degraded {
  background: var(--color-degraded);
  color: white;
}

.overall-status__icon--outage {
  background: var(--color-outage);
  color: white;
}

.overall-status__text {
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.overall-status__description {
  color: var(--text-secondary);
  font-size: 0.9375rem;
}

/* Section Header */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
}

/* Category */
.category {
  margin-bottom: 1.5rem;
}

.category__header {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
}

/* Service Card */
.service-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 0.75rem;
  transition: background 0.2s;
}

.service-card:hover {
  background: var(--bg-card-hover);
}

.service-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.service-card__info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.service-card__icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.service-card__icon--operational {
  background: var(--color-operational);
  color: white;
}

.service-card__icon--degraded {
  background: var(--color-degraded);
  color: white;
}

.service-card__icon--outage {
  background: var(--color-outage);
  color: white;
}

.service-card__icon--unknown {
  background: var(--color-unknown);
  color: white;
}

.service-card__details {
  display: flex;
  flex-direction: column;
}

.service-card__name {
  font-size: 1rem;
  font-weight: 600;
}

.service-card__status {
  font-size: 0.875rem;
  color: var(--color-operational);
}

.service-card__status--degraded {
  color: var(--color-degraded);
}

.service-card__status--outage {
  color: var(--color-outage);
}

.service-card__status--unknown {
  color: var(--color-unknown);
}

.service-card__uptime {
  text-align: right;
}

.service-card__uptime-value {
  font-size: 1rem;
  font-weight: 600;
}

.service-card__uptime-label {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* History Bar */
.history-bar {
  display: flex;
  gap: 2px;
  height: 32px;
}

.history-bar__segment {
  flex: 1;
  border-radius: 3px;
  transition: transform 0.15s;
  cursor: pointer;
  position: relative;
}

.history-bar__segment:hover {
  transform: scaleY(1.15);
}

.history-bar__segment--operational {
  background: var(--color-operational);
}

.history-bar__segment--degraded {
  background: var(--color-degraded);
}

.history-bar__segment--outage {
  background: var(--color-outage);
}

.history-bar__segment--unknown {
  background: var(--bar-unknown);
}

.history-bar__segment:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--text-primary);
  color: var(--bg-page);
  padding: 0.375rem 0.625rem;
  border-radius: 4px;
  font-size: 0.75rem;
  white-space: nowrap;
  z-index: 10;
}

/* Footer */
.footer {
  text-align: center;
  padding: 2rem 0;
  color: var(--text-muted);
  font-size: 0.875rem;
  border-top: 1px solid var(--divider);
  margin-top: 2rem;
}

/* Loading State */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: var(--text-secondary);
}

.loading__spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top-color: var(--color-operational);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.empty-state__icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  opacity: 0.6;
}

.empty-state__title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.empty-state__description {
  color: var(--text-secondary);
  font-size: 0.9375rem;
}

/* =====================
   Admin Panel Styles
   ===================== */

.admin-container {
  max-width: 960px;
}

/* Login Card */
.login-card {
  max-width: 380px;
  margin: 4rem auto;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 2rem;
}

.login-card__title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  text-align: center;
}

.login-card__subtitle {
  color: var(--text-secondary);
  text-align: center;
  margin-bottom: 1.5rem;
  font-size: 0.9375rem;
}

/* Form Elements */
.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.375rem;
  color: var(--text-secondary);
}

.form-input {
  width: 100%;
  padding: 0.625rem 0.875rem;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.9375rem;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-operational);
}

.form-input::placeholder {
  color: var(--text-muted);
}

.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.75rem center;
  background-repeat: no-repeat;
  background-size: 1.25em 1.25em;
  padding-right: 2.5rem;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn--primary {
  background: var(--color-operational);
  color: white;
}

.btn--primary:hover {
  opacity: 0.9;
}

.btn--secondary {
  background: var(--bg-input);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn--secondary:hover {
  background: var(--bg-card-hover);
}

.btn--danger {
  background: transparent;
  color: var(--color-outage);
  border: 1px solid var(--color-outage);
}

.btn--danger:hover {
  background: var(--color-outage);
  color: white;
}

.btn--sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

.btn--full {
  width: 100%;
}

/* Admin Header */
.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--divider);
}

.admin-header__title {
  font-size: 1.5rem;
  font-weight: 700;
}

.admin-header__actions {
  display: flex;
  gap: 0.5rem;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 0;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--divider);
}

.tab {
  padding: 0.75rem 1rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: -1px;
}

.tab:hover {
  color: var(--text-primary);
}

.tab--active {
  color: var(--color-operational);
  border-bottom-color: var(--color-operational);
}

/* Data Table */
.data-table {
  width: 100%;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.data-table__header {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr 1fr auto;
  gap: 1rem;
  padding: 0.875rem 1rem;
  background: var(--bg-input);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.data-table__row {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr 1fr auto;
  gap: 1rem;
  padding: 1rem;
  border-top: 1px solid var(--border-color);
  align-items: center;
}

.data-table__row:hover {
  background: var(--bg-card-hover);
}

.data-table__actions {
  display: flex;
  gap: 0.5rem;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s;
}

.modal-overlay--visible {
  opacity: 1;
  visibility: visible;
}

.modal {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
  width: 100%;
  max-width: 440px;
  margin: 1rem;
  transform: translateY(10px);
  transition: transform 0.2s;
}

.modal-overlay--visible .modal {
  transform: translateY(0);
}

.modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.modal__title {
  font-size: 1.125rem;
  font-weight: 600;
}

.modal__close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 1;
}

.modal__close:hover {
  color: var(--text-primary);
}

.modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--divider);
}

/* Toast */
.toast-container {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toast {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.875rem 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }

  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast--success {
  border-left: 3px solid var(--color-operational);
}

.toast--error {
  border-left: 3px solid var(--color-outage);
}

/* Settings */
.settings-grid {
  display: grid;
  gap: 1rem;
}

.settings-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.25rem;
}

.settings-card__title {
  font-size: 0.9375rem;
  font-weight: 600;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--divider);
}

/* Responsive */
@media (max-width: 640px) {
  .container {
    padding: 1.5rem 1rem;
  }

  .header {
    flex-wrap: wrap;
    gap: 1rem;
  }

  .overall-status {
    padding: 1.5rem 0;
  }

  .overall-status__icon {
    width: 48px;
    height: 48px;
    font-size: 1.5rem;
  }

  .overall-status__text {
    font-size: 1.25rem;
  }

  .data-table__header,
  .data-table__row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .data-table__header {
    display: none;
  }
}`;
