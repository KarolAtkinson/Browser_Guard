((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BrowserGuardUrlChecker = api;
})(globalThis, () => {
  const warningThreshold = 72;

  function normalizeDomain(value) {
    return String(value ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^\*\./, '');
  }

  function matchesDomain(hostname, domains) {
    return domains.some((entry) => {
      const domain = normalizeDomain(entry);
      return domain && (hostname === domain || hostname.endsWith(`.${domain}`));
    });
  }

  function classifyUrl(rawUrl, settings, threatDatabase = new Set()) {
    let target;
    try {
      target = new URL(rawUrl);
    } catch {
      return { score: 100, level: 'danger', source: 'invalid-url', reasons: ['This address is not a valid URL.'], blocked: true };
    }

    const host = target.hostname.toLowerCase();
    const reasons = [];
    let score = 0;
    const denied = matchesDomain(host, settings.denyDomains) || threatDatabase.has(host);
    const allowed = matchesDomain(host, settings.allowDomains);
    const greylisted = matchesDomain(host, settings.greyDomains);

    if (denied) {
      score = 100;
      reasons.push('This domain is on your organization’s block list.');
    } else if (!['https:', 'http:'].includes(target.protocol)) {
      score += 50;
      reasons.push('This address uses an unusual protocol.');
    }

    if (!denied && !allowed) {
      if (host.startsWith('xn--') || host.split('.').some((part) => part.startsWith('xn--'))) {
        score += 28;
        reasons.push('The domain uses encoded characters that can imitate another site.');
      }
      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
        score += 28;
        reasons.push('The address uses a raw IP instead of a recognizable domain.');
      }
      if (host.length > 55 || host.split('.').length > 5) {
        score += 14;
        reasons.push('The domain has an unusually long or deeply nested name.');
      }
      const labels = host.split('.');
      const brandTerms = ['google', 'microsoft', 'apple', 'paypal', 'amazon', 'office365'];
      if (labels.some((label) => brandTerms.some((brand) => label.includes(brand) && label !== brand))) {
        score += 25;
        reasons.push('The domain may be imitating a well-known brand.');
      }
      if (/(login|signin|verify|secure|account|password|wallet)/i.test(`${host}${target.pathname}`)) {
        score += 10;
        reasons.push('The address contains a common account-verification lure.');
      }
      if (target.protocol === 'http:' && /login|signin|password|account/i.test(target.pathname)) {
        score += 18;
        reasons.push('Sensitive sign-in page is not using HTTPS.');
      }
      if (settings.strictMode && target.protocol === 'http:') {
        score += 20;
        reasons.push('Strict mode treats unencrypted pages as higher risk.');
      }
    }

    if (allowed && !denied) {
      score = 0;
      reasons.length = 0;
      reasons.push('This domain is on your organization’s allow list.');
    }

    if (greylisted && !denied && !allowed) {
      score = Math.max(score, 30);
      reasons.unshift('This domain is on the Greylist and awaits review.');
    }

    score = Math.min(score, 100);
    const level = score >= warningThreshold ? 'danger' : score >= 30 ? 'caution' : 'safe';
    return { score, level, source: denied ? 'blocklist' : 'heuristic', reasons, blocked: denied || score >= warningThreshold, hostname: host };
  }

  return { classifyUrl, matchesDomain, normalizeDomain, warningThreshold };
});