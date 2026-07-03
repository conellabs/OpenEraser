import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse, ParseError } from '../src/parser.js';

const fixture = (name: string) =>
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', name), 'utf8');

describe('breathalyzer-overview fixture (flat graph)', () => {
  const ast = parse(fixture('breathalyzer-overview.mmd'));

  it('parses direction, nodes, and edges', () => {
    expect(ast.direction).toBe('TB');
    expect(ast.groups).toHaveLength(0);
    expect(ast.nodes).toHaveLength(11);
    expect(ast.edges).toHaveLength(15);
  });

  it('applies icon directives to nodes', () => {
    const byId = new Map(ast.nodes.map((n) => [n.id, n]));
    expect(byId.get('BAT')?.icon).toBe('battery');
    expect(byId.get('MCU')?.icon).toBe('mcu');
    expect(byId.get('AIR')?.icon).toBe('wind');
  });

  it('accepts icon directive entries separated by spaces, commas, or both', () => {
    const src = `flowchart LR
  %% icons: A=user B=browser, C=terminal ,D=file
  A[One] --> B[Two]
  C[Three] --> D[Four]`;
    const byId = new Map(parse(src).nodes.map((n) => [n.id, n]));
    expect(byId.get('A')?.icon).toBe('user');
    expect(byId.get('B')?.icon).toBe('browser');
    expect(byId.get('C')?.icon).toBe('terminal');
    expect(byId.get('D')?.icon).toBe('file');
  });

  it('keeps labels with embedded quotes', () => {
    expect(ast.nodes.find((n) => n.id === 'LCD')?.label).toBe('2" LCD Display');
  });

  it('parses dashed edges', () => {
    const dashed = ast.edges.filter((e) => e.style === 'dashed');
    expect(dashed).toHaveLength(3);
    expect(dashed.every((e) => e.from === 'UI')).toBe(true);
  });

  it('parses edge labels', () => {
    expect(ast.edges.find((e) => e.from === 'TEMP' && e.to === 'MCU')?.label).toBe('I2C');
  });
});

describe('breathalyzer-detailed fixture (nested groups)', () => {
  const ast = parse(fixture('breathalyzer-detailed.mmd'));

  it('parses all groups with correct membership counts', () => {
    expect(ast.groups.map((g) => [g.id, g.nodes.length])).toEqual([
      ['Power', 6],
      ['Control', 5],
      ['Sensor', 3],
      ['UI', 3],
      ['Air', 3],
    ]);
    expect(ast.nodes).toHaveLength(0); // every node belongs to a group
    expect(ast.edges).toHaveLength(26);
  });

  it('assigns nodes to the group where they first appear, not where referenced', () => {
    // RAIL33 is defined in Power and referenced in Control/Sensor/UI statements.
    const power = ast.groups.find((g) => g.id === 'Power')!;
    const control = ast.groups.find((g) => g.id === 'Control')!;
    expect(power.nodes.some((n) => n.id === 'RAIL33')).toBe(true);
    expect(control.nodes.some((n) => n.id === 'RAIL33')).toBe(false);
    expect(control.nodes.some((n) => n.id === 'MCU')).toBe(true);
  });

  it('converts <br/> to newlines in labels', () => {
    const bat = ast.groups[0]!.nodes.find((n) => n.id === 'BAT');
    expect(bat?.label).toBe('9V Alkaline Battery\n400-600mAh');
  });

  it('uses quoted subgraph titles as labels', () => {
    expect(ast.groups.find((g) => g.id === 'Air')?.label).toBe('Air Sampling System');
  });

  it('applies style fill colors to groups', () => {
    expect(ast.groups.find((g) => g.id === 'Power')?.color).toBe('#e1f5fe');
    expect(ast.groups.find((g) => g.id === 'Air')?.color).toBe('#fce4ec');
  });

  it('applies icon directives across groups', () => {
    const sensor = ast.groups.find((g) => g.id === 'Sensor')!;
    expect(sensor.nodes.find((n) => n.id === 'FUEL')?.icon).toBe('sensor');
    expect(sensor.nodes.find((n) => n.id === 'AMP')?.icon).toBe('op-amp');
  });

  it('parses cross-group edge labels and styles', () => {
    const pwm = ast.edges.find((e) => e.from === 'GPIO' && e.to === 'PUMP');
    expect(pwm).toMatchObject({ label: 'PWM Control', style: 'dashed' });
  });
});

describe('syntax forms', () => {
  it('parses node shapes', () => {
    const ast = parse(`graph LR
      A[Rect]
      B(Round)
      C[(Cylinder)]
      D((Circle))`);
    const shapes = new Map(ast.nodes.map((n) => [n.id, n.shape]));
    expect(shapes.get('A')).toBeUndefined(); // rect is the default, not stored
    expect(shapes.get('B')).toBe('rounded');
    expect(shapes.get('C')).toBe('cylinder');
    expect(shapes.get('D')).toBe('circle');
  });

  it('parses chained edges', () => {
    const ast = parse(`graph LR\n  A --> B --> C`);
    expect(ast.edges).toEqual([
      { from: 'A', to: 'B', style: 'solid' },
      { from: 'B', to: 'C', style: 'solid' },
    ]);
  });

  it('parses & fan-out syntax', () => {
    const ast = parse(`graph TB\n  A & B --> C`);
    expect(ast.edges).toHaveLength(2);
    expect(ast.edges.map((e) => e.from).sort()).toEqual(['A', 'B']);
  });

  it('parses "-- text -->" label form', () => {
    const ast = parse(`graph LR\n  A -- hello --> B`);
    expect(ast.edges[0]?.label).toBe('hello');
  });

  it('parses open (arrowless) links', () => {
    const ast = parse(`graph LR\n  A --- B`);
    expect(ast.edges[0]?.arrowType).toBe('none');
  });

  it('creates implicit nodes with id as label', () => {
    const ast = parse(`graph LR\n  A --> B`);
    expect(ast.nodes).toEqual([
      { id: 'A', label: 'A' },
      { id: 'B', label: 'B' },
    ]);
  });

  it('upgrades implicit nodes when a label appears later', () => {
    const ast = parse(`graph LR\n  A --> B\n  B[Real Label]`);
    expect(ast.nodes.find((n) => n.id === 'B')?.label).toBe('Real Label');
  });

  it('accepts flowchart keyword and TD direction', () => {
    const ast = parse(`flowchart TD\n  A --> B`);
    expect(ast.direction).toBe('TB');
  });

  it('parses nested subgraphs', () => {
    const ast = parse(`graph TB
      subgraph Outer
        subgraph Inner
          A[Node]
        end
        B[Other]
      end`);
    expect(ast.groups).toHaveLength(1);
    expect(ast.groups[0]?.groups?.[0]?.id).toBe('Inner');
    expect(ast.groups[0]?.groups?.[0]?.nodes[0]?.id).toBe('A');
    expect(ast.groups[0]?.nodes.map((n) => n.id)).toEqual(['B']);
  });

  it('ignores classDef/class/click/linkStyle/direction lines', () => {
    const ast = parse(`graph TB
      direction LR
      A --> B
      classDef red fill:#f00
      class A red
      linkStyle 0 stroke:#f00`);
    expect(ast.edges).toHaveLength(1);
  });
});

describe('error handling', () => {
  it('rejects non-flowchart diagram types with a clear error', () => {
    expect(() => parse(`sequenceDiagram\n  A->>B: hi`)).toThrow(/Unsupported diagram type 'sequenceDiagram'/);
  });

  it("rejects 'end' without a subgraph", () => {
    expect(() => parse(`graph TB\n  end`)).toThrow(ParseError);
  });

  it('rejects unclosed subgraphs', () => {
    expect(() => parse(`graph TB\n  subgraph G\n  A[x]`)).toThrow(/Unclosed subgraph 'G'/);
  });

  it('rejects unclosed node labels', () => {
    expect(() => parse(`graph TB\n  A[oops`)).toThrow(/Unclosed/);
  });

  it('reports line numbers', () => {
    try {
      parse(`graph TB\n  A --> B\n  ???`);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError);
      expect((err as ParseError).line).toBe(3);
    }
  });
});
