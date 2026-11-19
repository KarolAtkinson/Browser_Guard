(() => {
  const browserApi = globalThis.browser ?? globalThis.chrome;
  if (!/^https?:$/.test(location.protocol)) return;

  const scanPage = () => {
    const passwordFields = document.querySelectorAll('input[type="password"]').length;
    const forms = [...document.forms].filter((form) => form.querySelector('input[type="password"]'));
    const insecureForms = forms.filter((form) => new URL(form.action || location.href, location.href).protocol !== 'https:').length;
    const externalFrames = [...document.querySelectorAll('iframe[src]')].filter((frame) => {
      try { return new URL(frame.src).hostname !== location.hostname; } catch { return false; }
    }).length;
    const suspiciousLinks = [...document.links].filter((link) => {
      const label = link.innerText.trim().toLowerCase();
      if (!label || label.length > 80) return false;
      try {
        const target = new URL(link.href);
        return target.hostname !== location.hostname && /^(sign in|log in|verify|continue|account|your account)$/.test(label);
      } catch { return false; }
    }).length;
    const reasons = [];
    let phishingScore = 0;
    if (insecureForms) { phishingScore += 45; reasons.push(`${insecureForms} sign-in form${insecureForms === 1 ? '' : 's'} submit over an unencrypted connection.`); }
    if (externalFrames > 3) { phishingScore += 18; reasons.push('This page embeds several third-party frames.'); }
    if (suspiciousLinks) { phishingScore += Math.min(suspiciousLinks * 15, 30); reasons.push('Some account-related links lead to another domain.'); }
    if (passwordFields && location.protocol !== 'https:') { phishingScore += 35; reasons.push('A password field is present on an unencrypted page.'); }
    const result = {
      phishingScore: Math.min(phishingScore, 100),
      issues: reasons,
      isSuspicious: phishingScore >= 35,
      checkedAt: Date.now()
    };
    browserApi.runtime.sendMessage({ type: 'page-analysis', url: location.href, result }).catch(() => {});
    return result;
  };

  const addSearchLabels = async (settings) => {
    const searchPage = /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|search\.yahoo\.com)$/.test(location.hostname);
    if (!searchPage) return;
    const links = [...document.querySelectorAll('a[href^="http"]')]
      .filter((link) => { try { return new URL(link.href).hostname !== location.hostname; } catch { return false; } })
      .slice(0, settings.reputationEndpoint ? 12 : 80);
    for (const link of links) {
      if (link.dataset.browserguardChecked || !link.offsetParent) continue;
      link.dataset.browserguardChecked = 'true';
      try {
        let result = await browserApi.runtime.sendMessage({ type: 'classify-url', url: link.href });
        if (result?.level === 'safe' && settings.reputationEndpoint) {
          const reputation = await browserApi.runtime.sendMessage({ type: 'remote-reputation', url: link.href });
          if (reputation?.score >= 30) {
            result = { ...result, level: reputation.score >= 70 ? 'danger' : 'caution', reasons: [`Company reputation: ${reputation.label}`] };
          }
        }
        if (!result || result.level === 'safe') continue;
        const badge = document.createElement('span');
        badge.className = `browserguard-result browserguard-${result.level}`;
        badge.textContent = result.level === 'danger' ? 'Risky link' : 'Check link';
        badge.setAttribute('aria-label', `BrowserGuard: ${result.reasons.join(' ')}`);
        link.insertAdjacentElement('afterend', badge);
      } catch { return; }
    }
  };

  browserApi.runtime.sendMessage({ type: 'get-settings' }).then(({ settings }) => {
    if (!settings.enabled) return;
    const pageResult = settings.blockScams ? scanPage() : null;
    if (pageResult?.isSuspicious) {
      const notice = document.createElement('aside');
      notice.className = 'browserguard-notice';
      notice.setAttribute('role', 'status');
      const title = document.createElement('strong');
      title.textContent = 'BrowserGuard found page risks';
      const detail = document.createElement('span');
      detail.textContent = pageResult.issues[0];
      const dismiss = document.createElement('button');
      dismiss.type = 'button';
      dismiss.textContent = 'Dismiss';
      dismiss.addEventListener('click', () => notice.remove());
      notice.append(title, detail, dismiss);
      document.documentElement.append(notice);
    }
    if (!settings.safeSearch) return;
    addSearchLabels(settings);
    const observer = new MutationObserver(() => addSearchLabels(settings));
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 15000);
  }).catch(() => {});
})();