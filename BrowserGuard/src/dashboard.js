const browserApi = globalThis.browser ?? globalThis.chrome;
const send = (message) => browserApi.runtime.sendMessage(message);
const feedback = document.querySelector('#dashboard-feedback');
let dashboardData;

function renderActivity(target, events, limit = Infinity) {
  target.replaceChildren();
  const visible = events.slice(0, limit);
  if (!visible.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No activity recorded yet. BrowserGuard keeps this history on this device.';
    target.append(empty);
    return;
  }
  for (const event of visible) {
    const row = document.createElement('article');
    row.className = 'activity-row';
    const icon = document.createElement('span');
    icon.className = `activity-icon ${event.kind === 'blocked' ? 'blocked' : event.kind === 'privacy' ? 'privacy' : 'checked'}`;
    icon.textContent = event.kind === 'blocked' ? '⊘' : event.kind === 'privacy' ? '◈' : '✓';
    const detail = document.createElement('span');
    detail.className = 'activity-detail';
    const domain = document.createElement('strong');
    domain.textContent = event.domain || 'Website check';
    const description = document.createElement('small');
    description.textContent = event.detail || 'Local protection event';
    detail.append(domain, description);
    const time = document.createElement('time');
    time.dateTime = event.timestamp;
    time.textContent = relativeTime(event.timestamp);
    const badge = document.createElement('span');
    badge.className = `event-badge ${event.kind === 'blocked' ? 'badge-blocked' : event.kind === 'privacy' ? 'badge-privacy' : 'badge-checked'}`;
    badge.textContent = event.label || (event.kind === 'blocked' ? 'Blocked' : event.kind === 'privacy' ? 'Filtered' : 'Inspected');
    row.append(icon, detail, time, badge);
    target.append(row);
  }
}

function relativeTime(timestamp) {
  const elapsed = Math.max(0, Date.now() - Date.parse(timestamp));
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

function renderDashboard(data) {
  dashboardData = data;
  const { settings, database, activity } = data;
  document.querySelector('#metric-blocked').textContent = (settings.stats.blocked ?? 0).toLocaleString();
  document.querySelector('#metric-inspected').textContent = (settings.stats.inspected ?? 0).toLocaleString();
  document.querySelector('#metric-blacklist').textContent = database.lists.blacklist.length.toLocaleString();
  document.querySelector('#metric-greylist').textContent = database.lists.greylist.length.toLocaleString();
  document.querySelector('#site-list-summary').textContent = `${database.lists.whitelist.length} allowed · ${database.lists.blacklist.length} blocked · ${database.lists.greylist.length} awaiting review`;
  document.querySelector('#sidebar-status').textContent = settings.enabled ? 'Protection Active' : 'Protection Paused';
  document.querySelector('#sidebar-copy').textContent = settings.enabled ? 'Keeping you safer online' : 'Turn protection on to resume checks';
  document.querySelector('#hero-state').textContent = settings.enabled ? 'Protection is active' : 'Protection is paused';
  document.querySelector('#page-title').textContent = settings.enabled ? "You're protected" : 'Protection is paused';
  document.querySelector('.hero-status').classList.toggle('paused', !settings.enabled);
  for (const input of document.querySelectorAll('[data-setting]')) input.checked = Boolean(settings[input.dataset.setting]);
  document.querySelector('#privacy-toggle').checked = settings.blockAds && settings.blockTrackers;
  renderActivity(document.querySelector('#recent-activity'), activity, 5);
  renderActivity(document.querySelector('#all-activity'), activity);
  document.querySelector('#activity-count').textContent = `${activity.length} ${activity.length === 1 ? 'event' : 'events'}`;
}

async function refresh() {
  renderDashboard(await send({ type: 'dashboard-data' }));
}

function showView(name) {
  for (const view of document.querySelectorAll('.view')) view.classList.toggle('active', view.id === `view-${name}`);
  for (const nav of document.querySelectorAll('.nav-item')) nav.classList.toggle('active', nav.dataset.view === name);
  document.title = `${name === 'overview' ? 'Overview' : name === 'activity' ? 'Blocked Activity' : name === 'protection' ? 'Web Protection' : name === 'privacy' ? 'Privacy Tools' : 'Settings'} | BrowserGuard`;
  document.querySelector('.sidebar').classList.remove('mobile-open');
}

document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => showView(button.dataset.view)));
document.querySelectorAll('[data-view-link]').forEach((button) => button.addEventListener('click', () => showView(button.dataset.viewLink)));
document.querySelector('#mobile-menu').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('mobile-open'));

for (const input of document.querySelectorAll('[data-setting]')) {
  input.addEventListener('change', async () => {
    const key = input.dataset.setting;
    try {
      await send({ type: 'save-settings', settings: { [key]: input.checked } });
      feedback.textContent = `${key === 'enabled' ? 'Protection' : key === 'safeSearch' ? 'Search-result labels' : key === 'strictMode' ? 'Strict mode' : key === 'blockAds' ? 'Ad filtering' : 'Tracker filtering'} ${input.checked ? 'enabled' : 'disabled'}.`;
      await refresh();
    } catch {
      feedback.textContent = 'Could not save that setting.';
      await refresh();
    }
  });
}

document.querySelector('#privacy-toggle').addEventListener('change', async (event) => {
  try {
    await send({ type: 'save-settings', settings: { blockAds: event.target.checked, blockTrackers: event.target.checked } });
    feedback.textContent = `Privacy filtering ${event.target.checked ? 'enabled' : 'disabled'}.`;
    await refresh();
  } catch {
    feedback.textContent = 'Could not save the privacy setting.';
    await refresh();
  }
});

document.querySelectorAll('[data-go-options], #open-options').forEach((button) => button.addEventListener('click', () => browserApi.runtime.openOptionsPage()));

document.querySelector('#clear-activity').addEventListener('click', async () => {
  await send({ type: 'activity:clear' });
  feedback.textContent = 'Local activity history cleared.';
  await refresh();
});

browserApi.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && Object.keys(changes).some((key) => ['enabled', 'blockScams', 'blockAds', 'blockTrackers', 'safeSearch', 'strictMode', 'stats', 'siteIntelligence', 'activity'].includes(key))) refresh().catch(() => {});
});

refresh().catch(() => { feedback.textContent = 'BrowserGuard could not load its local settings.'; });