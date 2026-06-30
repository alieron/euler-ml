import { type Graph } from "./graph";

export interface EulerSet {
  id: string;
  label: string;
}

export interface EulerNode {
  id: string;
  label: string;
  sets: string[]; // set ids this node belongs to
}

export interface EulerDiagram {
  sets: EulerSet[];
  nodes: EulerNode[];
}

type LayoutNode = EulerNode & {
  zone: number;
  x: number;
  y: number;
};

type PairTarget = {
  distance: number;
  weight: number;
  attracts: boolean;
};

const goldenAngle = Math.PI * (3 - Math.sqrt(5));

export function getLayout(diagram: EulerDiagram): Graph {
  const setBits = new Map<string, number>();

  diagram.sets.forEach((set, index) => {
    setBits.set(set.id, 1 << index);
  });

  const layoutNodes = diagram.nodes.map((node, index) => {
    const zone = getNodeZone(node, setBits);
    const point = getInitialPoint(zone, index, diagram.sets.length);

    return {
      ...node,
      zone,
      x: point.x,
      y: point.y,
    };
  });

  const positionedNodes = minimizeEnergy(layoutNodes, diagram.sets.length);

  return {
    nodes: positionedNodes.map((node) => ({
      id: node.id,
      x: node.x,
      y: node.y,
      label: node.label,
    })),
    edges: getAttractionEdges(positionedNodes, diagram.sets.length),
  };
}

function getNodeZone(node: EulerNode, setBits: Map<string, number>) {
  let zone = 0;

  for (const setId of node.sets) {
    zone |= setBits.get(setId) ?? 0;
  }

  return zone;
}

function getInitialPoint(zone: number, index: number, setCount: number) {
  const setIndexes = getSetIndexes(zone);

  if (setIndexes.length === 0) {
    const angle = (index + 1) * goldenAngle;

    return { x: Math.cos(angle) * 0.25, y: Math.sin(angle) * 0.25 };
  }

  if (setCount === 1) {
    return { x: 0, y: 0 };
  }

  const point = setIndexes.reduce(
    (sum, setIndex) => {
      const angle = (setIndex / Math.max(setCount - 1, 1)) * Math.PI;

      return {
        x: sum.x + Math.cos(angle),
        y: sum.y + Math.sin(angle),
      };
    },
    { x: 0, y: 0 },
  );

  const jitterAngle = (index + 1) * goldenAngle;
  const jitter = 0.02;

  return {
    x: point.x / setIndexes.length + Math.cos(jitterAngle) * jitter,
    y: point.y / setIndexes.length + Math.sin(jitterAngle) * jitter,
  };
}

function minimizeEnergy(nodes: LayoutNode[], setCount: number) {
  const positioned = nodes.map((node) => ({ ...node }));
  const iterations = 1400;

  for (let iteration = 0; iteration < iterations; iteration++) {
    const progress = iteration / iterations;
    const step = 0.06 * (1 - progress) + 0.006;
    const forces = positioned.map(() => ({ x: 0, y: 0 }));

    for (let fromIndex = 0; fromIndex < positioned.length; fromIndex++) {
      for (let toIndex = fromIndex + 1; toIndex < positioned.length; toIndex++) {
        const from = positioned[fromIndex];
        const to = positioned[toIndex];
        const target = getPairTarget(from.zone, to.zone, setCount);
        let deltaX = to.x - from.x;
        let deltaY = to.y - from.y;
        let distance = Math.hypot(deltaX, deltaY);

        if (distance < 0.001) {
          const angle = (fromIndex + toIndex + 1) * goldenAngle;
          deltaX = Math.cos(angle) * 0.001;
          deltaY = Math.sin(angle) * 0.001;
          distance = 0.001;
        }

        const force = clamp((distance - target.distance) * target.weight, -0.18, 0.18);
        const forceX = (deltaX / distance) * force;
        const forceY = (deltaY / distance) * force;

        forces[fromIndex].x += forceX;
        forces[fromIndex].y += forceY;
        forces[toIndex].x -= forceX;
        forces[toIndex].y -= forceY;
      }
    }

    for (let index = 0; index < positioned.length; index++) {
      positioned[index].x += forces[index].x * step;
      positioned[index].y += forces[index].y * step;
      positioned[index].x -= positioned[index].x * 0.002;
      positioned[index].y -= positioned[index].y * 0.002;
    }
  }

  const normalized = normalizePoints(positioned);

  return positioned.map((node, index) => ({
    ...node,
    x: normalized[index].x,
    y: normalized[index].y,
  }));
}

function getPairTarget(from: number, to: number, setCount: number): PairTarget {
  if (from === to) {
    return { distance: 0.16, weight: 8, attracts: true };
  }

  const sharedSets = getBitCount(from & to);
  const totalSets = getBitCount(from | to);

  if (sharedSets === 0) {
    return { distance: 1.45, weight: 0.35, attracts: false };
  }

  const similarity = totalSets === 0 ? 0 : sharedSets / totalSets;

  return {
    distance: 0.28 + (1 - similarity) * 0.55,
    weight: 3 + similarity * 4 + getBitCount(from ^ to) / Math.max(setCount, 1),
    attracts: true,
  };
}

function getSetIndexes(zone: number) {
  const indexes: number[] = [];
  let remaining = zone;
  let index = 0;

  while (remaining !== 0) {
    if ((remaining & 1) === 1) {
      indexes.push(index);
    }

    remaining >>>= 1;
    index += 1;
  }

  return indexes;
}

function getAttractionEdges(nodes: LayoutNode[], setCount: number): Graph["edges"] {
  const edges: Graph["edges"] = [];

  for (let fromIndex = 0; fromIndex < nodes.length; fromIndex++) {
    for (let toIndex = fromIndex + 1; toIndex < nodes.length; toIndex++) {
      if (getPairTarget(nodes[fromIndex].zone, nodes[toIndex].zone, setCount).attracts) {
        edges.push({ from: nodes[fromIndex].id, to: nodes[toIndex].id, weight: null });
      }
    }
  }

  return edges;
}

function normalizePoints(points: { x: number; y: number }[]) {
  if (points.length === 0) {
    return [];
  }

  const centerX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const centerY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const centered = points.map((point) => ({ x: point.x - centerX, y: point.y - centerY }));
  const maxDistance = Math.max(...centered.map((point) => Math.hypot(point.x, point.y)), 1);

  return centered.map((point) => ({
    x: point.x / maxDistance,
    y: point.y / maxDistance,
  }));
}

function getBitCount(value: number) {
  let remaining = value;
  let count = 0;

  while (remaining !== 0) {
    count += remaining & 1;
    remaining >>>= 1;
  }

  return count;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
