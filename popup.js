"use strict";
const foreground = document.getElementById("foreground");
const status = document.getElementById("status");
let saved = false;
chrome.storage.local.get("openInForeground").then(settings => {
  saved = settings.openInForeground === true;
  foreground.checked = saved;
  foreground.disabled = false;
  status.textContent = "";
}).catch(() => {
  status.textContent = "Lecture impossible. Fermez et rouvrez ce panneau.";
});
foreground.addEventListener("change", async () => {
  const value = foreground.checked;
  foreground.disabled = true;
  try {
    await chrome.storage.local.set({ openInForeground: value });
    saved = value;
    status.textContent = "Préférence enregistrée.";
  } catch {
    foreground.checked = saved;
    status.textContent = "Enregistrement impossible. Réessayez.";
  } finally {
    foreground.disabled = false;
  }
});
