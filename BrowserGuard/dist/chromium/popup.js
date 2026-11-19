const browserApi = globalThis.browser ?? globalThis.chrome;
const send = (message) => browserApi.runtime.sendMessage(message);
const elements = {
  enabled: document.querySelector('#enabled'),
  state: document.querySelector('#protection-state'),
  copy: document.querySelector('#protection-copy'),
  site: document.querySelector('#site-name'),
  detail: document.querySelector('#site-detail'),
  icon: document.querySelector('#status-icon'),
  blocked: document.querySelector('#blocked-count'),
  inspected: document.querySelector('#inspected-count'),
  feedback: document.querySelector('#feedback')
};

function showResult(result, url) {
  const hostname = (() => { try { return new URL(url).hostname; } catch { return 'This page'; } })();
  elements.site.textContent = hostname;
  elements.icon.dataset.level = result?.level ?? 'safe';
  elements.icon.textContent = result?.level === 'danger' ? '!' : result?.level === 'caution' ? '?' : 'OK';
  elements.detail.textContent = result?.reasons?.[0] ?? 'No local risk signals found';
}

async function refresh() {
  const data = await send({ type: 'dashboard' });
  elements.enabled.checked = data.settings.enabled;
  elements.state.textContent = data.settings.enabled ? 'You are protected' : 'Protection is paused';
  elements.copy.textContent = data.settings.enabled ? 'URL and page checks are active' : 'Turn protection on to resume checks';
  elements.blocked.textContent = data.settings.stats.blocked.toLocaleString();
  elements.inspected.textContent = data.settings.stats.inspected.toLocaleString();
  showResult(data.current, data.url);
}

document.querySelector('#settings-link').addEventListener('click', () => browserApi.runtime.openOptionsPage());
document.querySelector('#manage-link').addEventListener('click', (event) => {
  event.preventDefault();
  browserApi.runtime.openOptionsPage();
});
elements.enabled.addEventListener('change', async () => {
  await send({ type: 'save-settings', settings: { enabled: elements.enabled.checked } });
  await refresh();
});
document.querySelector('#check-button').addEventListener('click', async () => {
  const data = await send({ type: 'dashboard' });
  if (!data.url.startsWith('http')) {
    elements.feedback.textContent = 'This browser page cannot be inspected.';
    return;
  }
  const result = await send({ type: 'classify-url', url: data.url });
  showResult(result, data.url);
  let message = result.level === 'danger' ? 'High risk signals detected.' : result.level === 'caution' ? 'Review this address carefully.' : 'No local URL risk signals found.';
  if (data.settings.reputationEndpoint) {
    const reputation = await send({ type: 'remote-reputation', url: data.url });
    if (reputation) message += ` Company reputation: ${reputation.label} (risk ${reputation.score}/100).`;
  }
  elements.feedback.textContent = message;
});

document.querySelectorAll('[data-decision]').forEach((button) => {
  button.addEventListener('click', async () => {
    const data = await send({ type: 'dashboard' });
    if (!data.url.startsWith('http')) {
      elements.feedback.textContent = 'Open a website before recording an assessment.';
      return;
    }
    try {
      const snapshot = await send({
        type: 'site-database:assess',
        assessment: { domain: data.url, decision: button.dataset.decision, source: 'popup-user' }
      });
      const hostname = new URL(data.url).hostname;
      const category = Object.entries(snapshot.lists).find(([, sites]) => sites.some((site) => site.domain === hostname))?.[0] ?? 'greylist';
      elements.feedback.textContent = `${hostname} recorded in ${category}.`;
    } catch (error) { elements.feedback.textContent = error.message; }
  });
});

refresh().catch(() => { elements.state.textContent = 'Protection status unavailable'; });