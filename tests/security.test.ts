import { describe, expect, it } from 'vitest';
import { defaultLimits } from '../src/limits.js';
import { parse, ParseError } from '../src/parser.js';
import { render } from '../src/render.js';
import { themes } from '../src/theme.js';
import type { DiagramAST } from '../src/types.js';

// Every element and attribute the renderer (including icon glyphs) may emit.
const ALLOWED_TAGS = new Set([
  'svg', 'defs', 'marker', 'g', 'rect', 'circle', 'ellipse', 'line', 'path', 'polygon', 'polyline', 'text',
]);
const ALLOWED_ATTRS = new Set([
  'xmlns', 'width', 'height', 'viewBox', 'font-family', 'id', 'refX', 'refY', 'markerWidth', 'markerHeight',
  'orient', 'd', 'fill', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-linecap',
  'stroke-linejoin', 'marker-end', 'transform', 'x', 'y', 'rx', 'ry', 'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2',
  'points', 'font-size', 'font-weight', 'letter-spacing', 'text-anchor',
]);

/**
 * Structural check: if any authored text escaped its context, the output would
 * contain an unexpected tag, an unexpected attribute, or leftover markup.
 */
function expectSafeSvg(svg: string): void {
  const tagRe = /<(\/?)([^\s/>]+)([^>]*)>/g;
  let lastEnd = 0;
  for (const match of svg.matchAll(tagRe)) {
    const [whole, closing, name, rest] = match;
    // Text between tags must not contain raw markup characters.
    expect(svg.slice(lastEnd, match.index)).not.toMatch(/[<>"]/);
    lastEnd = match.index! + whole.length;

    expect(ALLOWED_TAGS, `unexpected <${name}>`).toContain(name);
    if (closing) continue;
    const leftover = rest!.replace(/\s([\w:-]+)="([^"<>]*)"/g, (_, attr: string) => {
      expect(ALLOWED_ATTRS, `unexpected attribute ${attr}`).toContain(attr);
      return '';
    });
    expect(leftover.trim(), `leftover markup in <${name}>`).toMatch(/^\/?$/);
  }
  expect(svg.slice(lastEnd)).toBe('');
  // Text like "javascript:" or "onload=" may appear as escaped text content;
  // the attribute allowlist above is what keeps it from becoming active.
  expect(svg).not.toMatch(/<script/i);
}

const PAYLOADS = [
  '<script>alert(1)</script>',
  '"><svg onload=alert(1)>',
  "' onmouseover='alert(1)",
  '</text><script>alert(1)</script><text>',
  '&lt;b&gt; &amp; &#x3C;',
  ']]><!--',
  'javascript:alert(1)',
];

describe('authored text cannot inject markup', () => {
  for (const payload of PAYLOADS) {
    // Mermaid reserves shape and edge delimiters inside labels, so strip those.
    // Markup characters (< > & ') stay in. Quote injection is covered by the
    // custom AST test below, which can carry any string.
    const text = payload.replace(/[[\](){}|"-]/g, '');

    it(`node, edge and group labels: ${payload}`, async () => {
      const source = [
        'flowchart LR',
        `  subgraph G[${text}]`,
        `    A[${text}] -->|${text}| B(${text})`,
        '  end',
        // Inline `-- label -->` text cannot start with `>`.
        `  B -- x${text} --> C[(${text})]`,
        `  C --> D((${text}<br>second line))`,
      ].join('\n');
      const svg = await render(source);
      expectSafeSvg(svg);
      if (text.includes('<')) expect(svg).toContain('&lt;');
    });
  }

  it('icon directives and style fills', async () => {
    const source = [
      'flowchart LR',
      '  %% icons: A="><script>alert(1)</script>, B=server',
      '  A[One] --> B[Two]',
      '  style A fill:#fff" onload="alert(1)',
      '  style B fill:red',
    ].join('\n');
    expectSafeSvg(await render(source));
  });

  it('custom AST with hostile strings in every field', async () => {
    const evil = '"><script>alert(1)</script>';
    const ast: DiagramAST = {
      direction: 'LR',
      nodes: [{ id: 'A', label: evil, icon: evil, color: evil }],
      groups: [
        {
          id: 'G',
          label: evil,
          icon: evil,
          color: evil,
          nodes: [{ id: 'B', label: `${evil}\n${evil}`, color: '#ff00ff" onload="x' }],
        },
      ],
      edges: [{ from: 'A', to: 'B', label: evil, style: 'solid' }],
    };
    expectSafeSvg(await render(ast, { icons: { overrides: { A: evil } } }));
  });

  it('custom theme strings', async () => {
    const evil = '"/><script>alert(1)</script><x a="';
    const theme = structuredClone(themes.dark);
    theme.background = evil;
    theme.font = evil;
    theme.node.title = evil;
    theme.edge.labelBg = evil;
    theme.accentPalette = [evil];
    theme.defaultAccent = evil;
    // Hostile theme values may render as broken colors, but never as markup.
    const svg = await render('flowchart LR\n  A[One] -->|x| B[Two]', { theme });
    expect(svg).not.toMatch(/<script|<x\b/);
  });
});

describe('custom AST validation', () => {
  const base = (): DiagramAST => ({
    direction: 'TB',
    nodes: [{ id: 'A', label: 'One' }],
    groups: [],
    edges: [],
  });

  it('rejects wrong field types with a clear path', async () => {
    const ast = base() as unknown as { nodes: { label: unknown }[] };
    ast.nodes[0]!.label = { toString: () => '<script>' };
    await expect(render(ast as unknown as DiagramAST)).rejects.toThrow(/nodes\[0\]\.label: expected a string/);
  });

  it('rejects unknown enum values', async () => {
    const ast = { ...base(), direction: 'SIDEWAYS' } as unknown as DiagramAST;
    await expect(render(ast)).rejects.toThrow(/direction/);
  });

  it('rejects self-referencing groups instead of looping', async () => {
    const group: Record<string, unknown> = { id: 'G', label: 'G', nodes: [] };
    group.groups = [group];
    const ast = { ...base(), groups: [group] } as unknown as DiagramAST;
    await expect(render(ast)).rejects.toThrow(/nested too deeply/);
  });

  it('applies node limits to custom ASTs', async () => {
    const ast = base();
    ast.nodes = Array.from({ length: 5 }, (_, i) => ({ id: `n${i}`, label: `n${i}` }));
    await expect(render(ast, { limits: { maxNodes: 4 } })).rejects.toThrow(/Too many nodes/);
  });
});

describe('size limits', () => {
  it('rejects oversized source', () => {
    const source = `graph TB\n%% ${'x'.repeat(defaultLimits.maxSourceLength)}`;
    expect(() => parse(source)).toThrow(/too long/);
  });

  it('rejects A & B fan-out before expanding it', () => {
    const side = (p: string) => Array.from({ length: 200 }, (_, i) => `${p}${i}`).join(' & ');
    const started = performance.now();
    expect(() => parse(`graph TB\n  ${side('a')} --> ${side('b')}`)).toThrow(/Too many edges/);
    expect(performance.now() - started).toBeLessThan(1_000);
  });

  it('rejects deep nesting with a ParseError, not a stack overflow', () => {
    const depth = 5_000;
    const opens = Array.from({ length: depth }, (_, i) => `subgraph g${i}`).join('\n');
    const source = `graph TB\n${opens}\nA\n${'end\n'.repeat(depth)}`;
    expect(() => parse(source)).toThrow(ParseError);
    expect(() => parse(source)).toThrow(/nested too deeply/);
  });

  it('rejects too many nodes and subgraphs', () => {
    const nodes = Array.from({ length: defaultLimits.maxNodes + 1 }, (_, i) => `  n${i}`).join('\n');
    expect(() => parse(`graph TB\n${nodes}`)).toThrow(/Too many nodes/);
    const groups = Array.from({ length: defaultLimits.maxGroups + 1 }, (_, i) => `subgraph g${i}\nend`).join('\n');
    expect(() => parse(`graph TB\n${groups}`)).toThrow(/Too many subgraphs/);
  });

  it('allows raising limits', () => {
    const nodes = Array.from({ length: 6 }, (_, i) => `  n${i}`).join('\n');
    expect(() => parse(`graph TB\n${nodes}`, { limits: { maxNodes: 5 } })).toThrow(/Too many nodes/);
    expect(parse(`graph TB\n${nodes}`, { limits: { maxNodes: 6 } }).nodes).toHaveLength(6);
  });

  it('rejects invalid limit values', () => {
    expect(() => parse('graph TB', { limits: { maxNodes: 0 } })).toThrow(/positive integer/);
    expect(() => parse('graph TB', { limits: { maxEdges: Number.NaN } })).toThrow(/positive integer/);
  });
});

describe('parser fuzzing', () => {
  // Deterministic PRNG so failures reproduce.
  function rng(seed: number) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const TOKENS = [
    'A', 'B', 'node_1', 'x.y', ' ', ' ', '\n', '-->', '---', '-.->', '==>', '-- ', ' -->', '-. ', ' .->', '== ',
    '|', '|label|', '[', ']', '(', ')', '[(', ')]', '((', '))', '"', '&', ';', 'subgraph ', 'end', 'style ',
    'fill:#abc', '%%', '%% icons: A=server', '<br>', '<', '>', '\\', '$&', '\u0000', '‮', '😀',
  ];

  it('only ever returns an AST or throws ParseError, quickly', () => {
    const random = rng(42);
    const started = performance.now();
    for (let i = 0; i < 3_000; i++) {
      const length = Math.floor(random() * 60);
      let body = '';
      for (let j = 0; j < length; j++) body += TOKENS[Math.floor(random() * TOKENS.length)];
      const source = random() < 0.9 ? `flowchart LR\n${body}` : body;
      try {
        const ast = parse(source);
        expect(Array.isArray(ast.nodes) && Array.isArray(ast.edges)).toBe(true);
      } catch (error) {
        if (!(error instanceof ParseError)) {
          throw new Error(`Non-ParseError for input ${JSON.stringify(source)}: ${String(error)}`);
        }
      }
    }
    expect(performance.now() - started).toBeLessThan(5_000);
  });

  it('long pathological lines parse in linear-ish time', () => {
    const shapes = [
      (n: number) => `A ${'-- x '.repeat(n)}`,
      (n: number) => `A -- ${'x '.repeat(n)}`,
      (n: number) => `A -. ${'x '.repeat(n)}`,
      (n: number) => `A == ${'x '.repeat(n)}`,
      (n: number) => `A[${'['.repeat(n)}`,
      (n: number) => `A ${'& '.repeat(n)}`,
      (n: number) => `A -->|${'|'.repeat(n)}`,
      (n: number) => `style A ${'fill: '.repeat(n)}`,
    ];
    for (const shape of shapes) {
      const source = `flowchart LR\n${shape(30_000)}`;
      const started = performance.now();
      try {
        parse(source);
      } catch (error) {
        expect(error).toBeInstanceOf(ParseError);
      }
      expect(performance.now() - started, shape.toString()).toBeLessThan(1_000);
    }
  });

  it('renders random valid diagrams to safe SVG', async () => {
    const random = rng(7);
    const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)]!;
    const label = () =>
      Array.from({ length: 1 + Math.floor(random() * 4) }, () => pick(['a', '<', '>', '&', '"', "'", 'é', ' '])).join('');
    for (let i = 0; i < 25; i++) {
      const ids = Array.from({ length: 2 + Math.floor(random() * 6) }, (_, j) => `n${j}`);
      const lines = ['flowchart ' + pick(['TB', 'LR', 'BT', 'RL'])];
      if (random() < 0.5) lines.push('subgraph G["' + label().replace(/"/g, '') + '"]', `  ${ids[0]}`, 'end');
      for (const id of ids) lines.push(`  ${id}["${label().replace(/"/g, '')}"]`);
      for (let e = 0; e < ids.length; e++) {
        lines.push(`  ${pick(ids)} ${pick(['-->', '---', '-.->', '==>'])}|${label().replace(/\|/g, '')}| ${pick(ids)}`);
      }
      expectSafeSvg(await render(lines.join('\n')));
    }
  });
});
