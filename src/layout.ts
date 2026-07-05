import { getConvexHull } from "./hull";
import { ingestDiagram } from "./ingest";
import { positionNodes } from "./position";

export type LayoutPoint = { x: number; y: number };

export type LayoutNode = LayoutPoint & {
  id: string;
  label?: string;
  color?: string;
};

export type LayoutSet = {
  id: string;
  label?: string;
  color: string;
  hull: LayoutPoint[];
};

export type Layout = {
  nodes: LayoutNode[];
  sets: LayoutSet[];
};

export type EulerSet = {
  id: string;
  label?: string;
  color?: string;
};

export type EulerNode = {
  id: string;
  label?: string;
  color?: string;
  sets: string[];
};

export interface EulerDiagram {
  sets: EulerSet[];
  nodes: EulerNode[];
}

const setColors = ["#f87171", "#60a5fa", "#34d399", "#fbbf24", "#c084fc", "#fb7185", "#22d3ee"];

export function getLayout(diagram: EulerDiagram): Layout {
  const ingested = ingestDiagram(diagram);
  const positionedNodes = positionNodes(ingested.nodes, ingested.sets.length);

  return {
    nodes: positionedNodes.map((node) => ({
      id: node.id,
      x: node.x,
      y: node.y,
      label: node.label,
      color: node.color,
    })),
    sets: ingested.sets.map((set, index) => ({
      id: set.id,
      label: set.label,
      color: set.color ?? setColors[index % setColors.length],
      hull: getConvexHull(positionedNodes.filter((node) => node.sets.includes(set.id))).map((point) => ({
        x: point.x,
        y: point.y,
      })),
    })),
  };
}
