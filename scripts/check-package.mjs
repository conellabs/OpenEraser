import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const packageName = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).name;
const temp = mkdtempSync(join(tmpdir(), 'open-eraser-package-'));
const packDir = join(temp, 'pack');
const consumerDir = join(temp, 'consumer');

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', stdio: 'pipe' });
  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
  return result.stdout;
}

try {
  mkdirSync(packDir, { recursive: true });
  mkdirSync(consumerDir, { recursive: true });
  process.stdout.write(run('pnpm', ['pack', '--pack-destination', packDir], root));

  const archives = readdirSync(packDir).filter((file) => file.endsWith('.tgz'));
  if (archives.length !== 1) throw new Error(`Expected one package archive, found ${archives.length}`);
  const archive = join(packDir, archives[0]);

  writeFileSync(
    join(consumerDir, 'package.json'),
    `${JSON.stringify(
      {
        private: true,
        type: 'module',
        dependencies: { [packageName]: `file:${archive}` },
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    join(consumerDir, 'smoke.mjs'),
    `import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const packageName = ${JSON.stringify(packageName)};
const { render } = await import(packageName);
const { parse: parseInBrowserEntry } = await import(packageName + '/browser');

const source = 'flowchart LR\\n  Client[Client] --> API[API]';
if (parseInBrowserEntry(source).nodes.length !== 2) throw new Error('browser entry parse failed');
const svg = await render(source);
if (!svg.startsWith('<svg') || !svg.includes('Client')) throw new Error('render smoke test failed');

const templateUrl = import.meta.resolve(packageName + '/artifact-template.html');
const template = readFileSync(fileURLToPath(templateUrl), 'utf8');
if (!template.includes('__OPEN_ERASER_DATA__')) throw new Error('artifact template is missing its data placeholder');
if (template.includes('__OPEN_ERASER_BUNDLE__')) throw new Error('artifact template still has its bundle placeholder');

const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(template)?.[1] ?? '';
const scriptSrc = /script-src[^;]*/.exec(csp)?.[0];
if (!scriptSrc || scriptSrc.includes('unsafe-inline')) throw new Error('artifact CSP must allow scripts by hash only');
const inlineScripts = [...template.matchAll(/<script>([\\s\\S]*?)<\\/script>/g)].map((m) => m[1]);
if (inlineScripts.length !== 2) throw new Error('expected 2 inline scripts in the artifact template');
for (const body of inlineScripts) {
  const hash = "'sha256-" + createHash('sha256').update(body, 'utf8').digest('base64') + "'";
  if (!scriptSrc.includes(hash)) throw new Error('artifact CSP is missing the hash of an inline script');
}

const vocabularyUrl = import.meta.resolve(packageName + '/icon-vocabulary.md');
const vocabulary = readFileSync(fileURLToPath(vocabularyUrl), 'utf8');
if (!vocabulary.includes('Diagram icon vocabulary')) throw new Error('icon vocabulary is missing');

const distUrl = new URL('.', import.meta.resolve(packageName));
for (const relative of ['../LICENSE', '../THIRD_PARTY_NOTICES.md', '../licenses/EPL-2.0.md', '../licenses/LUCIDE-LICENSE.txt']) {
  if (!existsSync(fileURLToPath(new URL(relative, distUrl)))) throw new Error(relative + ' is missing from package');
}

console.log('External package smoke test passed (' + svg.length + ' SVG characters).');
`,
  );

  run('pnpm', ['install', '--ignore-workspace'], consumerDir);
  process.stdout.write(run('node', ['smoke.mjs'], consumerDir));
  console.log(`Verified ${basename(archive)} in a temporary external project.`);
  rmSync(temp, { recursive: true, force: true });
} catch (error) {
  console.error(`Package verification files kept at ${temp}`);
  throw error;
}
