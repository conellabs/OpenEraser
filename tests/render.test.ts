import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { layoutDiagram } from '../src/layout.js';
import { parse } from '../src/parser.js';
import { render } from '../src/render.js';
import { themes } from '../src/theme.js';

const fixture = (name: string) =>
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', name), 'utf8');

describe('render() on fixtures', () => {
  it('renders the detailed fixture to valid-looking SVG', async () => {
    const svg = await render(fixture('breathalyzer-detailed.mmd'));
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).not.toMatch(/NaN|undefined/);
    for (const text of ['Power System', 'Control System', 'Sensor System', 'User Interface', 'Air Sampling System']) {
      expect(svg).toContain(`>${text}</text>`);
    }
    expect(svg).toContain('Electrochemical Fuel Cell');
    expect(svg).toContain('Amplified Analog'); // cross-group edge label
    expect(svg).toContain('stroke-dasharray'); // dashed control edges
    expect(svg).toContain('marker-end'); // arrowheads
  });

  it('renders the flat overview fixture', async () => {
    const svg = await render(fixture('breathalyzer-overview.mmd'));
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).not.toMatch(/NaN|undefined/);
    expect(svg).toContain('9V Battery');
    expect(svg).toContain('&quot;'); // the 2" LCD label survives escaping
  });

  it('is deterministic', async () => {
    const source = fixture('breathalyzer-detailed.mmd');
    expect(await render(source)).toBe(await render(source));
  });
});

describe('icon fallback chain', () => {
  it('keyword-matches icons for unannotated nodes', async () => {
    const svg = await render(`graph TB\n  A[Temperature Sensor] --> B[Mystery Box]`);
    // A gets the thermometer chip via keyword match; B gets a plain block.
    expect(svg).toContain('viewBox="0 0 24 24"');
  });

  it('reports icon misses via onIconMiss', async () => {
    const missed: string[] = [];
    await render(`graph TB\n  A[Temperature Sensor] --> B[Mystery Box]`, {
      onIconMiss: (n) => missed.push(n.id),
    });
    expect(missed).toEqual(['B']);
  });

  it('applies manual overrides over keyword matches', async () => {
    const missed: string[] = [];
    const svg = await render(`graph TB\n  B[Mystery Box] --> C[Other]`, {
      icons: { overrides: { B: 'battery' } },
      onIconMiss: (n) => missed.push(n.id),
    });
    expect(svg).toContain('viewBox="0 0 24 24"');
    expect(missed).toEqual(['C']);
  });

  it('ignores unknown icon names without breaking', async () => {
    const svg = await render(`graph TB\n  %% icons: A=no-such-icon\n  A[Mystery Box] --> B[Thing]`);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).not.toContain('viewBox="0 0 24 24"'); // no chip rendered
  });
});

describe('edge styles', () => {
  it('renders arrowless links without markers', async () => {
    const svg = await render(`graph LR\n  A[One] --- B[Two]`);
    expect(svg).not.toContain('marker-end');
  });
});

describe('SVG safety', () => {
  it('escapes authored labels and runtime theme strings', async () => {
    const theme = structuredClone(themes.dark);
    theme.font = '\"><script>alert(1)</script>';
    theme.defaultAccent = '\"><script>alert(2)</script>';
    theme.accentPalette = ['\"><script>alert(3)</script>'];
    theme.node.fill = '\"><script>alert(4)</script>';

    const svg = await render(`graph LR\n  A[\"</text><script>alert(5)</script>\"] --> B[Safe]`, { theme });

    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(svg).toContain('&lt;/text&gt;&lt;script&gt;alert(5)&lt;/script&gt;');
  });

  it('rejects invalid numeric theme values', async () => {
    const theme = structuredClone(themes.dark);
    theme.edge.width = Number.NaN;
    await expect(render(`graph LR\n  A --> B`, { theme })).rejects.toThrow(/edge\.width.*finite number/);
  });
});

describe('layoutDiagram() invariants', () => {
  it('produces sane geometry for the detailed fixture', async () => {
    const ast = parse(fixture('breathalyzer-detailed.mmd'));
    const layout = await layoutDiagram(ast, themes.dark);

    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
    expect(layout.groups).toHaveLength(5);
    expect(layout.nodes).toHaveLength(20);
    expect(layout.intraEdges.length + layout.crossEdges.length).toBe(26);

    // Every node sits inside its group's box.
    const groupRects = new Map(layout.groups.map((g) => [g.group.id, g.rect]));
    const groupOf = new Map(
      layout.groups.flatMap((g) => g.group.nodes.map((n) => [n.id, g.group.id] as const)),
    );
    for (const { node, rect } of layout.nodes) {
      expect(rect.w).toBeGreaterThan(0);
      expect(rect.h).toBeGreaterThan(0);
      const gr = groupRects.get(groupOf.get(node.id)!)!;
      expect(rect.x).toBeGreaterThanOrEqual(gr.x);
      expect(rect.y).toBeGreaterThanOrEqual(gr.y);
      expect(rect.x + rect.w).toBeLessThanOrEqual(gr.x + gr.w);
      expect(rect.y + rect.h).toBeLessThanOrEqual(gr.y + gr.h);
    }
  });

  it('handles nested subgraphs', async () => {
    const ast = parse(`graph TB
      subgraph Outer["Outer"]
        A[First]
        subgraph Inner["Inner"]
          B[Second]
        end
      end
      A --> B`);
    const layout = await layoutDiagram(ast, themes.dark);
    const outer = layout.groups.find((g) => g.group.id === 'Outer')!;
    const inner = layout.groups.find((g) => g.group.id === 'Inner')!;
    expect(inner.depth).toBe(1);
    // Inner box sits inside Outer box.
    expect(inner.rect.x).toBeGreaterThanOrEqual(outer.rect.x);
    expect(inner.rect.y).toBeGreaterThanOrEqual(outer.rect.y);
    expect(inner.rect.x + inner.rect.w).toBeLessThanOrEqual(outer.rect.x + outer.rect.w);
    expect(inner.rect.y + inner.rect.h).toBeLessThanOrEqual(outer.rect.y + outer.rect.h);
  });

  it('rejects edges referencing unknown ids', async () => {
    const ast = parse(`graph TB\n  A[One] --> B[Two]`);
    ast.edges.push({ from: 'A', to: 'GHOST', style: 'solid' });
    await expect(layoutDiagram(ast, themes.dark)).rejects.toThrow(/unknown id 'GHOST'/);
  });
});
