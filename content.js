(() => {
  "use strict";
  const urls = globalThis.CalendarPlusURL;
  let notice;
  let timer;
  function inform(text) {
    if (!document.documentElement) return;
    if (!notice) {
      notice = document.createElement("div");
      notice.setAttribute("role", "status");
      Object.assign(notice.style, {
        position: "fixed", bottom: "24px", left: "24px", zIndex: "2147483647",
        padding: "12px 18px", background: "#202124", color: "white",
        borderRadius: "8px", font: "14px system-ui", maxWidth: "420px",
        pointerEvents: "none", boxShadow: "0 2px 10px #0004"
      });
    }
    notice.textContent = text;
    document.documentElement.appendChild(notice);
    clearTimeout(timer);
    timer = setTimeout(() => notice.remove(), 5000);
  }
  function resolve(event) {
    const el = event.composedPath().find(node => node instanceof Element);
    if (!el || el.closest('input, textarea, select, [contenteditable="true"]')) return {};
    const link = el.closest("a[href]");
    if (link) {
      // Ordinary links (Meet, attachments, etc.) retain native middle-click.
      return { url: urls.fromLink(link.href, location.href) };
    }
    const chip = el.closest("[data-eventid]");
    if (!chip) return {};
    return { chip, url: urls.fromToken(chip.getAttribute("data-eventid"), location.href) };
  }
  function consume(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  function shortcut(event) {
    const platform = globalThis.navigator?.userAgentData?.platform || globalThis.navigator?.platform || "";
    const mac = /mac/i.test(platform);
    return event.button === 0 && !event.altKey && !event.shiftKey &&
      (mac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey);
  }
  // Delegation handles navigation and dynamically inserted calendar events.
  for (const type of ["pointerdown", "mousedown", "mouseup"]) {
    window.addEventListener(type, event => {
      if (!event.isTrusted || (event.button !== 1 && !shortcut(event))) return;
      if (resolve(event).url) consume(event);
    }, { capture: true, passive: false });
  }
  function openEvent(event) {
    if (!event.isTrusted || !(event.type === "auxclick" ? event.button === 1 : shortcut(event))) return;
    const { url, chip } = resolve(event);
    if (!url) {
      if (chip) inform("Calendar Plus : format d’événement non reconnu. Aucun onglet ouvert.");
      return;
    }
    consume(event);
    try {
      chrome.runtime.sendMessage({ type: "calendar-plus:open", url }, response => {
        if (chrome.runtime.lastError || !response?.ok) {
          inform("Calendar Plus : ouverture impossible. Rechargez la page et réessayez.");
        }
      });
    } catch {
      inform("Calendar Plus : rechargez Google Calendar après la mise à jour de l’extension.");
    }
  }
  for (const type of ["auxclick", "click"]) {
    window.addEventListener(type, openEvent, { capture: true, passive: false });
  }
})();
