const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');
const root = path.join(__dirname, '..');
const workflow = YAML.parse(fs.readFileSync(path.join(root, '.github/workflows/regression.yml'), 'utf8'), {uniqueKeys:true});
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

test('Every PR and new commit is tested, including stacked PRs and documentation changes', () => {
  assert.ok(workflow.on.pull_request);
  for (const event of ['opened','synchronize','reopened']) {
    assert.ok(workflow.on.pull_request.types.includes(event));
  }
  for (const filter of ['branches','branches-ignore','paths','paths-ignore']) {
    assert.equal(workflow.on.pull_request[filter], undefined);
  }
  assert.equal(workflow.on.pull_request_target, undefined);
});
test('Both suites are required by the workflow, with no ignored failures or skipped jobs', () => {
  assert.ok(workflow.jobs.unit.steps.some(step => step.run === 'npm test'));
  assert.ok(workflow.jobs.browser.steps.some(step => step.run === 'npm run test:browser'));
  assert.match(pkg.scripts.test, /node tests\/run.cjs/);
  assert.equal(pkg.scripts['test:browser'], 'node tests/browser-copy.cjs');
  for (const job of Object.values(workflow.jobs)) {
    assert.equal(job['continue-on-error'],undefined);
    assert.equal(job.if,undefined);
    assert.ok(job['timeout-minutes'] > 0);
    for (const step of job.steps) {
      assert.equal(step['continue-on-error'],undefined);
      assert.equal(step.if,undefined);
      if (step.run) assert.doesNotMatch(step.run,/\|\|\s*(true|exit\s+0)/);
    }
  }
});
test('Checkout tests the PR merge commit and credentials are not retained', () => {
  assert.deepEqual(workflow.permissions, {contents:'read'});
  for (const job of Object.values(workflow.jobs)) {
    const checkout = job.steps.find(step => step.uses?.startsWith('actions/checkout@'));
    assert.ok(checkout);
    assert.equal(checkout.with.ref,undefined);
    assert.equal(checkout.with['persist-credentials'],false);
    assert.ok(job.steps.some(step => step.run === 'npm ci'));
  }
});
test('Browser dependencies are installed before the browser regression runs', () => {
  const steps = workflow.jobs.browser.steps;
  const install = steps.findIndex(step => step.run === 'npx playwright install --with-deps chromium');
  const run = steps.findIndex(step => step.run === 'npm run test:browser');
  assert.ok(install >= 0 && run > install);
  assert.match(pkg.devDependencies.playwright,/^\d+\.\d+\.\d+$/);
});
