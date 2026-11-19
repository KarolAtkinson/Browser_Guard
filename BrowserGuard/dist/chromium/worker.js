importScripts('database.js', 'url-checker.js');

const browserApi = globalThis.browser ?? globalThis.chrome;
const siteDatabase = BrowserGuardDatabase.create(browserApi.storage.local);
const { classifyUrl, normalizeDomain } = BrowserGuardUrlChecker;
const defaults = {
  enabled: true,
  blockScams: true,
  blockAds: true,
  blockTrackers: true,
  safeSearch: true,
  strictMode: false,
  allowDomains: [],
  denyDomains: [],
  greyDomains: [],
  reputationEndpoint: '',
  stats: { blocked: 0, inspected: 0 },
  activity: []
};

async function recordActivity(event) {
  const stored = await browserApi.storage.local.get({ activity: [] });
  const activity = [{ ...event, timestamp: new Date().toISOString() }, ...stored.activity].slice(0, 100);
  await browserApi.storage.local.set({ activity });
}

async function getSettings() {
  const stored = await browserApi.storage.local.get(defaults);
  const siteIntelligence = await siteDatabase.initialize(stored.allowDomains, stored.denyDomains);
  return {
    ...defaults,
    ...stored,
    allowDomains: siteIntelligence.lists.whitelist.map((site) => site.domain),
    denyDomains: siteIntelligence.lists.blacklist.map((site) => site.domain),
    greyDomains: siteIntelligence.lists.greylist.map((site) => site.domain),
    stats: { ...defaults.stats, ...stored.stats }
  };
}

async function updateDomainRules(settings) {
  if (!browserApi.declarativeNetRequest?.updateDynamicRules) return;
  const active = settings.enabled && settings.blockScams;
  const domains = active ? [...new Set(settings.denyDomains.map(normalizeDomain).filter(Boolean))].slice(0, 4000) : [];
  const allowDomains = active ? [...new Set(settings.allowDomains.map(normalizeDomain).filter(Boolean))].slice(0, 4000) : [];
  const removeRuleIds = Array.from({ length: 8000 }, (_, index) => 1000 + index);
  const addRules = [
    ...domains.map((domain, index) => ({
      id: 1000 + index,
      priority: 3,
      action: { type: 'block' },
      condition: { requestDomains: [domain], resourceTypes: ['main_frame'] }
    })),
    ...allowDomains.map((domain, index) => ({
      id: 5000 + index,
      priority: 2,
      action: { type: 'allow' },
      condition: { requestDomains: [domain], resourceTypes: ['main_frame'] }
    }))
  ];
  await browserApi.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
}

async function syncPrivacyRules(settings) {
  if (!browserApi.declarativeNetRequest?.updateEnabledRulesets) return;
  const enabledRulesets = settings.enabled && settings.blockAds && settings.blockTrackers ? ['privacy_filters'] : [];
  const disabledRulesets = enabledRulesets.length ? [] : ['privacy_filters'];
  await browserApi.declarativeNetRequest.updateEnabledRulesets({ enabledRulesets, disabledRulesets });
}

async function incrementStat(key) {
  const settings = await getSettings();
  settings.stats[key] = (settings.stats[key] ?? 0) + 1;
  await browserApi.storage.local.set({ stats: settings.stats });
}

async function getRemoteReputation(rawUrl) {
  const settings = await getSettings();
  if (!settings.reputationEndpoint) return null;
  const url = new URL(rawUrl);
  const endpoint = new URL(settings.reputationEndpoint);
  if (endpoint.protocol !== 'https:') return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ domain: url.hostname }),
      signal: controller.signal
    });
    if (!response.ok) return null;
    const result = await response.json();
    return { score: Number(result.score) || 0, label: String(result.label ?? 'Unknown'), source: 'Company reputation service' };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

const oneTimeAllows = new Set();

browserApi.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'get-settings') return getSettings().then((settings) => ({ settings }));
  if (message.type === 'classify-url') {
    return getSettings().then((settings) => classifyUrl(message.url, settings));
  }
  if (message.type === 'dashboard') {
    return Promise.all([getSettings(), browserApi.tabs.query({ active: true, currentWindow: true })]).then(async ([settings, tabs]) => ({
      settings,
      current: tabs[0]?.url ? classifyUrl(tabs[0].url, settings) : null,
      url: tabs[0]?.url ?? ''
    }));
  }
  if (message.type === 'dashboard-data') {
    return Promise.all([
      getSettings(),
      siteDatabase.getSnapshot(),
      browserApi.storage.local.get({ activity: [] })
    ]).then(([settings, database, stored]) => ({ settings, database, activity: stored.activity }));
  }
  if (message.type === 'activity:clear') return browserApi.storage.local.set({ activity: [] }).then(() => ({ cleared: true }));
  if (message.type === 'page-analysis') {
    const domain = sender.url ? new URL(sender.url).hostname : '';
    const result = message.result ?? {};
    return Promise.all([
      incrementStat('inspected'),
      siteDatabase.recordPageAnalysis({ domain, riskScore: result.phishingScore, reasons: result.issues }),
      recordActivity({ kind: 'inspected', domain, detail: result.issues?.[0] ?? 'Page inspected locally', label: 'Inspected' })
    ]).then(() => ({ saved: true }));
  }
  if (message.type === 'site-database:snapshot') return siteDatabase.getSnapshot();
  if (message.type === 'site-database:assess') {
    return siteDatabase.assess(message.assessment).then(async (snapshot) => {
      await recordActivity({ kind: 'assessment', domain: normalizeDomain(message.assessment.domain), detail: `User assessment: ${message.assessment.decision}`, label: 'Reported' });
      const settings = await getSettings();
      await updateDomainRules(settings);
      return snapshot;
    });
  }
  if (message.type === 'site-database:resolve') {
    return siteDatabase.resolve(message.resolution).then(async (snapshot) => {
      const settings = await getSettings();
      await updateDomainRules(settings);
      return snapshot;
    });
  }
  if (message.type === 'site-database:remove') {
    return siteDatabase.remove(message.domain).then(async (snapshot) => {
      const settings = await getSettings();
      await updateDomainRules(settings);
      return snapshot;
    });
  }
  if (message.type === 'site-database:import') {
    return siteDatabase.importSnapshot(message.snapshot).then(async (snapshot) => {
      const settings = await getSettings();
      await updateDomainRules(settings);
      return snapshot;
    });
  }
  if (message.type === 'site-database:export') return siteDatabase.getSnapshot();
  if (message.type === 'remote-reputation') return getRemoteReputation(message.url);
  if (message.type === 'allow-once' && sender.url === browserApi.runtime.getURL('warning.html') && Number.isInteger(message.tabId)) {
    oneTimeAllows.add(message.tabId);
    return Promise.resolve({ allowed: true });
  }
  if (message.type === 'save-settings') {
    return getSettings().then(async (settings) => {
      const next = { ...settings, ...message.settings };
      await browserApi.storage.local.set(next);
      await Promise.all([updateDomainRules(next), syncPrivacyRules(next)]);
      return next;
    });
  }
});

browserApi.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0 || !details.url.startsWith('http')) return;
  const settings = await getSettings();
  if (!settings.enabled || !settings.blockScams) return;
  if (oneTimeAllows.delete(details.tabId)) return;
  const result = classifyUrl(details.url, settings);
  if (!result.blocked) return;
  await incrementStat('blocked');
  await recordActivity({ kind: 'blocked', domain: result.hostname, detail: result.reasons[0], label: 'Blocked' });
  const warningUrl = browserApi.runtime.getURL(`warning.html?url=${encodeURIComponent(details.url)}&score=${result.score}&source=${result.source}&reasons=${encodeURIComponent(result.reasons.join('|'))}`);
  await browserApi.tabs.update(details.tabId, { url: warningUrl });
});

browserApi.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !Object.keys(changes).some((key) => ['enabled', 'blockScams', 'blockAds', 'blockTrackers', 'denyDomains', 'allowDomains'].includes(key))) return;
  getSettings().then((settings) => Promise.all([updateDomainRules(settings), syncPrivacyRules(settings)])).catch(() => {});
});

browserApi.runtime.onInstalled.addListener(async () => {
  const current = await browserApi.storage.local.get(null);
  await browserApi.storage.local.set({ ...defaults, ...current, stats: { ...defaults.stats, ...current.stats } });
  await siteDatabase.initialize(current.allowDomains, current.denyDomains);
  const settings = await getSettings();
  await Promise.all([updateDomainRules(settings), syncPrivacyRules(settings)]);
});

browserApi.action.onClicked.addListener(() => {
  browserApi.tabs.create({ url: browserApi.runtime.getURL('dashboard.html') });
});