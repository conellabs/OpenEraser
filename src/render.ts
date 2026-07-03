import { resolveIcon } from './icons.js';
import { layoutDiagram } from './layout.js';
import { parse } from './parser.js';
import { renderSvg } from './svg.js';
import type { ThemeConfig } from './theme.js';
import { themes } from './theme.js';
import type { DiagramAST, DiagramGroup, DiagramNode } from './types.js';

export interface RenderOptions {
  /** Theme to render with. Defaults to the dark theme. */
  theme?: ThemeConfig;
  /** Manual icon mapping by node id, applied on top of authored directives. */
  icons?: { overrides?: Record<string, string> };
  /** Called for each node that fell through every icon fallback (vocabulary growth signal). */
  onIconMiss?: (node: DiagramNode) => void;
}

/**
 * Render a Mermaid flowchart (source text or pre-parsed AST) to an SVG string.
 * Deterministic and offline: same input always produces the same output, no
 * network access, no API keys.
 */
export async function render(input: string | DiagramAST, options: RenderOptions = {}): Promise<string> {
  const ast = typeof input === 'string' ? parse(input) : input;
  const theme = options.theme ?? themes.dark;
  const resolved = withResolvedIcons(ast, options.icons?.overrides, options.onIconMiss);
  const layout = await layoutDiagram(resolved, theme);
  return renderSvg(layout, theme);
}

/**
 * Apply the icon fallback chain (override -> directive -> keyword match) up
 * front so layout can reserve chip space and the SVG stage can trust
 * `node.icon` to be a valid manifest name.
 */
function withResolvedIcons(
  ast: DiagramAST,
  overrides?: Record<string, string>,
  onMiss?: (node: DiagramNode) => void,
): DiagramAST {
  const resolveNode = (n: DiagramNode): DiagramNode => {
    const icon = resolveIcon(n.label, n.icon, overrides?.[n.id]);
    if (!icon && onMiss) onMiss(n);
    return icon ? { ...n, icon } : { ...n, icon: undefined };
  };
  const resolveGroup = (g: DiagramGroup): DiagramGroup => ({
    ...g,
    nodes: g.nodes.map(resolveNode),
    ...(g.groups ? { groups: g.groups.map(resolveGroup) } : {}),
  });
  return {
    ...ast,
    nodes: ast.nodes.map(resolveNode),
    groups: ast.groups.map(resolveGroup),
  };
}
