const params = new URLSearchParams(location.search);
const browserApi = globalThis.browser ?? globalThis.chrome;
const destination = params.get('url') ?? '';
const source = params.get('source') ?? 'heuristic';
const score = Number(params.get('score'));
const destinationLabel = document.querySelector('#destination');
try { destinationLabel.textContent = new URL(destination).href; } catch { destinationLabel.textContent = 'Unknown address'; }
const reasons = (params.get('reasons') ?? 'Strong local phishing risk signals were detected.').split('|').filter(Boolean);
for (const reason of reasons) {
  const item = document.createElement('li');
  item.textContent = reason;
  document.querySelector('#reasons').append(item);
}
const summary = document.querySelector('#warning-summary');
const method = document.querySelector('#check-method');
const riskScore = document.querySelector('#risk-score');
if (source === 'blocklist') {
  summary.textContent = 'This domain matched a locally stored Blacklist entry. The block-list decision is based on a saved site assessment or company policy, not just a URL pattern.';
  method.textContent = 'Before opening the page, BrowserGuard compared its hostname with the local Whitelist, Blacklist, and Greylist. A Blacklist match takes priority over a Whitelist entry.';
} else if (source === 'invalid-url') {
  summary.textContent = 'BrowserGuard could not safely parse this address, so it stopped navigation.';
  method.textContent = 'The address could not be parsed as a valid URL. Do not continue unless you can verify the destination independently.';
} else {
  summary.textContent = 'The address accumulated enough local URL-risk signals to cross the blocking threshold. This is an automated risk assessment, not proof that the site is malicious.';
  method.textContent = 'BrowserGuard checked the hostname and URL structure for signals such as encoded domain characters, raw IP addresses, brand-like names, account-lure words, and insecure sign-in pages. A score of 72/100 or higher is blocked.';
  riskScore.textContent = Number.isFinite(score) ? `Local URL risk score: ${score}/100` : '';
}
document.querySelector('#back').addEventListener('click', () => history.length > 1 ? history.back() : location.replace('about:blank'));
document.querySelector('#continue').addEventListener('click', async () => {
  const tab = await browserApi.tabs.getCurrent();
  if (!tab?.id) return;
  await browserApi.runtime.sendMessage({ type: 'allow-once', tabId: tab.id });
  location.replace(destination);
});