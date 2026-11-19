const browserApi = globalThis.browser ?? globalThis.chrome;
const send = (message) => browserApi.runtime.sendMessage(message);
const feedback = document.querySelector('#settings-feedback');

async function loadSettings() {
  const { settings } = await send({ type: 'dashboard' });
  for (const key of ['blockScams', 'strictMode', 'safeSearch']) document.querySelector(`#${key}`).checked = settings[key];
  document.querySelector('#privacyFilters').checked = settings.blockAds && settings.blockTrackers;
  document.querySelector('#reputationEndpoint').value = settings.reputationEndpoint;
  await refreshDatabase();
}

async function refreshDatabase() {
  const snapshot = await send({ type: 'site-database:snapshot' });
  document.querySelector('#dataset-count').textContent = `${snapshot.datasets.length.toLocaleString()} dataset records`;
  for (const category of ['whitelist', 'blacklist', 'greylist']) renderList(category, snapshot.lists[category]);
}

function renderList(category, sites) {
  const list = document.querySelector(`#${category}`);
  list.replaceChildren();
  for (const site of sites) {
    const item = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = site.domain;
    const actions = document.createElement('div');
    actions.className = 'site-actions';
    const addAction = (text, action, decision) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = text;
      button.setAttribute('aria-label', `${text} ${site.domain}`);
      button.addEventListener('click', async () => {
        try {
          const message = action === 'resolve'
            ? { type: 'site-database:resolve', resolution: { domain: site.domain, decision } }
            : { type: 'site-database:remove', domain: site.domain };
          await send(message);
          await refreshDatabase();
          feedback.textContent = action === 'resolve' ? `${site.domain} moved to ${decision === 'safe' ? 'Whitelist' : 'Blacklist'}.` : `${site.domain} removed from its list.`;
        } catch (error) { feedback.textContent = error.message; }
      });
      actions.append(button);
    };
    if (category === 'greylist') {
      addAction('Mark safe', 'resolve', 'safe');
      addAction('Mark unsafe', 'resolve', 'unsafe');
    } else {
      addAction('Remove', 'remove');
    }
    item.append(label, actions);
    list.append(item);
  }
}

document.querySelector('#site-assessment-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const domain = document.querySelector('#assessment-domain').value;
  const decision = document.querySelector('#assessment-decision').value;
  try {
    const snapshot = await send({ type: 'site-database:assess', assessment: { domain, decision } });
    await refreshDatabase();
    const hostname = (() => { try { return new URL(domain.includes('://') ? domain : `https://${domain}`).hostname; } catch { return domain; } })();
    const category = Object.entries(snapshot.lists).find(([, sites]) => sites.some((site) => site.domain === hostname))?.[0] ?? 'greylist';
    feedback.textContent = `${hostname} recorded in ${category}.`;
  } catch (error) { feedback.textContent = error.message; }
});

document.querySelector('#export-database').addEventListener('click', async () => {
  const snapshot = await send({ type: 'site-database:export' });
  const file = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(file);
  link.download = `browserguard-database-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  feedback.textContent = 'Database export downloaded.';
});

document.querySelector('#import-database').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const snapshot = JSON.parse(await file.text());
    await send({ type: 'site-database:import', snapshot });
    await refreshDatabase();
    feedback.textContent = 'Database imported.';
  } catch (error) { feedback.textContent = error.message || 'Could not import this database file.'; }
  event.target.value = '';
});

for (const id of ['blockScams', 'privacyFilters', 'strictMode', 'safeSearch']) {
  document.querySelector(`#${id}`).addEventListener('change', async (event) => {
    const settings = id === 'privacyFilters'
      ? { blockAds: event.target.checked, blockTrackers: event.target.checked }
      : { [id]: event.target.checked };
    await send({ type: 'save-settings', settings });
    feedback.textContent = 'Settings saved.';
  });
}

document.querySelector('#save-endpoint').addEventListener('click', async () => {
  const input = document.querySelector('#reputationEndpoint');
  try {
    if (input.value && new URL(input.value).protocol !== 'https:') {
      feedback.textContent = 'The reputation endpoint must use HTTPS.';
      return;
    }
  } catch {
    feedback.textContent = 'Enter a valid HTTPS endpoint.';
    return;
  }
  await send({ type: 'save-settings', settings: { reputationEndpoint: input.value.trim() } });
  feedback.textContent = 'Reputation service setting saved.';
});

loadSettings().catch(() => { feedback.textContent = 'Could not load settings.'; });