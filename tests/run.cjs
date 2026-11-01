(async () => {
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const load = name => fs.readFileSync(path.join(root, name), 'utf8');
let count = 0;
async function test(name, fn) { await fn(); count++; console.log('OK ' + name); }
const context = vm.createContext({ URL, atob });
vm.runInContext(load('calendar-url.js'), context);
const api = context.CalendarPlusURL;
const token = Buffer.from('abc123_20261102T090000Z calendar@example.com').toString('base64').replace(/=+$/, '');
const current = 'https://calendar.google.com/calendar/u/1/r/week?authuser=second@example.com&ctz=Europe/Luxembourg';
const target = api.fromToken(token, current);
await test('Compte et fuseau conservés', () => {
  assert.ok(target.startsWith('https://calendar.google.com/calendar/u/1/r/eventedit/'));
  assert.equal(new URL(target).searchParams.get('authuser'), 'second@example.com');
  assert.equal(new URL(target).searchParams.get('ctz'), 'Europe/Luxembourg');
});
await test('Occurrence complète conservée', () => assert.equal(decodeURIComponent(new URL(target).pathname.split('/').pop()), token));
await test('Lien natif normalisé sur le compte source', () => assert.equal(api.fromLink('/calendar/r/eventedit/' + token, current), target));
await test('Ancien lien eid reconnu', () => assert.equal(api.fromLink('/calendar/event?eid=' + encodeURIComponent(token), current), target));
await test('Route sans numéro de compte', () => assert.ok(api.fromToken(token, 'https://calendar.google.com/calendar/r/week').includes('/calendar/r/eventedit/')));
await test('Refus des destinations externes et actions de création', () => {
  for (const href of ['https://evil.example/calendar/event?eid=' + token, 'javascript:alert(1)', '/calendar/r/eventedit', '/calendar/r/eventedit/duplicate/' + token]) {
    assert.equal(api.fromLink(href, current), null);
  }
});
await test('Refus des identifiants incomplets ou malformés', () => {
  for (const value of [null, '', 'abc123', '!!!!', Buffer.from('rawid').toString('base64'), 'a'.repeat(3000)]) {
    assert.equal(api.fromToken(value, current), null);
  }
});
await test('Refus des pages sources hors Calendar', () => assert.equal(api.fromToken(token, 'https://evil.example/calendar/r/week'), null));

const handlers = {};
const messages = [];
class FakeElement {
  constructor(kind, value) { this.kind = kind; this.value = value; this.href = value; }
  closest(selector) {
    if (selector === '[data-eventid]') return this.kind === 'chip' ? this : null;
    if (selector === 'a[href]') return this.kind === 'link' ? this : null;
    return this.kind === 'input' ? this : null;
  }
  getAttribute() { return this.value; }
}
Object.assign(context, {
  Element: FakeElement, location: { href: current },
  document: { documentElement: null },
  window: { addEventListener(type, handler) { handlers[type] = handler; } },
  chrome: { runtime: { sendMessage(msg, callback) { messages.push(msg); callback({ ok: true }); } } }
});
vm.runInContext(load('content.js'), context);
function event(button, element, trusted = true) {
  return { type: "auxclick", button, isTrusted: trusted, prevented: false, stopped: false,
    composedPath() { return [element]; },
    preventDefault() { this.prevented = true; },
    stopImmediatePropagation() { this.stopped = true; } };
}
await test('Clic du milieu : un seul message, défaut supprimé', () => {
  const e = event(1, new FakeElement('chip', token));
  handlers.mousedown(e); handlers.mouseup(e); handlers.auxclick(e);
  assert.equal(messages.length, 1); assert.equal(messages[0].url, target);
  assert.ok(e.prevented && e.stopped);
});
await test('Clics gauche/droit, synthétique, champ, zone vide et lien externe intacts', () => {
  for (const e of [event(0, new FakeElement('chip', token)), event(2, new FakeElement('chip', token)),
    event(1, new FakeElement('chip', token), false), event(1, new FakeElement('input', token)),
    event(1, new FakeElement('empty')), event(1, new FakeElement('link', 'https://meet.google.com/abc'))]) {
    handlers.auxclick(e); assert.equal(e.prevented, false);
  }
  assert.equal(messages.length, 1);
});
await test('Identifiant inconnu : aucun onglet', () => {
  handlers.auxclick(event(1, new FakeElement('chip', 'unknown')));
  assert.equal(messages.length, 1);
});

await test('Raccourcis : Ctrl sous Linux/Windows, Cmd sous macOS, un seul message', () => {
  for (const platform of ['Linux', 'Win32', 'MacIntel']) {
    context.navigator = { platform };
    const before = messages.length;
    const e = Object.assign(event(0, new FakeElement('chip', token)), {
      type: 'click', ctrlKey: platform !== 'MacIntel', metaKey: platform === 'MacIntel'
    });
    handlers.pointerdown(e); handlers.mousedown(e); handlers.mouseup(e); handlers.click(e);
    assert.equal(messages.length, before + 1); assert.ok(e.prevented);
  }
});
await test('Raccourcis : mauvais modificateur, Shift, Alt et clic synthétique ignorés', () => {
  context.navigator = { platform: 'MacIntel' };
  const before = messages.length;
  for (const mods of [{ctrlKey:true}, {metaKey:true,shiftKey:true}, {metaKey:true,altKey:true},
    {metaKey:true,ctrlKey:true}, {metaKey:true,isTrusted:false}]) {
    const e = Object.assign(event(0, new FakeElement('chip', token)), {type:'click'}, mods);
    handlers.click(e); assert.equal(e.prevented, false);
  }
  assert.equal(messages.length, before);
});
await test('Raccourcis : champs et liens externes restent natifs', () => {
  const before = messages.length;
  for (const element of [new FakeElement('input'), new FakeElement('link', 'https://example.com')]) {
    const e = Object.assign(event(0, element), {type:'click', metaKey:true});
    handlers.click(e); assert.equal(e.prevented, false);
  }
  assert.equal(messages.length, before);
});

let receive;
const tabs = [];
const worker = vm.createContext({ URL, atob,
  chrome: { storage: { local: { get: async () => ({}) } }, runtime: { id: 'test-id', onMessage: { addListener(fn) { receive = fn; } } },
    tabs: { create(options) { tabs.push(options); return Promise.resolve({ id: 99 }); } } }
});
worker.importScripts = name => vm.runInContext(load(name), worker);
vm.runInContext(load('background.js'), worker);
const sender = { id: 'test-id', frameId: 0, url: current, tab: { id: 7, windowId: 2 } };
await test('Worker : onglet inactif dans la même fenêtre', async () => {
  assert.equal(receive({ type: 'calendar-plus:open', url: target }, sender, () => {}), true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(tabs.length, 1); assert.equal(tabs[0].active, false);
  assert.equal(tabs[0].windowId, 2); assert.equal(tabs[0].openerTabId, 7);
});
await test('Worker : rejet origine, compte altéré et sous-cadre', () => {
  for (const [url, s] of [['https://evil.example', sender], [target.replace('/u/1/', '/u/0/'), sender],
    [target, { ...sender, frameId: 1 }], [target, { ...sender, id: 'other' }]]) {
    let response;
    assert.equal(receive({ type: 'calendar-plus:open', url }, s, r => { response = r; }), false);
    assert.equal(response.ok, false);
  }
  assert.equal(tabs.length, 1);
});
const manifest = JSON.parse(load('manifest.json'));
await test('Manifest : scripts présents, pas de permissions globales', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.ok(fs.existsSync(path.join(root, manifest.action.default_popup)));
  for (const file of [...manifest.content_scripts[0].js, manifest.background.service_worker]) assert.ok(fs.existsSync(path.join(root, file)));
});
await require('./preferences.cjs')({ test, load });
await require('./copy-link.cjs')({ test, load });
console.log(`${count} tests réussis (environnement simulé, sans session Google Calendar).`);

})().catch(error => { console.error(error); process.exitCode = 1; });
