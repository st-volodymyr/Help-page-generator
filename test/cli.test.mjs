/**
 * Smoke test for the CLI (`npm run test:cli`).
 * Runs the built bin/cli.cjs against test/fixtures/sample.csv and checks
 * lang filtering, the en-us-ct filename, --values mode, and the summary.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
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
  // Pre-existing files: help_it.html is stale (not in langs); help_nl.html
  // belongs to a wanted lang whose column is missing — warned, not stale.
  writeFileSync(join(tmp, 'help_it.html'), 'old');
  writeFileSync(join(tmp, 'help_nl.html'), 'old');

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
  test('warned langs are not listed as stale', () =>
    assert.doesNotMatch(r1.out, /Stale.*help_nl\.html/));
  test('help_nl.html left untouched', () =>
    assert.equal(readFileSync(join(tmp, 'help_nl.html'), 'utf8'), 'old'));
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

  // No <source> argument: the CLI asks for it on stdin.
  const r9 = run(['--out', tmp, '--langs', 'es'], { input: `${fixture}\n\n\n\n` });
  test('missing source is prompted for on stdin', () => {
    assert.equal(r9.code, 0, r9.out);
    assert.match(r9.out, /Google Sheets URL or \.xlsx\/\.csv path/);
    assert.match(r9.out, /Updated \(2\): en, es/);
  });
  const r10 = run(['--out', tmp], { input: '' });
  test('missing source + EOF fails with usage', () => {
    assert.notEqual(r10.code, 0);
    assert.match(r10.out, /Missing <source>/);
  });
  const r11 = run(['--out', tmp, '--yes'], { input: '' });
  test('missing source + --yes fails without prompting', () => {
    assert.notEqual(r11.code, 0);
    assert.match(r11.out, /Missing <source>/);
    assert.doesNotMatch(r11.out, /Google Sheets URL or/);
  });

  // Values-mode prompt: answering "v" switches to real values.
  const r13 = run([fixture, '--out', tmp, '--langs', 'el'], { input: '\n\n\nv\n' });
  test('values-mode prompt switches to real values', () => {
    assert.equal(r13.code, 0, r13.out);
    const html = readFileSync(join(tmp, 'help_el.html'), 'utf8');
    assert.match(html, /96\.22%/);
    assert.doesNotMatch(html, /\{\{/);
  });

  // Piped stdin (IDE run window): answers override the detected values.
  const r7 = run([fixture, '--out', tmp, '--langs', 'es'], { input: 'Renamed Game\n\n\n' });
  test('piped stdin answers override game name', () => {
    assert.equal(r7.code, 0, r7.out);
    assert.match(readFileSync(join(tmp, 'help_es.html'), 'utf8'), /<h1>Renamed Game<\/h1>/);
  });
  // Empty stdin (CI): EOF auto-accepts all detected defaults.
  const r8 = run([fixture, '--out', tmp, '--langs', 'es'], { input: '' });
  test('EOF on stdin auto-accepts defaults', () => {
    assert.equal(r8.code, 0, r8.out);
    assert.match(r8.out, /rows 6–13/);
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

  // --game defaults --out to <game>/help and reads that package.json.
  const gameDir = join(tmp, 'game');
  mkdirSync(join(gameDir, 'help'), { recursive: true });
  writeFileSync(join(gameDir, 'package.json'), JSON.stringify({ l10ntool: { langs: ['es'] } }));
  const r14 = run([fixture, '--game', gameDir, '--yes']);
  test('--game retargets both package.json and default --out', () => {
    assert.equal(r14.code, 0, r14.out);
    assert.ok(existsSync(join(gameDir, 'help', 'help_es.html')), 'help_es.html not in game/help');
    assert.ok(!existsSync(join(gameDir, 'help', 'help_el.html')), 'el not in that game langs');
  });

  // Unknown header spelling falls back to the (CODE) extractor.
  const fiCsv = join(tmp, 'fi.csv');
  writeFileSync(fiCsv, [
    'Help pages,,',
    'FI Game,,',
    ',English (EN),Finnish (FI)',
    'How to Play,How to Play,Näin pelaat',
    'Spin.,Spin.,Pyöräytä.',
    ',,',
    'Copyright,© copyright,© copyright',
  ].join('\n'));
  const r15 = run([fiCsv, '--out', tmp, '--langs', 'fi', '--yes']);
  test('unmapped header "Finnish (FI)" resolves via fallback extractor', () => {
    assert.equal(r15.code, 0, r15.out);
    assert.match(readFileSync(join(tmp, 'help_fi.html'), 'utf8'), /Pyöräytä/);
  });

  // .xlsx path uses formatted text, not raw numbers (raw:false).
  const XLSX = await import('xlsx');
  const xlsxPath = join(tmp, 'sample.xlsx');
  {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Help pages', '', ''], ['XLSX Game', '', ''],
      ['', 'English (EN)', 'Greek (EL)'],
      ['How to Play', 'How to Play', 'Πώς να παίξετε'],
      ['rtp', 'placeholder', 'Το RTP είναι 96.22%.'],
      ['max', 'The maximum win is 3,000x the bet.', 'Η μέγιστη νίκη είναι 3,000x.'],
      ['', '', ''],
      ['Copyright', '© copyright', '© copyright'],
    ]);
    // Percent-formatted numeric cell: raw value 0.9622, displays "96.22%".
    ws['B5'] = { t: 'n', v: 0.9622, z: '0.00%' };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, xlsxPath);
  }
  const r16 = run([xlsxPath, '--out', tmp, '--langs', 'en', '--yes']);
  test('.xlsx formatted numbers templatize like CSV', () => {
    assert.equal(r16.code, 0, r16.out);
    const html = readFileSync(join(tmp, 'help_en.html'), 'utf8');
    assert.match(html, /\{\{how_to_play_rtp\}\}%/);
    assert.match(html, /\{\{maxWinnings\}\}/);
  });

  // Failed content-block detection asks for rows instead of failing (interactive).
  const noHow = join(tmp, 'nohow.csv');
  writeFileSync(noHow, readFileSync(fixture, 'utf8').replace(/How to Play/g, 'Getting Started'));
  const r17 = run([noHow, '--out', tmp, '--langs', 'es'], { input: '\n6\n13\n\n' });
  test('failed detection prompts for rows interactively', () => {
    assert.equal(r17.code, 0, r17.out);
    assert.match(r17.out, /not auto-detected/);
    assert.match(r17.out, /rows 6–13/);
  });
  const r18 = run([noHow, '--out', tmp, '--langs', 'es', '--yes']);
  test('failed detection with --yes still fails fast', () => {
    assert.notEqual(r18.code, 0);
    assert.match(r18.out, /--rows/);
  });

  // "Portuguese (PT-PT)" / "Swedish (SV)" header variants map correctly.
  const ptsv = join(root, 'test', 'fixtures', 'sample-pt-sv.csv');
  const r12 = run([ptsv, '--out', tmp, '--langs', 'pt-pt,sv', '--yes']);
  test('PT-PT and SV header variants are recognised', () => {
    assert.equal(r12.code, 0, r12.out);
    assert.match(r12.out, /Updated \(3\): en, pt-pt, sv/);
    assert.match(readFileSync(join(tmp, 'help_sv.html'), 'utf8'), /Snurra hjulen/);
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
