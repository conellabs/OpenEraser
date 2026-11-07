// Builds dist/artifact-template.html: the browser bundle (parser + layout +
// renderer + icons, elkjs included) inlined into template/artifact.html.
// Consumers produce a finished artifact by replacing the
// __OPEN_ERASER_DATA__ placeholder — string templating only, no Node
// required at generation time. See scripts/make-artifact.ts for the reference
// implementation.
//
// Usage: npm run build
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeVocab } from './vocab.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const result = await build({
  entryPoints: [join(root, 'src', 'browser.ts')],
  bundle: true,
  minify: true,
  format: 'iife',
  globalName: 'openEraser',
  platform: 'browser',
  target: 'es2020',
  write: false,
  logLevel: 'warning',
});

// `</script` inside string literals would terminate the inline <script> tag.
const js = result.outputFiles[0]!.text.replace(/<\/script/gi, '<\\/script');

const template = readFileSync(join(root, 'template', 'artifact.html'), 'utf8');
// Replacement via function: the bundle contains `$` sequences that
// String.replace would otherwise interpret as substitution patterns.
const withBundle = template.replace('__OPEN_ERASER_BUNDLE__', () => js);

// Allow exactly the template's own inline scripts by hash instead of
// 'unsafe-inline'. Inline event handlers (onload= and friends) stay blocked,
// so markup that ever slipped into a rendered SVG still could not run.
// The data block is type="application/json": it never executes, so consumers
// can inject data without changing these hashes.
const inlineScripts = [...withBundle.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]!);
if (inlineScripts.length !== 2) {
  throw new Error(`Expected 2 executable inline scripts in the template, found ${inlineScripts.length}`);
}
const hashes = inlineScripts
  .map((body) => `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`)
  .join(' ');
if (!withBundle.includes('__OPEN_ERASER_SCRIPT_HASHES__')) {
  throw new Error('template/artifact.html lost its __OPEN_ERASER_SCRIPT_HASHES__ placeholder');
}
const html = withBundle.replace('__OPEN_ERASER_SCRIPT_HASHES__', () => hashes);

if (!html.includes('__OPEN_ERASER_DATA__')) {
  throw new Error('template/artifact.html lost its __OPEN_ERASER_DATA__ placeholder');
}

mkdirSync(join(root, 'dist'), { recursive: true });
const out = join(root, 'dist', 'artifact-template.html');
writeFileSync(out, html);

const vocabOut = writeVocab(root);

const mb = (n: number) => (n / 1024 / 1024).toFixed(2);
console.log(`Wrote ${out}`);
console.log(`  bundle: ${mb(js.length)} MB, template total: ${mb(html.length)} MB`);
console.log(`Wrote ${vocabOut}`);
