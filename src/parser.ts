export interface EulerSet {
  id: string;
}

export interface EulerNode {
  id: string;
  sets: string[]; // set ids this node belongs to
}

export interface EulerDiagram {
  sets: EulerSet[];
  nodes: EulerNode[];
}

/**
 * Parse euler-ml syntax into a diagram data structure.
 *
 * Syntax:
 *   set <id>
 *   node <id> in <set1> [<setn>...]
 *
 * Example:
 *   set A
 *   set B
 *   node a in A
 *   node b in A B
 */
export function parse(src: string): EulerDiagram {
  const sets: EulerSet[] = [];
  const nodes: EulerNode[] = [];

  // ignore comments
  const lines = src.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));

  for (const line of lines) {
    // set <id>
    const setMatch = line.match(/^set\s+(\S+)/);
    if (setMatch) {
      sets.push({ id: setMatch[1] });
      continue;
    }

    // node <id> in <set1> [<setn>...]
    const nodeMatch = line.match(/^node\s+(\S+)\s+in\s+(.+)/);
    if (nodeMatch) {
      const memberSets = nodeMatch[2].split(/\s+/).map(s => s.trim());
      nodes.push({ id: nodeMatch[1], sets: memberSets });
      continue;
    }
  }

  return { sets, nodes };
}
