/**
 * Size limits applied before layout. Layout cost grows quickly with diagram
 * size, so oversized input is rejected up front instead of hanging the
 * process or the browser tab.
 */
export interface DiagramLimits {
  /** Maximum Mermaid source length in characters. */
  maxSourceLength: number;
  /** Maximum number of nodes. */
  maxNodes: number;
  /** Maximum number of edges, after `A & B --> C & D` expansion. */
  maxEdges: number;
  /** Maximum number of subgraphs. */
  maxGroups: number;
  /** Maximum subgraph nesting depth. */
  maxDepth: number;
}

export const defaultLimits: Readonly<DiagramLimits> = Object.freeze({
  maxSourceLength: 200_000,
  maxNodes: 400,
  maxEdges: 1_000,
  maxGroups: 100,
  maxDepth: 20,
});

export function resolveLimits(overrides?: Partial<DiagramLimits>): DiagramLimits {
  const limits = { ...defaultLimits, ...overrides };
  for (const [key, value] of Object.entries(limits)) {
    if (!Number.isInteger(value) || value < 1) {
      throw new TypeError(`Limit '${key}' must be a positive integer`);
    }
  }
  return limits;
}
