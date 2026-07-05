import { type EulerDiagram, type EulerNode, type EulerSet } from "./layout";

export type IngestedNode = EulerNode & { zone: number };

export type IngestedDiagram = {
  sets: EulerSet[];
  nodes: IngestedNode[];
};

export function ingestDiagram(diagram: EulerDiagram): IngestedDiagram {
  const sets: EulerSet[] = [];
  const setBits = new Map<string, number>();

  for (const set of diagram.sets) {
    addSet(sets, setBits, set);
  }

  const nodes = diagram.nodes.map((node) => {
    const nodeSets = [...new Set(node.sets)];

    for (const set of nodeSets) {
      addSet(sets, setBits, { id: set, label: set });
    }

    return {
      ...node,
      sets: nodeSets,
      zone: getNodeZone(nodeSets, setBits),
    };
  });

  return { sets, nodes };
}

function addSet(sets: EulerSet[], setBits: Map<string, number>, set: EulerSet) {
  if (setBits.has(set.id)) {
    return;
  }

  setBits.set(set.id, 1 << sets.length);
  sets.push(set);
}

function getNodeZone(sets: string[], setBits: Map<string, number>) {
  let zone = 0;

  for (const setId of sets) {
    zone |= setBits.get(setId) ?? 0;
  }

  return zone;
}
