/**
 * Smoke test for the CLI (`npm run test:cli`).
 * Runs the built bin/cli.cjs against test/fixtures/sample.csv and checks
 * lang filtering, the en-us-ct filename, --values mode, and the summary.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(root, 'bin', 'cli.cjs');
const fixture = join(root, 'test', 'fixtures', 'sample.csv');

function run(args, opts = {}) {
  try {
    return { out: execFileSync(process.execPath, [cli, ...args], { encoding: 'utf8', ...opts }), code: 0 };
  } catch (e) {
    return { out: `${e.stdout ?? ''}${e.stderr ?? ''}`, code: e.status ?? 1 };
  }
}

let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ok    ${name}`); }
  catch (e) { failed++; console.error(`  FAIL  ${name}\n        ${e.message}`); }
}

const tmp = mkdtempSync(join(tmpdir(), 'help-cli-'));
try {
  // Pre-existing files: one that will be regenerated, one stale.
  writeFileSync(join(tmp, 'help_it.html'), 'old');

  const r1 = run([fixture, '--out', tmp, '--langs', 'el,es,nl']);

  test('exits 0 on success', () => assert.equal(r1.code, 0, r1.out));
  test('writes en + langs from the list', () => {
    for (const code of ['en', 'el', 'es']) {
      assert.ok(existsSync(join(tmp, `help_${code}.html`)), `help_${code}.html missing`);
    }
  });
  test('does not write langs outside the list', () => {
    assert.ok(!existsSync(join(tmp, 'help_fr.html')), 'help_fr.html should not exist');
    assert.ok(!existsSync(join(tmp, 'help_en-us-ct.html')), 'help_en-us-ct.html should not exist');
  });
  test('warns about a listed lang missing from the sheet', () =>
    assert.match(r1.out, /nl — no column/));
  test('reports skipped sheet langs', () =>
    assert.match(r1.out, /Skipped.*(en-us-ct|fr)/));
  test('reports stale files', () =>
    assert.match(r1.out, /Stale.*help_it\.html/));
  test('game name auto-detected from A2', () =>
    assert.match(readFileSync(join(tmp, 'help_en.html'), 'utf8'), /<h1>Test Dragon Game<\/h1>/));
  test('placeholders kept by default', () => {
    const html = readFileSync(join(tmp, 'help_en.html'), 'utf8');
    assert.match(html, /\{\{game_rtp\}\}%/);
    assert.match(html, /\{\{maxWinnings\}\}/);
  });

  const r2 = run([fixture, '--out', tmp, '--langs', 'en-us-ct', '--values']);
  test('--langs en-us-ct writes help_en-us-ct.html', () => {
    assert.equal(r2.code, 0, r2.out);
    assert.ok(existsSync(join(tmp, 'help_en-us-ct.html')));
  });
  test('--values substitutes real values', () => {
    const html = readFileSync(join(tmp, 'help_en-us-ct.html'), 'utf8');
    assert.match(html, /96\.22%/);
    assert.doesNotMatch(html, /\{\{/);
  });

  const r5 = run([fixture, '--out', tmp, '--langs', 'es', '--rows', '6:13']);
  test('--rows override produces the same content block', () => {
    assert.equal(r5.code, 0, r5.out);
    assert.match(r5.out, /rows 6–13/);
  });
  const r6 = run([fixture, '--out', tmp, '--langs', 'es', '--rows', '10:9999']);
  test('--rows out of range fails', () => {
    assert.notEqual(r6.code, 0);
    assert.match(r6.out, /Invalid row range/);
  });

  const r3 = run([fixture, '--out', join(tmp, 'nope')]);
  test('missing --out folder fails with a hint', () => {
    assert.notEqual(r3.code, 0);
    assert.match(r3.out, /Output folder does not exist/);
  });

  const r4 = run([fixture, '--out', tmp], { cwd: tmp });
  test('no package.json → clear error', () => {
    assert.notEqual(r4.code, 0);
    assert.match(r4.out, /No package\.json|l10ntool/);
  });
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (failed) { console.error(`\n${failed} test(s) failed`); process.exit(1); }
console.log('\nAll CLI tests passed');
