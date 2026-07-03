// Demo: build a real artifact from the Breathalyzer fixtures.
// Usage: npm run demo-artifact  (requires `npm run build` first)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeArtifact } from './make-artifact.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = (name: string) => readFileSync(join(root, 'fixtures', name), 'utf8');

const out = join(root, 'generated', 'breathalyzer-artifact.html');
makeArtifact(join(root, 'dist', 'artifact-template.html'), out, 'Breathalyzer — System Architecture', [
  { name: 'System Overview', mermaid: fixture('breathalyzer-overview.mmd') },
  { name: 'Detailed Architecture', mermaid: fixture('breathalyzer-detailed.mmd') },
]);
console.log('Wrote', out);
