(() => {
  "use strict";
  let menu = null;
  let previousFocus = null;
  let notice = null;
  let timer;
  function close(restoreFocus = false) {
    if (!menu) return;
    menu.remove();
    menu = null;
    if (restoreFocus && previousFocus?.isConnected) previousFocus.focus();
    previousFocus = null;
  }
  function inform(text) {
    notice?.remove();
    clearTimeout(timer);
    notice = document.createElement("div");
    notice.setAttribute("role", "status");
    notice.textContent = text;
    Object.assign(notice.style, { position: "fixed", bottom: "24px", right: "24px",
      zIndex: "2147483647", padding: "12px", background: "#202124", color: "white",
      borderRadius: "8px", font: "14px system-ui", pointerEvents: "none" });
    document.documentElement.appendChild(notice);
    timer = setTimeout(() => { notice?.remove(); notice = null; }, 4000);
  }
  window.addEventListener("contextmenu", event => {
    close();
    if (!event.isTrusted || event.shiftKey) return;
    const el = event.composedPath().find(node => node instanceof Element);
    if (!el || el.closest('input, textarea, select, [contenteditable="true"]')) return;
    const link = el.closest("a[href]");
    const chip = el.closest("[data-eventid]");
    const url = link ? CalendarPlusURL.fromLink(link.href, location.href)
      : chip ? CalendarPlusURL.fromToken(chip.getAttribute("data-eventid"), location.href) : null;
    if (!url) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    previousFocus = document.activeElement;
    menu = document.createElement("div");
    Object.assign(menu.style, { position: "fixed", zIndex: "2147483647" });
    const shadow = menu.attachShadow({ mode: "closed" });
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Copier le lien de l’événement";
    Object.assign(button.style, { padding: "12px 16px", border: "1px solid #dadce0",
      borderRadius: "8px", background: "white", color: "#202124", font: "14px system-ui",
      cursor: "pointer", boxShadow: "0 2px 10px #0003", maxWidth: "calc(100vw - 16px)" });
    button.addEventListener("click", async click => {
      if (!click.isTrusted || button.disabled) return;
      click.preventDefault();
      click.stopPropagation();
      button.disabled = true;
      try {
        // Called directly inside the user gesture: no clipboardRead/Write permission.
        const writing = navigator.clipboard.writeText(url);
        close(true);
        await writing;
        inform("Lien de l’événement copié.");
      } catch {
        close(true);
        inform("Copie impossible. Réessayez depuis un onglet actif.");
      }
    });
    shadow.appendChild(button);
    document.documentElement.appendChild(menu);
    const rect = menu.getBoundingClientRect();
    const anchor = event.clientX || event.clientY ? {left:event.clientX, bottom:event.clientY}
      : el.getBoundingClientRect();
    menu.style.left = `${Math.max(8, Math.min(anchor.left, innerWidth - rect.width - 8))}px`;
    menu.style.top = `${Math.max(8, Math.min(anchor.bottom, innerHeight - rect.height - 8))}px`;
    button.focus();
  }, { capture: true });
  window.addEventListener("pointerdown", event => {
    if (menu && !event.composedPath().includes(menu)) close();
  }, { capture: true });
  window.addEventListener("keydown", event => {
    if (menu && (event.key === "Escape" || event.key === "Tab")) {
      close(true);
      if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); }
    }
  }, { capture: true });
  for (const type of ["scroll", "resize", "blur", "popstate", "hashchange"]) {
    window.addEventListener(type, () => close(), { capture: true });
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) close(); });
})();
