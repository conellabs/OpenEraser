import type {
  ArrowType,
  DiagramAST,
  DiagramEdge,
  DiagramGroup,
  DiagramNode,
  Direction,
  EdgeStyle,
  NodeShape,
} from './types.js';
import type { DiagramLimits } from './limits.js';
import { resolveLimits } from './limits.js';

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly line: number,
  ) {
    super(`Line ${line}: ${message}`);
    this.name = 'ParseError';
  }
}

const HEADER_RE = /^(graph|flowchart)\b\s*(TB|TD|BT|LR|RL)?\s*;?\s*$/;
const ICON_DIRECTIVE_RE = /^%%\s*icons:\s*(.+)$/;
const SUBGRAPH_ID_LABEL_RE = /^([\w.-]+)\s*\[\s*"?(.*?)"?\s*\]$/;
const STYLE_RE = /^style\s+([\w.-]+)\s+(.+?);?$/;
const NODE_ID_RE = /^[\w.-]+/;
const EDGE_OP_RE = /^\s*(-\.->|-\.-|-->|---|==>|===)\s*(?:\|([^|]*)\|\s*)?/;

// Statement kinds we deliberately ignore (valid Mermaid, irrelevant to layout).
const IGNORED_PREFIXES = ['classDef ', 'class ', 'click ', 'linkStyle ', 'direction ', 'accTitle', 'accDescr'];

const SHAPE_DELIMS: { open: string; close: string; shape: NodeShape }[] = [
  // Order matters: two-char delimiters must be tried before their one-char prefixes.
  { open: '[(', close: ')]', shape: 'cylinder' },
  { open: '((', close: '))', shape: 'circle' },
  { open: '[', close: ']', shape: 'rect' },
  { open: '(', close: ')', shape: 'rounded' },
];

function cleanLabel(raw: string): string {
  let label = raw.trim();
  if (label.startsWith('"') && label.endsWith('"') && label.length >= 2) {
    label = label.slice(1, -1);
  }
  return label.replace(/<br\s*\/?>/gi, '\n').trim();
}

interface MutableGroup {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  nodes: DiagramNode[];
  groups: MutableGroup[];
}

export interface ParseOptions {
  /** Override the default size limits. */
  limits?: Partial<DiagramLimits>;
}

export function parse(source: string, options: ParseOptions = {}): DiagramAST {
  if (typeof source !== 'string') throw new TypeError('Mermaid source must be a string');
  const limits = resolveLimits(options.limits);
  if (source.length > limits.maxSourceLength) {
    throw new ParseError(`Source is too long (limit ${limits.maxSourceLength} characters)`, 1);
  }

  let direction: Direction = 'TB';
  let headerSeen = false;

  const rootNodes: DiagramNode[] = [];
  const rootGroups: MutableGroup[] = [];
  const edges: DiagramEdge[] = [];
  const groupStack: MutableGroup[] = [];
  const nodeById = new Map<string, DiagramNode>();
  const groupById = new Map<string, MutableGroup>();
  const iconById = new Map<string, string>();
  const fillById = new Map<string, string>();

  /** Register a node on first appearance; later mentions may upgrade its label/shape. */
  const ensureNode = (id: string, lineNo: number, label?: string, shape?: NodeShape): void => {
    if (groupById.has(id)) return; // edge endpoint referencing a subgraph — leave as-is
    const existing = nodeById.get(id);
    if (existing) {
      if (label !== undefined) {
        existing.label = label;
        if (shape && shape !== 'rect') existing.shape = shape;
      }
      return;
    }
    if (nodeById.size >= limits.maxNodes) throw new ParseError(`Too many nodes (limit ${limits.maxNodes})`, lineNo);
    const node: DiagramNode = { id, label: label ?? id };
    if (shape && shape !== 'rect') node.shape = shape;
    nodeById.set(id, node);
    const container = groupStack[groupStack.length - 1];
    (container ? container.nodes : rootNodes).push(node);
  };

  /** Parse one node token (id with optional shape-delimited label) from position `pos`. */
  const parseNodeToken = (
    stmt: string,
    pos: number,
    lineNo: number,
  ): { id: string; end: number } => {
    const rest = stmt.slice(pos);
    const idMatch = NODE_ID_RE.exec(rest);
    if (!idMatch) throw new ParseError(`Expected a node id at: "${rest.trim()}"`, lineNo);
    const id = idMatch[0];
    let cursor = pos + id.length;
    const afterId = stmt.slice(cursor);
    for (const { open, close, shape } of SHAPE_DELIMS) {
      if (afterId.startsWith(open)) {
        const closeIdx = afterId.indexOf(close, open.length);
        if (closeIdx === -1) throw new ParseError(`Unclosed '${open}' on node '${id}'`, lineNo);
        const label = cleanLabel(afterId.slice(open.length, closeIdx));
        ensureNode(id, lineNo, label, shape);
        return { id, end: cursor + closeIdx + close.length };
      }
    }
    ensureNode(id, lineNo);
    return { id, end: cursor };
  };

  /** Parse a node list: `A` or `A & B & C`. Returns ids and end position. */
  const parseNodeList = (stmt: string, pos: number, lineNo: number): { ids: string[]; end: number } => {
    const ids: string[] = [];
    let cursor = pos;
    for (;;) {
      const { id, end } = parseNodeToken(stmt, cursor, lineNo);
      ids.push(id);
      const ampMatch = /^\s*&\s*/.exec(stmt.slice(end));
      if (!ampMatch) return { ids, end };
      cursor = end + ampMatch[0].length;
    }
  };

  /** Normalize `-- text -->` / `-. text .->` / `== text ==>` into `-->|text|` forms. */
  const normalizeInlineLabels = (stmt: string): string =>
    stmt
      .replace(/--\s+([^-|>][^-]*?)\s+-->/g, '-->|$1|')
      .replace(/-\.\s+([^.|][^.]*?)\s+\.->/g, '-.->|$1|')
      .replace(/==\s+([^=|][^=]*?)\s+==>/g, '==>|$1|');

  const parseStatement = (rawStmt: string, lineNo: number): void => {
    const stmt = normalizeInlineLabels(rawStmt);
    let { ids: fromIds, end } = parseNodeList(stmt, 0, lineNo);
    for (;;) {
      const opMatch = EDGE_OP_RE.exec(stmt.slice(end));
      if (!opMatch) break;
      const [, op, label] = opMatch;
      const style: EdgeStyle = op!.includes('.') ? 'dashed' : 'solid';
      const arrowType: ArrowType | undefined = op!.endsWith('>') ? undefined : 'none';
      const { ids: toIds, end: nextEnd } = parseNodeList(stmt, end + opMatch[0].length, lineNo);
      // Check before expanding: `A & B & ... --> X & Y & ...` grows as a product.
      if (edges.length + fromIds.length * toIds.length > limits.maxEdges) {
        throw new ParseError(`Too many edges (limit ${limits.maxEdges})`, lineNo);
      }
      for (const from of fromIds) {
        for (const to of toIds) {
          const edge: DiagramEdge = { from, to, style };
          if (label !== undefined && label.trim() !== '') edge.label = cleanLabel(label);
          if (arrowType) edge.arrowType = arrowType;
          edges.push(edge);
        }
      }
      fromIds = toIds;
      end = nextEnd;
    }
    const leftover = stmt.slice(end).trim();
    if (leftover !== '') throw new ParseError(`Unrecognized syntax: "${leftover}"`, lineNo);
  };

  // --- Main line loop -------------------------------------------------------
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    let line = lines[i]!.trim();
    if (line === '') continue;

    if (line.startsWith('%%')) {
      const iconMatch = ICON_DIRECTIVE_RE.exec(line);
      if (iconMatch) {
        // Entries separated by commas and/or whitespace (ids and icon names
        // contain neither, so both separators are unambiguous).
        for (const pair of iconMatch[1]!.split(/[,\s]+/).filter(Boolean)) {
          const eq = pair.indexOf('=');
          if (eq === -1) throw new ParseError(`Malformed icon directive entry: "${pair.trim()}"`, lineNo);
          iconById.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
        }
      }
      continue; // all other %% comments are ignored
    }

    if (!headerSeen) {
      const header = HEADER_RE.exec(line);
      if (!header) {
        const firstWord = line.split(/\s/)[0];
        throw new ParseError(
          `Unsupported diagram type '${firstWord}' — only Mermaid flowcharts ('graph'/'flowchart') are supported`,
          lineNo,
        );
      }
      direction = (header[2] === 'TD' ? 'TB' : (header[2] as Direction | undefined)) ?? 'TB';
      headerSeen = true;
      continue;
    }

    if (line.endsWith(';')) line = line.slice(0, -1).trim();

    if (IGNORED_PREFIXES.some((p) => line.startsWith(p))) continue;

    if (line.startsWith('subgraph')) {
      const rest = line.slice('subgraph'.length).trim();
      if (rest === '') throw new ParseError('subgraph requires an id or title', lineNo);
      const idLabel = SUBGRAPH_ID_LABEL_RE.exec(rest);
      const id = idLabel ? idLabel[1]! : rest.replace(/^"|"$/g, '');
      const label = idLabel ? cleanLabel(idLabel[2]!) : rest.replace(/^"|"$/g, '');
      if (groupById.has(id)) throw new ParseError(`Duplicate subgraph id '${id}'`, lineNo);
      if (groupById.size >= limits.maxGroups) {
        throw new ParseError(`Too many subgraphs (limit ${limits.maxGroups})`, lineNo);
      }
      if (groupStack.length >= limits.maxDepth) {
        throw new ParseError(`Subgraphs nested too deeply (limit ${limits.maxDepth})`, lineNo);
      }
      const group: MutableGroup = { id, label: label || id, nodes: [], groups: [] };
      groupById.set(id, group);
      const parent = groupStack[groupStack.length - 1];
      (parent ? parent.groups : rootGroups).push(group);
      groupStack.push(group);
      continue;
    }

    if (line === 'end') {
      if (groupStack.length === 0) throw new ParseError(`'end' without a matching 'subgraph'`, lineNo);
      groupStack.pop();
      continue;
    }

    const styleMatch = STYLE_RE.exec(line);
    if (styleMatch) {
      const fill = /fill:\s*(#[0-9a-fA-F]{3,8}|\w+)/.exec(styleMatch[2]!);
      if (fill) fillById.set(styleMatch[1]!, fill[1]!);
      continue;
    }

    parseStatement(line, lineNo);
  }

  if (groupStack.length > 0) {
    throw new ParseError(`Unclosed subgraph '${groupStack[groupStack.length - 1]!.id}' at end of input`, lines.length);
  }
  if (!headerSeen) {
    throw new ParseError('Empty input — expected a graph/flowchart header', 1);
  }

  // --- Apply directives and styles -----------------------------------------
  for (const [id, icon] of iconById) {
    const node = nodeById.get(id);
    if (node) node.icon = icon;
    const group = groupById.get(id);
    if (group) group.icon = icon;
  }
  for (const [id, fill] of fillById) {
    const node = nodeById.get(id);
    if (node) node.color = fill;
    const group = groupById.get(id);
    if (group) group.color = fill;
  }

  const toGroup = (g: MutableGroup): DiagramGroup => ({
    id: g.id,
    label: g.label,
    ...(g.icon ? { icon: g.icon } : {}),
    ...(g.color ? { color: g.color } : {}),
    nodes: g.nodes,
    ...(g.groups.length ? { groups: g.groups.map(toGroup) } : {}),
  });

  return { direction, nodes: rootNodes, groups: rootGroups.map(toGroup), edges };
}
