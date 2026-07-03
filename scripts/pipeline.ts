// Dev tool: render a fixture .mmd end to end (parse -> hybrid layout -> SVG)
// into a static HTML page for quick visual inspection.
// Usage: npm run pipeline [-- fixture-name.mmd]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../src/render.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtureName = process.argv[2] ?? 'breathalyzer-detailed.mmd';
const source = readFileSync(join(here, '..', 'fixtures', fixtureName), 'utf8');

const svg = await render(source, {
  onIconMiss: (n) => console.log(`[icon miss] ${n.id}: ${n.label.split('\n')[0]}`),
});

const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>openEraser pipeline — ${basename(fixtureName, '.mmd')}</title></head>
<body style="margin:0;background:#0b0d12;width:fit-content;">
${svg}
</body>
</html>
`;

const outDir = join(here, '..', 'generated');
mkdirSync(outDir, { recursive: true });
const out = join(outDir, `pipeline-${basename(fixtureName, '.mmd')}.html`);
writeFileSync(out, html);
console.log('Wrote', out);
