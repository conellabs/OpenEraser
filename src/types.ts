export type Direction = 'TB' | 'BT' | 'LR' | 'RL';

export type NodeShape = 'rect' | 'rounded' | 'cylinder' | 'circle';

export type EdgeStyle = 'solid' | 'dashed' | 'dotted';

export type ArrowType = 'arrow' | 'none' | 'circle';

export interface DiagramNode {
  id: string;
  label: string;
  icon?: string;
  shape?: NodeShape;
  color?: string;
}

export interface DiagramGroup {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  nodes: DiagramNode[];
  groups?: DiagramGroup[];
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  style: EdgeStyle;
  arrowType?: ArrowType;
}

export interface DiagramAST {
  direction: Direction;
  /** Nodes that live outside any subgraph. */
  nodes: DiagramNode[];
  groups: DiagramGroup[];
  edges: DiagramEdge[];
}
