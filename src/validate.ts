import type { DiagramLimits } from './limits.js';
import type { DiagramAST } from './types.js';

const DIRECTIONS = new Set(['TB', 'BT', 'LR', 'RL']);
const SHAPES = new Set(['rect', 'rounded', 'cylinder', 'circle']);
const EDGE_STYLES = new Set(['solid', 'dashed', 'dotted']);
const ARROW_TYPES = new Set(['arrow', 'none', 'circle']);

type Obj = Record<string, unknown>;

const isObject = (value: unknown): value is Obj =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Check a caller-supplied DiagramAST before rendering. TypeScript types do not
 * protect the runtime API from objects built from JSON or other untrusted
 * input, so shape, enum values and size limits are enforced here.
 */
export function assertDiagramAst(input: unknown, limits: DiagramLimits): asserts input is DiagramAST {
  const fail = (path: string, problem: string): never => {
    throw new TypeError(`Invalid diagram at ${path}: ${problem}`);
  };
  const string = (value: unknown, path: string, optional = false): void => {
    if (value === undefined && optional) return;
    if (typeof value !== 'string') fail(path, 'expected a string');
  };
  const oneOf = (value: unknown, allowed: Set<string>, path: string, optional = false): void => {
    if (value === undefined && optional) return;
    if (typeof value !== 'string' || !allowed.has(value)) fail(path, `expected one of ${[...allowed].join(', ')}`);
  };
  const array = (value: unknown, path: string): unknown[] => {
    if (!Array.isArray(value)) fail(path, 'expected an array');
    return value as unknown[];
  };

  let nodeCount = 0;
  let groupCount = 0;

  const checkNode = (node: unknown, path: string): void => {
    if (!isObject(node)) fail(path, 'expected an object');
    const n = node as Obj;
    string(n.id, `${path}.id`);
    string(n.label, `${path}.label`);
    string(n.icon, `${path}.icon`, true);
    string(n.color, `${path}.color`, true);
    oneOf(n.shape, SHAPES, `${path}.shape`, true);
    if (++nodeCount > limits.maxNodes) throw new RangeError(`Too many nodes (limit ${limits.maxNodes})`);
  };

  const checkGroup = (group: unknown, path: string, depth: number): void => {
    if (depth > limits.maxDepth) throw new RangeError(`Subgraphs nested too deeply (limit ${limits.maxDepth})`);
    if (!isObject(group)) fail(path, 'expected an object');
    const g = group as Obj;
    if (++groupCount > limits.maxGroups) throw new RangeError(`Too many subgraphs (limit ${limits.maxGroups})`);
    string(g.id, `${path}.id`);
    string(g.label, `${path}.label`);
    string(g.icon, `${path}.icon`, true);
    string(g.color, `${path}.color`, true);
    array(g.nodes, `${path}.nodes`).forEach((n, i) => checkNode(n, `${path}.nodes[${i}]`));
    if (g.groups !== undefined) {
      array(g.groups, `${path}.groups`).forEach((child, i) => checkGroup(child, `${path}.groups[${i}]`, depth + 1));
    }
  };

  if (!isObject(input)) fail('root', 'expected an object');
  const ast = input as Obj;
  oneOf(ast.direction, DIRECTIONS, 'direction');
  array(ast.nodes, 'nodes').forEach((n, i) => checkNode(n, `nodes[${i}]`));
  array(ast.groups, 'groups').forEach((g, i) => checkGroup(g, `groups[${i}]`, 1));

  const edges = array(ast.edges, 'edges');
  if (edges.length > limits.maxEdges) throw new RangeError(`Too many edges (limit ${limits.maxEdges})`);
  edges.forEach((edge, i) => {
    const path = `edges[${i}]`;
    if (!isObject(edge)) fail(path, 'expected an object');
    const e = edge as Obj;
    string(e.from, `${path}.from`);
    string(e.to, `${path}.to`);
    string(e.label, `${path}.label`, true);
    oneOf(e.style, EDGE_STYLES, `${path}.style`);
    oneOf(e.arrowType, ARROW_TYPES, `${path}.arrowType`, true);
  });
}
