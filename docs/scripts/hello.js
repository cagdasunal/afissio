/* Afissio serving smoke test — proves build → GitHub Pages → page embed. Safe to load anywhere; does nothing visible. */
(function () {
  if (window.__afissioHelloV1) return;
  window.__afissioHelloV1 = true;
  window.afissioHello = function () { return 'afissio scripts ok'; };
})();
