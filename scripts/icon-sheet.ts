// Visual QA contact sheet: renders every manifest icon as it appears in a
// node chip (16px on accent-tinted chip) plus large (48px) for inspection.
// Usage: npm run icon-sheet — then open generated/icon-sheet.html
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { iconManifest } from '../src/icons.js';

const ACCENT = '#60a5fa';

const cells = iconManifest
  .map(
    (d) => `
  <div class="cell">
    <div class="chip">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${ACCENT}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d.svg}</svg>
    </div>
    <svg class="big" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e8ecf3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d.svg}</svg>
    <div class="name">${d.name}</div>
  </div>`,
  )
  .join('\n');

const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>openEraser icon contact sheet (${iconManifest.length} icons)</title>
<style>
  body { background:#0b0d12; color:#e8ecf3; font-family:'Segoe UI',sans-serif; padding:24px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(110px, 1fr)); gap:14px; }
  .cell { background:#12151c; border:1px solid #232834; border-radius:12px; padding:12px; text-align:center; }
  .chip { width:30px; height:30px; border-radius:8px; background:${ACCENT}1f; border:1px solid ${ACCENT}40;
          display:inline-flex; align-items:center; justify-content:center; margin-bottom:8px; }
  .big { display:block; margin:0 auto 8px; }
  .name { font-size:11px; color:#8b94a7; }
</style></head>
<body><h3>Icon contact sheet — ${iconManifest.length} icons</h3><div class="grid">${cells}</div></body>
</html>
`;

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'generated');
mkdirSync(outDir, { recursive: true });
const out = join(outDir, 'icon-sheet.html');
writeFileSync(out, html);
console.log('Wrote', out);
