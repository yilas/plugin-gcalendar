"use strict";
importScripts("calendar-url.js");
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type !== "calendar-plus:open") return false;
  const source = sender.url;
  const target = typeof message.url === "string"
    ? CalendarPlusURL.fromLink(message.url, source) : null;
  if (sender.id !== chrome.runtime.id || sender.frameId !== 0 ||
      !Number.isInteger(sender.tab?.id) || !target || target !== message.url) {
    respond({ ok: false });
    return false;
  }
  // tabs.create does not need the broad "tabs" permission.
  chrome.storage.local.get("openInForeground").catch(() => ({})).then(settings => chrome.tabs.create({
    url: target, active: settings.openInForeground === true, windowId: sender.tab.windowId,
    openerTabId: sender.tab.id
  })).then(() => respond({ ok: true }), () => respond({ ok: false }));
  return true;
});
