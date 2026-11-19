((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BrowserGuardDatabase = api;
})(globalThis, () => {
  const key = 'siteIntelligence';
  const maximumDatasetRecords = 10000;
  const categories = ['whitelist', 'blacklist', 'greylist'];

  function normalizeDomain(value) {
    const text = String(value ?? '').trim().toLowerCase();
    try {
      const parsed = new URL(text.includes('://') ? text : `https://${text}`);
      const hostname = parsed.hostname.replace(/\.$/, '');
      if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(hostname)) return '';
      return hostname;
    } catch {
      return '';
    }
  }

  function makeState() {
    return { schemaVersion: 1, lists: { whitelist: [], blacklist: [], greylist: [] }, datasets: [] };
  }

  function makeId() {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function create(storage) {
    let queue = Promise.resolve();

    function serialize(operation) {
      const result = queue.then(operation);
      queue = result.catch(() => {});
      return result;
    }

    async function readState() {
      const stored = await storage.get(key);
      return stored[key] ?? makeState();
    }

    async function writeState(state) {
      state.datasets = state.datasets.slice(-maximumDatasetRecords);
      await storage.set({ [key]: state });
      return clone(state);
    }

    function findLatestResolution(state, domain) {
      return [...state.datasets].reverse().find((record) => record.domain === domain && ['resolution', 'list-removal'].includes(record.type));
    }

    function reportDecision(state, domain) {
      const resolution = findLatestResolution(state, domain);
      const afterResolution = state.datasets.filter((record) => record.domain === domain && record.type === 'assessment' && (!resolution || record.timestamp > resolution.timestamp));
      const decisions = new Set(afterResolution.map((record) => record.decision).filter((decision) => decision === 'safe' || decision === 'unsafe'));
      if (resolution) decisions.add(resolution.decision);
      if (decisions.size > 1 || afterResolution.some((record) => record.decision === 'unsure')) return 'unsure';
      if (decisions.has('safe')) return 'safe';
      if (decisions.has('unsafe')) return 'unsafe';
      return 'unsure';
    }

    function updateListProjection(state, domain, decision, details = {}) {
      for (const category of categories) state.lists[category] = state.lists[category].filter((site) => site.domain !== domain);
      const category = decision === 'safe' ? 'whitelist' : decision === 'unsafe' ? 'blacklist' : 'greylist';
      const related = state.datasets.filter((record) => record.domain === domain);
      state.lists[category].push({
        domain,
        decision,
        updatedAt: new Date().toISOString(),
        reportCount: related.filter((record) => record.type === 'assessment').length,
        ...(details.riskScore === undefined ? {} : { riskScore: details.riskScore }),
        ...(details.reason ? { reason: String(details.reason).slice(0, 240) } : {}),
        ...(decision === 'unsure' ? { reviewRequired: true } : {})
      });
    }

    return {
      initialize(legacyAllow = [], legacyDeny = []) {
        return serialize(async () => {
          const stored = await storage.get(key);
          if (stored[key]) return clone(stored[key]);
          const state = makeState();
          for (const [decision, values] of [['safe', legacyAllow], ['unsafe', legacyDeny]]) {
            for (const value of values ?? []) {
              const domain = normalizeDomain(value);
              if (!domain) continue;
              state.datasets.push({ id: makeId(), type: 'assessment', domain, decision, source: 'legacy-migration', timestamp: new Date().toISOString() });
              updateListProjection(state, domain, decision);
            }
          }
          for (const domain of new Set(state.datasets.map((record) => record.domain))) {
            updateListProjection(state, domain, reportDecision(state, domain));
          }
          return writeState(state);
        });
      },

      getSnapshot() {
        return serialize(async () => clone(await readState()));
      },

      assess({ domain: rawDomain, decision, source = 'user', riskScore, reason, reporterId }) {
        return serialize(async () => {
          const domain = normalizeDomain(rawDomain);
          if (!domain) throw new Error('Enter a valid domain name.');
          if (!['safe', 'unsafe', 'unsure'].includes(decision)) throw new Error('Choose safe, unsafe, or unsure.');
          const state = await readState();
          const record = {
            id: makeId(), type: 'assessment', domain, decision,
            source: String(source).slice(0, 40), timestamp: new Date().toISOString()
          };
          if (Number.isFinite(riskScore)) record.riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));
          if (reason) record.reason = String(reason).slice(0, 240);
          if (reporterId) record.reporterId = String(reporterId).slice(0, 80);
          state.datasets.push(record);
          const derivedDecision = reportDecision(state, domain);
          updateListProjection(state, domain, derivedDecision, record);
          return writeState(state);
        });
      },

      recordPageAnalysis({ domain: rawDomain, riskScore, reasons = [] }) {
        return serialize(async () => {
          const domain = normalizeDomain(rawDomain);
          if (!domain) return readState().then(clone);
          const state = await readState();
          state.datasets.push({
            id: makeId(), type: 'page-analysis', domain,
            riskScore: Math.max(0, Math.min(100, Math.round(Number(riskScore) || 0))),
            reasons: reasons.slice(0, 8).map((reason) => String(reason).slice(0, 160)),
            source: 'local-analysis', timestamp: new Date().toISOString()
          });
          return writeState(state);
        });
      },

      resolve({ domain: rawDomain, decision }) {
        return serialize(async () => {
          const domain = normalizeDomain(rawDomain);
          if (!domain) throw new Error('Enter a valid domain name.');
          if (!['safe', 'unsafe'].includes(decision)) throw new Error('A review must resolve to safe or unsafe.');
          const state = await readState();
          state.datasets.push({ id: makeId(), type: 'resolution', domain, decision, source: 'user-review', timestamp: new Date().toISOString() });
          updateListProjection(state, domain, decision);
          return writeState(state);
        });
      },

      remove(rawDomain) {
        return serialize(async () => {
          const domain = normalizeDomain(rawDomain);
          const state = await readState();
          for (const category of categories) state.lists[category] = state.lists[category].filter((site) => site.domain !== domain);
          state.datasets.push({ id: makeId(), type: 'list-removal', domain, source: 'user', timestamp: new Date().toISOString() });
          return writeState(state);
        });
      },

      importSnapshot(input) {
        return serialize(async () => {
          if (!input || input.schemaVersion !== 1 || !input.lists || !Array.isArray(input.datasets)) throw new Error('This is not a supported BrowserGuard database export.');
          const state = await readState();
          const knownIds = new Set(state.datasets.map((record) => record.id));
          const allowedTypes = new Set(['assessment', 'resolution', 'page-analysis', 'list-removal']);
          const importedDomains = new Set();
          for (const category of categories) {
            if (!Array.isArray(input.lists[category])) throw new Error(`Database export is missing ${category}.`);
            for (const site of input.lists[category]) {
              const domain = normalizeDomain(site.domain);
              if (!domain) continue;
              importedDomains.add(domain);
            }
          }
          for (const record of input.datasets.slice(-maximumDatasetRecords)) {
            if (!record || !allowedTypes.has(record.type)) continue;
            const domain = normalizeDomain(record.domain);
            if (!domain) continue;
            const id = String(record.id ?? makeId());
            if (knownIds.has(id)) continue;
            const imported = {
              id,
              type: record.type,
              domain,
              source: String(record.source ?? 'imported').slice(0, 40),
              timestamp: Number.isFinite(Date.parse(record.timestamp)) ? new Date(record.timestamp).toISOString() : new Date().toISOString()
            };
            if (['safe', 'unsafe', 'unsure'].includes(record.decision)) imported.decision = record.decision;
            if (Number.isFinite(record.riskScore)) imported.riskScore = Math.max(0, Math.min(100, Math.round(record.riskScore)));
            if (typeof record.reason === 'string') imported.reason = record.reason.slice(0, 240);
            if (Array.isArray(record.reasons)) imported.reasons = record.reasons.slice(0, 8).map((reason) => String(reason).slice(0, 160));
            if (typeof record.reporterId === 'string') imported.reporterId = record.reporterId.slice(0, 80);
            state.datasets.push(imported);
            knownIds.add(id);
            importedDomains.add(domain);
          }
          for (const category of categories) {
            const decision = category === 'whitelist' ? 'safe' : category === 'blacklist' ? 'unsafe' : 'unsure';
            for (const site of input.lists[category]) {
              const domain = normalizeDomain(site.domain);
              if (!domain || state.datasets.some((record) => record.domain === domain && ['assessment', 'resolution'].includes(record.type))) continue;
              state.datasets.push({ id: makeId(), type: 'assessment', domain, decision, source: 'imported-list', timestamp: new Date().toISOString() });
              importedDomains.add(domain);
            }
          }
          state.datasets.sort((left, right) => left.timestamp.localeCompare(right.timestamp));
          for (const domain of importedDomains) updateListProjection(state, domain, reportDecision(state, domain));
          return writeState(state);
        });
      }
    };
  }

  return { create, normalizeDomain };
});