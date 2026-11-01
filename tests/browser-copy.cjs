// Optional real-browser regression: npm install --no-save playwright
// then npx playwright install chromium; node tests/browser-copy.cjs
// No Google connection: every request is fulfilled with the local fixture.
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const token = Buffer.from('event123 calendar@example.com').toString('base64');
    await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body:
      `<button id="event" data-eventid="${token}">Test event</button><button id="other">Other</button>` }));
    await page.goto('https://calendar.google.com/calendar/u/0/r/week');
    await page.evaluate(() => {
      window.copied = [];
      Object.defineProperty(navigator, 'clipboard', {value:{writeText: async text => { window.copied.push(text); }}});
    });
    await page.addScriptTag({path:path.join(__dirname,'../calendar-url.js')});
    await page.addScriptTag({path:path.join(__dirname,'../copy-link.js')});
    // Focused event -> real right-click -> focus transfer into the closed shadow root.
    await page.locator('#event').focus();
    await page.locator('#event').click({button:'right'});
    assert.equal(await page.evaluate(() => document.activeElement?.style.position), 'fixed',
      'The contextual menu must remain focused and connected after right-click');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.copied.length === 1);
    assert.equal(await page.evaluate(() => window.copied[0]),
      `https://calendar.google.com/calendar/u/0/r/eventedit/${encodeURIComponent(token)}`);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'event');
    await page.locator('#event').click({button:'right'});
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'event');
    assert.equal(await page.evaluate(() => window.copied.length),1);
    assert.deepEqual(errors,[]);
    console.log('Chromium: real right-click, focus, Enter-to-copy and Escape passed (local fixture, mocked clipboard).');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
