import { describe, expect, it } from 'vitest';
import ELK from 'elkjs/lib/elk.bundled.js';
import type { ElkNode } from 'elkjs/lib/elk-api.js';

describe('elkjs smoke test', () => {
  it('lays out a nested-group graph with positions and routed edges', async () => {
    const elk = new ELK();

    // Miniature version of our diagram shape: two groups, a cross-group edge.
    const graph: ElkNode = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'DOWN',
        'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      },
      children: [
        {
          id: 'power',
          children: [
            { id: 'bat', width: 180, height: 60 },
            { id: 'reg', width: 180, height: 60 },
          ],
          edges: [{ id: 'e1', sources: ['bat'], targets: ['reg'] }],
        },
        {
          id: 'control',
          children: [{ id: 'mcu', width: 180, height: 60 }],
        },
      ],
      edges: [{ id: 'e2', sources: ['reg'], targets: ['mcu'] }],
    };
    const result = await elk.layout(graph);

    const power = result.children?.find((c) => c.id === 'power');
    const control = result.children?.find((c) => c.id === 'control');
    const bat = power?.children?.find((c) => c.id === 'bat');

    // Every node and group got real coordinates and sizes.
    expect(power?.width).toBeGreaterThan(0);
    expect(control?.width).toBeGreaterThan(0);
    expect(bat?.x).toBeTypeOf('number');
    expect(bat?.y).toBeTypeOf('number');

    // The cross-group edge got routed with actual waypoints.
    const crossEdge = result.edges?.find((e) => e.id === 'e2');
    expect(crossEdge?.sections?.[0]?.startPoint).toBeDefined();
    expect(crossEdge?.sections?.[0]?.endPoint).toBeDefined();
  });
});
