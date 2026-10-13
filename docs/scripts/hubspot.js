/* ============================================================================
   HUBSPOT COPY (AFS-157, 2026-10-13). After a SUCCESSFUL Webflow submit of form#contact-form-a, the same
   nine answers are POSTed to HubSpot's Forms API (submissions v3, public endpoint, no token) as a
   submission of the operator's 'Contact Form' (portal 14549061). The Webflow HubSpot app could not map
   the two selects or the textarea, so this replaces it.
   Fail-safe: this file only READS the form. It never blocks, delays or changes Webflow's submit or its
   success / fail message; a HubSpot error or timeout is swallowed (no console output). The values are
   taken when the submit actually goes out (the ALTCHA glue stops the held one before it bubbles here)
   and sent only once Webflow shows its success box; a fail box drops them.
   hutk (HubSpot's `hubspotutk` cookie) is sent only when the visitor accepted analytics in the site's
   banner (afissio_cookie_consent, revision 1). No tracking code, no cookie of its own.
   One IIFE · own guard · no globals · no DOMContentLoaded (the tag is defer).
   ============================================================================ */
(function () {
  if (window.__afissioHubspotCopyV1) return; window.__afissioHubspotCopyV1 = 1;

  const ENDPOINT = 'https://api.hsforms.com/submissions/v3/integration/submit/14549061/83a43d8f-3fdf-42b6-9440-4838cf6bfaa4';
  const CONSENT = { cookieName: 'afissio_cookie_consent', revision: 1 };
  // HubSpot contact property <- the form field: the first of these ids found inside the form, else the name.
  const FIELDS = [
    ['firstname', ['firstname-2', 'firstname'], 'firstname'],
    ['lastname', ['LastName', 'lastname'], 'lastname'],
    ['email', ['Email', 'a-email'], ''],
    ['phone', ['Phone', 'a-phone'], ''],
    ['company', ['Company', 'a-company'], ''],
    ['jobtitle', ['JobTitle', 'a-title'], 'jobtitle'],
    ['anticipated_transaction', ['Transaction', 'a-transaction'], ''],
    ['expected_timeline', ['Timeline', 'a-timeline'], ''],
    ['message', ['Message', 'a-message'], '']
  ];
  const WAIT_MS = 30000;    // a success box shown later than this after the submit is not this submit's
  const TIMEOUT_MS = 8000;  // the HubSpot request is abandoned after this

  function fieldOf(form, ids, name) {
    for (let i = 0; i < ids.length; i++) {
      const el = document.getElementById(ids[i]);
      if (el && form.contains(el)) return el;
    }
    return name ? form.querySelector('[name="' + name + '"]') : null;
  }

  function snapshot(form) {
    const out = [];
    FIELDS.forEach(function (f) {
      const el = fieldOf(form, f[1], f[2]);
      const v = el && typeof el.value === 'string' ? el.value.trim() : '';
      if (v) out.push({ objectTypeId: '0-1', name: f[0], value: v });
    });
    return out;
  }

  function readCookie(name) {
    try {
      const parts = document.cookie.split(';');
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i].replace(/^\s+/, '');
        if (p.indexOf(name + '=') === 0) return decodeURIComponent(p.slice(name.length + 1));
      }
    } catch (e) { /* no cookie access: treated as absent */ }
    return '';
  }

  function analyticsAllowed() {
    try {
      const c = JSON.parse(readCookie(CONSENT.cookieName) || 'null');
      return !!(c && c.revision === CONSENT.revision && Array.isArray(c.categories) && c.categories.indexOf('analytics') !== -1);
    } catch (e) { return false; } // a missing or garbled cookie means: no consent
  }

  function buildPayload(fields, pageUri, pageName, hutk) {
    const context = { pageUri: pageUri, pageName: pageName };
    if (hutk) context.hutk = hutk;
    return { fields: fields, context: context };
  }

  function post(body) {
    try {
      const ctl = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = ctl ? setTimeout(function () { try { ctl.abort(); } catch (e) { /* no-op */ } }, TIMEOUT_MS) : null;
      const done = function () { if (timer) clearTimeout(timer); };
      fetch(ENDPOINT, {
        // No keepalive: the success box shows on the same page (no navigation), and a keepalive
        // request that needs a CORS preflight (JSON) is refused by some browsers.
        method: 'POST', mode: 'cors', credentials: 'omit',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        signal: ctl ? ctl.signal : undefined
      }).then(done, done);
    } catch (e) { /* no fetch, a bad body: the visitor's submit is already done */ }
  }

  function shown(el) {
    if (!el) return false;
    if (el.style.display === 'block') return true;   // what Webflow's form script sets
    return el.style.display !== 'none' && el.getClientRects().length > 0;
  }

  function arm(form) {
    const wrap = form.parentNode;
    const done = wrap && wrap.querySelector('.w-form-done');
    const fail = wrap && wrap.querySelector('.w-form-fail');
    if (!done) return;
    let pending = null;
    // Bubble phase on the document: a submit the ALTCHA glue holds back is stopped at the form
    // (capture + stopImmediatePropagation) and never arrives here; the one it releases does.
    document.addEventListener('submit', function (e) {
      if (e.target === form) pending = { fields: snapshot(form), at: Date.now() };
    });
    const obs = new MutationObserver(function () {
      if (!pending) return;
      if (shown(fail)) { pending = null; return; }
      if (!shown(done)) return;
      const p = pending; pending = null;
      if (!p.fields.length || Date.now() - p.at > WAIT_MS) return;
      post(buildPayload(p.fields, location.href, document.title, analyticsAllowed() ? readCookie('hubspotutk') : ''));
    });
    obs.observe(done, { attributes: true, attributeFilter: ['style', 'class'] });
    if (fail) obs.observe(fail, { attributes: true, attributeFilter: ['style', 'class'] });
  }

  if (window.__AFS_HS_TEST__ && typeof window.__AFS_HS_TEST__ === 'object') {
    window.__AFS_HS_TEST__.api = { snapshot: snapshot, buildPayload: buildPayload, analyticsAllowed: analyticsAllowed, endpoint: ENDPOINT };
  }
  const form = document.getElementById('contact-form-a');
  if (form && form.tagName === 'FORM') arm(form);
})();
