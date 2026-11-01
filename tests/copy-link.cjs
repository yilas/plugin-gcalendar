const assert = require('node:assert/strict');
const vm = require('node:vm');
module.exports = async ({test, load}) => {
  function setup(writeText = async () => {}) {
    const handlers = {}; const nodes = []; const copied = [];
    class El {
      constructor(kind = '', value = '') { this.kind = kind; this.value = value; this.href = value;
        this.style = {}; this.listeners = {}; this.children = []; this.isConnected = true; }
      closest(selector) {
        if (selector === 'a[href]') return this.kind === 'link' ? this : null;
        if (selector === '[data-eventid]') return this.kind === 'chip' ? this : null;
        return this.kind === 'input' ? this : null;
      }
      getAttribute() { return this.value; }
      setAttribute() {}
      appendChild(el) { this.children.push(el); }
      attachShadow() { this.shadow = new El(); return this.shadow; }
      addEventListener(type, fn) { this.listeners[type] = fn; }
      remove() { this.isConnected = false; }
      focus() { this.focused = true; }
      getBoundingClientRect() { return {left:10,bottom:30,width:240,height:45}; }
    }
    const previous = new El();
    const doc = { activeElement: previous, documentElement: new El(), hidden: false,
      createElement(tag) { const el = new El(tag); nodes.push(el); return el; },
      addEventListener(type, fn) { handlers[type] = fn; } };
    const token = Buffer.from('event123_20261102T090000Z shared@example.com').toString('base64');
    const current = 'https://calendar.google.com/calendar/u/2/r/week?authuser=user@example.com';
    const context = vm.createContext({ URL, atob, Element:El, document:doc, location:{href:current},
      innerWidth:800, innerHeight:600, setTimeout:() => 1, clearTimeout:() => {},
      navigator:{clipboard:{writeText(url) {copied.push(url); return writeText(url);}}},
      window:{addEventListener(type, fn) { handlers[type] = fn; }} });
    vm.runInContext(load('calendar-url.js'), context);
    vm.runInContext(load('copy-link.js'), context);
    const event = (el = new El('chip',token), overrides = {}) => Object.assign({
      isTrusted:true, shiftKey:false, clientX:790, clientY:590, prevented:false,
      composedPath:() => [el], preventDefault() {this.prevented=true;},
      stopImmediatePropagation(){}, stopPropagation(){}
    }, overrides);
    return { handlers,nodes,copied,event,El,previous,doc,token,context,current,
      button:() => nodes.filter(n => n.kind === 'button').at(-1),
      host:() => nodes.find(n => n.shadow),
      message:() => nodes.filter(n => n.textContent?.includes('copié') || n.textContent?.includes('impossible')).at(-1) };
  }
  await test('Copie : bon compte, calendrier et occurrence, confirmation après réussite', async () => {
    const s = setup(); const e = s.event(); s.handlers.contextmenu(e);
    assert.equal(e.prevented,true); assert.equal(s.copied.length,0);
    await s.button().listeners.click(s.event());
    assert.equal(s.copied.length,1);
    assert.equal(s.copied[0],s.context.CalendarPlusURL.fromToken(s.token,s.current));
    assert.match(s.message().textContent,/copié/); assert.equal(s.previous.focused,true);
  });
  await test('Copie : échec du presse-papiers signalé sans fausse confirmation', async () => {
    const s = setup(async () => {throw Error('denied');}); s.handlers.contextmenu(s.event());
    await s.button().listeners.click(s.event()); assert.match(s.message().textContent,/impossible/);
  });
  await test('Copie : menu natif conservé pour Shift, champs, liens externes et identifiants inconnus', async () => {
    const s = setup();
    for (const e of [s.event(undefined,{shiftKey:true}),s.event(undefined,{isTrusted:false}),
      s.event(new s.El('input')),s.event(new s.El('link','https://example.com')),
      s.event(new s.El('chip','unknown')),s.event(new s.El())]) {
      s.handlers.contextmenu(e); assert.equal(e.prevented,false);
    }
    assert.equal(s.nodes.length,0); assert.equal(s.copied.length,0);
  });
  await test('Copie : liens natifs reconnus', async () => {
    const s=setup(); s.handlers.contextmenu(s.event(new s.El('link','/calendar/r/eventedit/'+s.token)));
    await s.button().listeners.click(s.event()); assert.equal(s.copied.length,1);
  });
  await test('Copie : fermeture par Échap, clic extérieur, défilement et changement de page', async () => {
    for (const type of ['keydown','pointerdown','scroll','popstate','blur','visibilitychange']) {
      const s=setup(); s.handlers.contextmenu(s.event()); s.doc.hidden=true;
      s.handlers[type](s.event(undefined,{key:'Escape'}));
      assert.equal(s.host().isConnected,false); assert.equal(s.copied.length,0);
    }
  });
  await test('Copie : menu dans le viewport et focus clavier', async () => {
    const s=setup(); s.handlers.contextmenu(s.event());
    assert.equal(s.host().style.left,'552px'); assert.equal(s.host().style.top,'547px');
    assert.equal(s.button().focused,true);
  });
  await test('Copie : clic synthétique refusé et double activation ignorée', async () => {
    let finish; const s=setup(() => new Promise(resolve => {finish=resolve;})); s.handlers.contextmenu(s.event());
    await s.button().listeners.click(s.event(undefined,{isTrusted:false})); assert.equal(s.copied.length,0);
    const first=s.button().listeners.click(s.event());
    await s.button().listeners.click(s.event()); assert.equal(s.copied.length,1);
    finish(); await first;
  });
};
