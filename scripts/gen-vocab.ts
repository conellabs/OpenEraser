// Standalone vocabulary regeneration (also runs as part of `npm run build`).
// Usage: npm run gen-vocab
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeVocab } from './vocab.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = writeVocab(root);
console.log('Wrote', out);
