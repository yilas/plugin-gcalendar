const assert = require('node:assert/strict');
const vm = require('node:vm');
const tick = () => new Promise(resolve => setImmediate(resolve));
module.exports = async ({ test, load }) => {
  const token = Buffer.from('event123 calendar@example.com').toString('base64');
  const source = 'https://calendar.google.com/calendar/u/1/r/week';
  function worker(get, failTab = false) {
    const calls = []; let receive;
    const context = vm.createContext({ URL, atob, chrome: {
      runtime: { id: 'extension', onMessage: { addListener(fn) { receive = fn; } } },
      storage: { local: { get } },
      tabs: { async create(options) { if (failTab) throw Error('tab'); calls.push(options); } }
    }});
    context.importScripts = file => vm.runInContext(load(file), context);
    vm.runInContext(load('background.js'), context);
    return { calls, open: () => new Promise(resolve => receive(
      { type: 'calendar-plus:open', url: context.CalendarPlusURL.fromToken(token, source) },
      { id: 'extension', frameId: 0, url: source, tab: { id: 1, windowId: 2 } }, resolve)) };
  }
  await test('Préférence : seuls les booléens true activent le nouvel onglet', async () => {
    for (const value of [undefined, false, true, 'true', 1]) {
      const w = worker(async () => ({ openInForeground: value }));
      assert.equal((await w.open()).ok, true);
      assert.equal(w.calls[0].active, value === true);
    }
  });
  await test('Préférence relue à chaque ouverture, y compris après redémarrage du worker', async () => {
    let value = false; const get = async () => ({ openInForeground: value });
    const w = worker(get); await w.open(); value = true; await w.open();
    assert.deepEqual(w.calls.map(c => c.active), [false, true]);
    const restarted = worker(get); await restarted.open(); assert.equal(restarted.calls[0].active, true);
  });
  await test('Lecture du stockage en échec : ouverture en arrière-plan', async () => {
    const w = worker(async () => { throw Error('storage'); });
    assert.equal((await w.open()).ok, true); assert.equal(w.calls[0].active, false);
  });
  await test('Erreur de création de l’onglet signalée au contenu', async () => {
    assert.equal((await worker(async () => ({}), true).open()).ok, false);
  });
  function popup(get, set) {
    const checkbox = { disabled: true, checked: false, addEventListener(_, fn) { this.change = fn; } };
    const status = { textContent: 'Chargement…' };
    const context = vm.createContext({ document: { getElementById: id => id === 'foreground' ? checkbox : status },
      chrome: { storage: { local: { get, set } } } });
    vm.runInContext(load('popup.js'), context);
    return { checkbox, status };
  }
  await test('Popup : chargement du choix et sauvegarde dans les deux sens', async () => {
    const writes = []; const p = popup(async () => ({openInForeground:true}), async value => writes.push(value.openInForeground));
    assert.equal(p.checkbox.disabled, true); await tick();
    assert.equal(p.checkbox.checked, true); assert.equal(p.checkbox.disabled, false);
    p.checkbox.checked = false; await p.checkbox.change();
    p.checkbox.checked = true; await p.checkbox.change();
    assert.deepEqual(writes, [false, true]); assert.match(p.status.textContent, /enregistrée/);
  });
  await test('Popup : échec de sauvegarde restaure le choix précédent', async () => {
    const p = popup(async () => ({}), async () => {throw Error('write');}); await tick();
    p.checkbox.checked = true; await p.checkbox.change();
    assert.equal(p.checkbox.checked, false); assert.equal(p.checkbox.disabled, false);
    assert.match(p.status.textContent, /impossible/);
  });
  await test('Popup : échec de lecture laisse le réglage désactivé', async () => {
    const p = popup(async () => {throw Error('read');}, async () => {}); await tick();
    assert.equal(p.checkbox.disabled, true); assert.match(p.status.textContent, /Lecture impossible/);
  });
};
