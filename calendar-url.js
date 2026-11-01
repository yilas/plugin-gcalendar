/* Shared by the isolated content script and the service worker. No network. */
(() => {
  "use strict";
  const ORIGIN = "https://calendar.google.com";
  function page(value) {
    try {
      const u = new URL(value);
      return u.origin === ORIGIN && !u.username && !u.password &&
        /^\/calendar\//.test(u.pathname) ? u : null;
    } catch { return null; }
  }
  function prefix(u) {
    const m = u.pathname.match(/^\/calendar\/u\/(\d+)(?:\/|$)/);
    return m ? `/calendar/u/${m[1]}/r` : "/calendar/r";
  }
  function tokenOK(token) {
    if (typeof token !== "string" || token.length > 2048 ||
        !/^[A-Za-z0-9_+\/-]+={0,2}$/.test(token)) return false;
    try {
      // Only accept encoded event + calendar pairs. Never guess an account
      // from an opaque/raw event ID, and never strip a recurrence suffix.
      const decoded = atob(token.replace(/-/g, "+").replace(/_/g, "/"));
      return /^[A-Za-z0-9_-]+ [^\s\x00-\x1f\x7f]+$/.test(decoded);
    } catch { return false; }
  }
  function fromToken(token, current) {
    const source = page(current);
    if (!source || !tokenOK(token)) return null;
    const target = new URL(`${prefix(source)}/eventedit/${encodeURIComponent(token)}`, ORIGIN);
    for (const key of ["authuser", "ctz"]) {
      if (source.searchParams.has(key)) target.searchParams.set(key, source.searchParams.get(key));
    }
    return target.href;
  }
  function fromLink(href, current) {
    const source = page(current);
    if (!source) return null;
    try {
      const link = page(new URL(href, source).href);
      if (!link) return null;
      const match = link.pathname.match(/^\/calendar\/(?:u\/\d+\/)?r\/eventedit\/([^/]+)\/?$/);
      const legacy = /^\/calendar\/(?:u\/\d+\/)?(?:event|render)\/?$/.test(link.pathname);
      const token = match ? decodeURIComponent(match[1]) : legacy ? link.searchParams.get("eid") : null;
      return fromToken(token, current);
    } catch { return null; }
  }
  globalThis.CalendarPlusURL = Object.freeze({ page, fromToken, fromLink });
})();
