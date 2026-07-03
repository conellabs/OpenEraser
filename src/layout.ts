import ELK from 'elkjs/lib/elk.bundled.js';
import type { ElkNode } from 'elkjs/lib/elk-api.js';
import type { Pt, Rect } from './geometry.js';
import type { ThemeConfig } from './theme.js';
import { normalizeAccent } from './theme.js';
import type { DiagramAST, DiagramEdge, DiagramGroup, DiagramNode } from './types.js';

// Hybrid layout strategy (see Plan/open-eraser-plan.md, "Layout Spike Learnings"):
//   1. Each group's internals laid out independently (compact, orthogonal).
//   2. Groups become fixed-size nodes in a root layout (positioning only).
//   3. Cross-group edges drawn as direct beziers with obstacle-aware bowing.
// ELK's INCLUDE_CHILDREN mode was tried and rejected — it sprawls badly on
// cross-group-heavy diagrams. Don't reintroduce it without reading the plan.

const PAD = { top: 54, left: 22, right: 22, bottom: 22 };

const INNER_OPTS = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.layered.spacing.nodeNodeBetweenLayers': '36',
  'elk.spacing.nodeNode': '26',
  'elk.spacing.edgeNode': '16',
  'elk.spacing.componentComponent': '26',
  'elk.aspectRatio': '2.2',
};

export interface PlacedNode {
  node: DiagramNode;
  rect: Rect;
  accent: string;
}

export interface PlacedGroup {
  group: DiagramGroup;
  rect: Rect;
  accent: string;
  depth: number;
}

export interface IntraEdge {
  edge: DiagramEdge;
  points: Pt[];
}

export interface CrossEdge {
  edge: DiagramEdge;
  start: Pt;
  c1: Pt;
  c2: Pt;
  end: Pt;
}

export interface DiagramLayout {
  width: number;
  height: number;
  groups: PlacedGroup[];
  nodes: PlacedNode[];
  intraEdges: IntraEdge[];
  crossEdges: CrossEdge[];
}

export function nodeSize(n: DiagramNode): { width: number; height: number } {
  const lines = n.label.split('\n');
  const maxChars = Math.max(...lines.map((l) => l.length));
  const iconW = n.icon ? 40 : 0;
  return {
    width: Math.ceil(16 + iconW + maxChars * 6.9 + 16),
    height: Math.max(48, 14 + lines.length * 15 + 14),
  };
}

type Side = 'top' | 'bottom' | 'left' | 'right';

const SIDE_NORMALS: Record<Side, Pt> = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export async function layoutDiagram(ast: DiagramAST, theme: ThemeConfig): Promise<DiagramLayout> {
  const elk = new ELK();

  // --- Index the group tree -------------------------------------------------
  const groupById = new Map<string, DiagramGroup>();
  const leafGroupOf = new Map<string, string>(); // nodeId -> containing group id
  const ancestryOf = new Map<string, Set<string>>(); // groupId -> {self + ancestors}
  const nodeById = new Map<string, DiagramNode>();
  const walkGroups = (g: DiagramGroup, ancestors: string[]) => {
    groupById.set(g.id, g);
    ancestryOf.set(g.id, new Set([...ancestors, g.id]));
    for (const n of g.nodes) {
      leafGroupOf.set(n.id, g.id);
      nodeById.set(n.id, n);
    }
    for (const c of g.groups ?? []) walkGroups(c, [...ancestors, g.id]);
  };
  for (const g of ast.groups) walkGroups(g, []);
  for (const n of ast.nodes) nodeById.set(n.id, n);

  /** Set of group ids an edge endpoint sits inside (for obstacle exclusion). */
  const ancestryOfEndpoint = (id: string): Set<string> => {
    const leaf = leafGroupOf.get(id) ?? (groupById.has(id) ? id : undefined);
    return leaf ? (ancestryOf.get(leaf) ?? new Set()) : new Set();
  };

  for (const e of ast.edges) {
    for (const end of [e.from, e.to]) {
      if (!nodeById.has(end) && !groupById.has(end)) {
        throw new Error(`Edge references unknown id '${end}'`);
      }
    }
  }

  const intraEdgesIn = new Map<string, DiagramEdge[]>(); // groupId -> its direct-node edges
  const crossEdges: DiagramEdge[] = [];
  for (const e of ast.edges) {
    const ga = leafGroupOf.get(e.from);
    if (ga !== undefined && ga === leafGroupOf.get(e.to)) {
      if (!intraEdgesIn.has(ga)) intraEdgesIn.set(ga, []);
      intraEdgesIn.get(ga)!.push(e);
    } else {
      crossEdges.push(e);
    }
  }

  // --- Pass 1: bottom-up group sizing ---------------------------------------
  const innerOf = new Map<string, ElkNode>();
  const sizeOf = new Map<string, { w: number; h: number }>();
  const sizeGroup = async (g: DiagramGroup): Promise<void> => {
    for (const c of g.groups ?? []) await sizeGroup(c);
    const graph: ElkNode = {
      id: g.id,
      layoutOptions: INNER_OPTS,
      children: [
        ...g.nodes.map((n) => ({ id: n.id, ...nodeSize(n) })),
        ...(g.groups ?? []).map((c) => ({ id: c.id, width: sizeOf.get(c.id)!.w, height: sizeOf.get(c.id)!.h })),
      ],
      edges: (intraEdgesIn.get(g.id) ?? []).map((e, i) => ({
        id: `${g.id}_e${i}`,
        sources: [e.from],
        targets: [e.to],
      })),
    };
    const laid = await elk.layout(graph);
    innerOf.set(g.id, laid);
    sizeOf.set(g.id, {
      w: (laid.width ?? 0) + PAD.left + PAD.right,
      h: (laid.height ?? 0) + PAD.top + PAD.bottom,
    });
  };
  for (const g of ast.groups) await sizeGroup(g);

  // --- Pass 2: root layout (groups + top-level nodes as boxes) --------------
  const topContainerOf = (id: string): string => {
    const leaf = leafGroupOf.get(id) ?? (groupById.has(id) ? id : undefined);
    if (!leaf) return id; // top-level node
    const ancestry = ancestryOf.get(leaf)!;
    return ancestry.values().next().value!; // insertion order: outermost first
  };

  const rootGraph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': { TB: 'DOWN', BT: 'UP', LR: 'RIGHT', RL: 'LEFT' }[ast.direction],
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.layered.spacing.nodeNodeBetweenLayers': '90',
      'elk.spacing.nodeNode': '70',
      'elk.aspectRatio': '1.8',
    },
    children: [
      ...ast.nodes.map((n) => ({ id: n.id, ...nodeSize(n) })),
      ...ast.groups.map((g) => ({ id: g.id, width: sizeOf.get(g.id)!.w, height: sizeOf.get(g.id)!.h })),
    ],
    edges: crossEdges
      .map((e, i) => ({ id: `c${i}`, sources: [topContainerOf(e.from)], targets: [topContainerOf(e.to)] }))
      .filter((e) => e.sources[0] !== e.targets[0]), // same-tree edges don't constrain root placement
  };
  const rootLaid = await elk.layout(rootGraph);

  // --- Pass 3: top-down absolute placement ----------------------------------
  const placedGroups: PlacedGroup[] = [];
  const placedNodes: PlacedNode[] = [];
  const intraEdges: IntraEdge[] = [];
  const rectOfId = new Map<string, Rect>();
  const accentOfId = new Map<string, string>();

  const placeGroup = (g: DiagramGroup, x: number, y: number, depth: number, inheritedAccent: string) => {
    const accent = g.color !== undefined ? normalizeAccent(g.color, inheritedAccent) : inheritedAccent;
    const size = sizeOf.get(g.id)!;
    const rect: Rect = { x, y, w: size.w, h: size.h };
    rectOfId.set(g.id, rect);
    accentOfId.set(g.id, accent);
    placedGroups.push({ group: g, rect, accent, depth });

    const inner = innerOf.get(g.id)!;
    const ox = x + PAD.left;
    const oy = y + PAD.top;
    for (const child of inner.children ?? []) {
      const cx = ox + (child.x ?? 0);
      const cy = oy + (child.y ?? 0);
      const childGroup = (g.groups ?? []).find((c) => c.id === child.id);
      if (childGroup) {
        placeGroup(childGroup, cx, cy, depth + 1, accent);
      } else {
        const node = nodeById.get(child.id)!;
        const rect: Rect = { x: cx, y: cy, w: child.width ?? 0, h: child.height ?? 0 };
        rectOfId.set(node.id, rect);
        accentOfId.set(node.id, accent);
        placedNodes.push({ node, rect, accent });
      }
    }
    const gEdges = intraEdgesIn.get(g.id) ?? [];
    for (const elkE of inner.edges ?? []) {
      const idx = Number(elkE.id.split('_e')[1]);
      for (const s of elkE.sections ?? []) {
        intraEdges.push({
          edge: gEdges[idx]!,
          points: [s.startPoint, ...(s.bendPoints ?? []), s.endPoint].map((q) => ({ x: q.x + ox, y: q.y + oy })),
        });
      }
    }
  };

  for (const child of rootLaid.children ?? []) {
    const x = child.x ?? 0;
    const y = child.y ?? 0;
    const group = ast.groups.find((g) => g.id === child.id);
    if (group) {
      const i = ast.groups.indexOf(group);
      placeGroup(group, x, y, 0, normalizeAccent(group.color, theme.accentPalette[i % theme.accentPalette.length]!));
    } else {
      const node = nodeById.get(child.id)!;
      const rect: Rect = { x, y, w: child.width ?? 0, h: child.height ?? 0 };
      rectOfId.set(node.id, rect);
      accentOfId.set(node.id, theme.defaultAccent);
      placedNodes.push({ node, rect, accent: theme.defaultAccent });
    }
  }

  // --- Pass 4: cross-group edges as beziers ----------------------------------
  interface Plan {
    e: DiagramEdge;
    fromSide: Side;
    toSide: Side;
    start?: Pt;
    end?: Pt;
  }
  const plans: Plan[] = crossEdges.map((e) => {
    const a = rectOfId.get(e.from)!;
    const b = rectOfId.get(e.to)!;
    const dx = b.x + b.w / 2 - (a.x + a.w / 2);
    const dy = b.y + b.h / 2 - (a.y + a.h / 2);
    if (Math.abs(dx) > Math.abs(dy) * 1.3) {
      return { e, fromSide: dx > 0 ? 'right' : 'left', toSide: dx > 0 ? 'left' : 'right' };
    }
    return { e, fromSide: dy > 0 ? 'bottom' : 'top', toSide: dy > 0 ? 'top' : 'bottom' };
  });

  // Spread multiple anchors on the same node side so edges don't pile up.
  const bySide = new Map<string, { plan: Plan; which: 'start' | 'end' }[]>();
  for (const plan of plans) {
    const sKey = `${plan.e.from}:${plan.fromSide}`;
    const tKey = `${plan.e.to}:${plan.toSide}`;
    if (!bySide.has(sKey)) bySide.set(sKey, []);
    if (!bySide.has(tKey)) bySide.set(tKey, []);
    bySide.get(sKey)!.push({ plan, which: 'start' });
    bySide.get(tKey)!.push({ plan, which: 'end' });
  }
  for (const [key, entries] of bySide) {
    const sepIdx = key.lastIndexOf(':');
    const r = rectOfId.get(key.slice(0, sepIdx))!;
    const side = key.slice(sepIdx + 1) as Side;
    const horizontal = side === 'top' || side === 'bottom';
    entries.sort((p, q) => {
      const other = (x: { plan: Plan; which: 'start' | 'end' }) =>
        rectOfId.get(x.which === 'start' ? x.plan.e.to : x.plan.e.from)!;
      return horizontal ? other(p).x - other(q).x : other(p).y - other(q).y;
    });
    entries.forEach((entry, i) => {
      const t = (i + 1) / (entries.length + 1);
      entry.plan[entry.which] = horizontal
        ? { x: r.x + r.w * t, y: side === 'top' ? r.y : r.y + r.h }
        : { x: side === 'left' ? r.x : r.x + r.w, y: r.y + r.h * t };
    });
  }

  const chordHitsRect = (s: Pt, t: Pt, r: Rect, pad = 10): boolean => {
    for (let i = 1; i < 20; i++) {
      const p = { x: s.x + ((t.x - s.x) * i) / 20, y: s.y + ((t.y - s.y) * i) / 20 };
      if (p.x > r.x - pad && p.x < r.x + r.w + pad && p.y > r.y - pad && p.y < r.y + r.h + pad) return true;
    }
    return false;
  };

  const crossOut: CrossEdge[] = plans.map((plan) => {
    const s = plan.start!;
    const t = plan.end!;
    const d = Math.hypot(t.x - s.x, t.y - s.y);
    const k = Math.max(40, Math.min(150, d * 0.4));
    const ns = SIDE_NORMALS[plan.fromSide];
    const nt = SIDE_NORMALS[plan.toSide];
    let c1: Pt = { x: s.x + ns.x * k, y: s.y + ns.y * k };
    let c2: Pt = { x: t.x + nt.x * k, y: t.y + nt.y * k };

    // Bow vertical-ish edges around any group box sitting on the straight chord.
    if (plan.fromSide === 'top' || plan.fromSide === 'bottom') {
      const skip = new Set([...ancestryOfEndpoint(plan.e.from), ...ancestryOfEndpoint(plan.e.to)]);
      let bowX: number | undefined;
      let maxDetour = 0;
      for (const pg of placedGroups) {
        if (skip.has(pg.group.id) || !chordHitsRect(s, t, pg.rect)) continue;
        const mid = (s.x + t.x) / 2;
        const candidate = mid < pg.rect.x + pg.rect.w / 2 ? pg.rect.x - 36 : pg.rect.x + pg.rect.w + 36;
        const detour = Math.abs(candidate - mid);
        if (detour > maxDetour) {
          maxDetour = detour;
          bowX = candidate;
        }
      }
      if (bowX !== undefined) {
        c1 = { x: bowX, y: c1.y };
        c2 = { x: bowX, y: c2.y };
      }
    }
    return { edge: plan.e, start: s, c1, c2, end: t };
  });

  return {
    width: rootLaid.width ?? 0,
    height: rootLaid.height ?? 0,
    groups: placedGroups,
    nodes: placedNodes,
    intraEdges,
    crossEdges: crossOut,
  };
}
