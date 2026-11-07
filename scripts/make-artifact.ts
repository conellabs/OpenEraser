// Reference implementation of artifact generation from the built template.
// Keep these escaping rules in sync with integrations implemented in other
// languages.
import { readFileSync, writeFileSync } from 'node:fs';

export interface ArtifactDiagram {
  name: string;
  mermaid: string;
}

/**
 * Produce a finished artifact from the built template.
 *
 * Escaping rules any port must follow:
 *  - JSON is embedded in a <script type="application/json"> tag, so `</`
 *    must be escaped as `<\/` (valid JSON, inert in HTML).
 *  - Replacement must be literal — beware engines that treat `$` in the
 *    replacement string specially.
 */
export function injectData(template: string, title: string, diagrams: ArtifactDiagram[]): string {
  if (!template.includes('__OPEN_ERASER_DATA__')) {
    throw new Error('Template has no __OPEN_ERASER_DATA__ placeholder — is this the built template?');
  }
  const json = JSON.stringify({ title, diagrams }).replace(/<\//g, '<\\/');
  return template.replace('__OPEN_ERASER_DATA__', () => json);
}

export function makeArtifact(
  templatePath: string,
  outPath: string,
  title: string,
  diagrams: ArtifactDiagram[],
): void {
  const template = readFileSync(templatePath, 'utf8');
  writeFileSync(outPath, injectData(template, title, diagrams));
}
