/* Optional analytics load only after an explicit choice. No vendor requests on denial. */
(function () {
  'use strict';
  const config = JSON.parse(document.getElementById('privacy-config').textContent);
  const key = 'site-privacy-v1';
  let choice = {analytics: false, content: false}, saved = false, started = false;
  const active = {analytics: false, content: false};
  let returnFocus, localArea;
  let forcedOff = new URLSearchParams(location.search).get('privacy') === 'off';
  function parseChoice(raw) {
    try {
      const value = JSON.parse(raw);
      if (value && value.version === 1 && typeof value.analytics === 'boolean' && typeof value.content === 'boolean') {
        return {version: 1, analytics: value.analytics, content: !!config.content && value.content};
      }
    } catch (_) { /* Invalid or missing records grant nothing. */ }
    return null;
  }
  try {
    localArea = localStorage;
    const value = !forcedOff && parseChoice(localArea.getItem(key));
    if (value) { choice = value; saved = true; }
  } catch (_) { /* Storage failure keeps the safe default. */ }
  const panel = document.createElement('section');
  panel.id = 'privacy-panel'; panel.setAttribute('aria-labelledby', 'privacy-title');
  panel.innerHTML = '<h2 id="privacy-title" tabindex="-1">Your privacy choices</h2>' +
    '<p>Optional analytics help us understand visits. Choose what to allow; you can change your mind using Privacy choices.</p>' +
    '<label><input id="privacy-analytics" type="checkbox"> Analytics (' + config.vendors + ')</label>' +
    (config.content ? '<label><input id="privacy-content" type="checkbox"> External content (SociableKIT reel images and updates)</label>' : '') +
    '<p class="privacy-note">Site features and saving this choice are separate from optional analytics. <a href="' + config.policy + '">Read the privacy notice</a>.</p>' +
    '<div class="privacy-actions"><button type="button" data-choice="accept">Accept all</button><button type="button" data-choice="reject">Reject optional</button><button type="button" data-choice="save">Save choices</button></div>' +
    '<p class="privacy-note">Turning off an active service reloads this page to stop its scripts. Previously sent data cannot be recalled here.</p><p id="privacy-status" role="status"></p>';
  const reopen = document.createElement('button');
  reopen.type = 'button'; reopen.id = 'privacy-reopen'; reopen.textContent = 'Privacy choices';
  reopen.setAttribute('aria-controls', panel.id); reopen.setAttribute('aria-expanded', String(!saved));
  document.body.append(panel, reopen);
  const analytics = panel.querySelector('#privacy-analytics');
  const content = panel.querySelector('#privacy-content');
  function sync() { analytics.checked = choice.analytics; if (content) content.checked = choice.content; }
  function script(src, done) {
    const s = document.createElement('script'); s.src = src; s.async = true;
    if (done) s.onload = done;
    document.head.appendChild(s);
  }
  function start() {
    if (!choice.analytics || started || !config.production) return;
    started = true;
    active.analytics = !!(config.ga || config.metricool);
    if (config.ga) {
      window['ga-disable-' + config.ga] = false;
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { if (choice.analytics) window.dataLayer.push(arguments); };
      window.gtag('js', new Date()); window.gtag('config', config.ga);
      script('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(config.ga));
    }
    if (config.metricool) script('https://tracker.metricool.com/resources/be.js', function () {
      if (choice.analytics && window.beTracker) window.beTracker.t({hash: config.metricool});
    });
  }
  function clearAnalyticsCookies() {
    document.cookie.split(';').forEach(function (item) {
      const name = item.trim().split('=')[0];
      if (!/^(_ga($|_)|_gid$|_gat($|_))/.test(name)) return;
      const parts = location.hostname.split('.');
      const domains = [''];
      for (let i = 0; i < parts.length - 1; i++) domains.push(parts.slice(i).join('.'));
      domains.forEach(function (domain) {
        document.cookie = name + '=; Max-Age=0; path=/' + (domain ? '; domain=' + domain : '') + '; SameSite=Lax';
      });
    });
  }
  window.sitePrivacy = {
    allows: function (purpose) { return choice[purpose] === true; },
    // The content loader reports actual work, not merely a saved permission.
    markActive: function (purpose) {
      if (purpose === 'content' && choice.content) active.content = true;
    }
  };
  function withdrawing(next) {
    return (active.analytics && !next.analytics) || (active.content && !next.content);
  }
  function stopDenied() {
    if (!choice.analytics) {
      window['ga-disable-' + config.ga] = true; window.gtag = undefined; clearAnalyticsCookies();
    }
    if (!choice.content && config.content) { try { localStorage.removeItem('arlo-reels-v1'); } catch (_) {} }
  }
  function notify() { document.dispatchEvent(new CustomEvent('privacychange', {detail: choice})); }
  function close() {
    panel.hidden = true; reopen.setAttribute('aria-expanded', 'false');
    (returnFocus && returnFocus.isConnected ? returnFocus : reopen).focus();
  }
  reopen.addEventListener('click', function () {
    returnFocus = document.activeElement; sync(); panel.hidden = false;
    reopen.setAttribute('aria-expanded', 'true'); panel.querySelector('h2').focus();
  });
  panel.addEventListener('keydown', function (event) { if (event.key === 'Escape') close(); });
  panel.addEventListener('click', function (event) {
    const action = event.target.dataset.choice; if (!action) return;
    const next = {version: 1, analytics: action === 'accept' || (action === 'save' && analytics.checked), content: !!config.content && (action === 'accept' || (action === 'save' && content.checked))};
    const withdraw = withdrawing(next);
    choice = next;
    let persisted = true;
    try { localStorage.setItem(key, JSON.stringify(choice)); } catch (_) { persisted = false; }
    stopDenied();
    sync(); notify();
    if (withdraw) {
      if (!persisted) {
        try { localStorage.removeItem(key); } catch (_) { /* URL override fails closed for this reload. */ }
        const url = new URL(location.href); url.searchParams.set('privacy', 'off');
        location.replace(url.href); return;
      }
      location.reload(); return;
    }
    if (persisted && forcedOff) {
      const url = new URL(location.href); url.searchParams.delete('privacy');
      history.replaceState(null, '', url.href); forcedOff = false;
    }
    start();
    if (persisted) close();
    else panel.querySelector('#privacy-status').textContent = 'Your choice applies to this page only because browser storage is unavailable.';
  });
  window.addEventListener('storage', function (event) {
    if (!localArea || event.storageArea !== localArea || (event.key !== key && event.key !== null)) return;
    let value;
    try {
      // Read the current record: queued events may describe an older choice.
      value = !forcedOff && parseChoice(localArea.getItem(key));
    } catch (_) { value = null; }
    const next = value || {analytics: false, content: false};
    if (next.analytics === choice.analytics && next.content === choice.content) return;
    const withdraw = withdrawing(next);
    choice = next; saved = !!value;
    stopDenied(); sync(); notify();
    if (withdraw) { location.reload(); return; }
    start();
    panel.querySelector('#privacy-status').textContent = 'Privacy choices updated in another tab.';
    // Do not close the panel, move focus or reload an idle form/payment page.
  });
  sync(); panel.hidden = saved; start(); notify();
}());
