import {
  forceCenter,
  forceLink,
  forceSimulation,
  forceX,
  forceY,
  type ForceLink,
  type ForceX,
  type ForceY,
  type SimulationNodeDatum,
} from 'd3-force';
import type { EulerDiagram } from './parser';

type Kind = 'category' | 'intersection' | 'item';
type Node = SimulationNodeDatum & { id: string; label: string; kind: Kind; color: string; sets: string[] };
type LinkKind = 'intersection' | 'item';
type Link = { source: string | Node; target: string | Node; kind: LinkKind; strength: number; singleton?: boolean };

type Settings = {
  categoryRepel: number;
  intersectionRepel: number;
  categoryCenter: number;
  categoryRadius: number;
  intersectionLink: number;
  intersectionDistance: number;
  itemLink: number;
  itemDistance: number;
  itemRadius: number;
};

const defaults: Settings = {
  categoryRepel: 900,
  intersectionRepel: 120,
  categoryCenter: 0.08,
  categoryRadius: 45,
  intersectionLink: 1.8,
  intersectionDistance: 35,
  itemLink: 1.4,
  itemDistance: 16,
  itemRadius: 10,
};

const controls: Record<keyof Settings, [number, number, number]> = {
  categoryRepel: [0, 3000, 10],
  intersectionRepel: [0, 1000, 10],
  categoryCenter: [0, 1, 0.01],
  categoryRadius: [0, 100, 1],
  intersectionLink: [0, 3, 0.05],
  intersectionDistance: [0, 160, 1],
  itemLink: [0, 3, 0.05],
  itemDistance: [0, 80, 1],
  itemRadius: [0, 50, 1],
};

function key(sets: string[]) {
  return sets.slice().sort().join('&');
}

function buildGraph(diagram: EulerDiagram) {
  const nodes: Node[] = diagram.sets.map(s => ({ id: s.id, label: s.label, color: s.color!, kind: 'category', sets: [s.id] }));
  const links: Link[] = [];
  const intersections = new Set(diagram.items.filter(i => i.sets.length > 1).map(i => key(i.sets)));

  for (const id of intersections) {
    const sets = id.split('&');
    nodes.push({ id, label: ''/*sets.join(' ∩ ')*/, color: '#F2994A', kind: 'intersection', sets });
    for (const set of sets) links.push({ source: id, target: set, kind: 'intersection', strength: defaults.intersectionLink });
  }

  const targetCounts = new Map<string, number>();
  for (const item of diagram.items) {
    const target = item.sets.length === 1 ? item.sets[0] : key(item.sets);
    targetCounts.set(target, (targetCounts.get(target) ?? 0) + 1);
  }

  for (const item of diagram.items) {
    const target = item.sets.length === 1 ? item.sets[0] : key(item.sets);
    nodes.push({ id: `item:${item.id}`, label: item.label, color: '#FFFFFF', kind: 'item', sets: item.sets });
    links.push({
      source: `item:${item.id}`,
      target,
      kind: 'item',
      strength: defaults.itemLink,
      singleton: item.sets.length > 1 && targetCounts.get(target) === 1,
    });
  }

  return { nodes, links };
}

function perTypeRepulsion(nodes: Node[], kind: Kind, strength: () => number) {
  return (alpha: number) => {
    const group = nodes.filter(n => n.kind === kind);
    for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
      const a = group[i], b = group[j];
      const dx = (a.x ?? 0) - (b.x ?? 0) || 1e-6;
      const dy = (a.y ?? 0) - (b.y ?? 0) || 1e-6;
      const f = (strength() * alpha) / Math.max(100, dx * dx + dy * dy);
      a.vx = (a.vx ?? 0) + dx * f;
      a.vy = (a.vy ?? 0) + dy * f;
      b.vx = (b.vx ?? 0) - dx * f;
      b.vy = (b.vy ?? 0) - dy * f;
    }
  };
}

function collision(nodes: Node[], radius: (n: Node) => number) {
  return (alpha: number) => {
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      if (a.kind !== b.kind || a.kind === 'intersection') continue;
      const dx = (a.x ?? 0) - (b.x ?? 0) || 1e-6;
      const dy = (a.y ?? 0) - (b.y ?? 0) || 1e-6;
      const min = radius(a) + radius(b);
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= min) continue;
      const push = (min - d) / d * alpha * 0.5;
      a.vx = (a.vx ?? 0) + dx * push;
      a.vy = (a.vy ?? 0) + dy * push;
      b.vx = (b.vx ?? 0) - dx * push;
      b.vy = (b.vy ?? 0) - dy * push;
    }
  };
}

function slider(name: keyof Settings, value: number, onChange: (v: number) => void) {
  const [min, max, step] = controls[name];
  const label = document.createElement('label');
  label.className = 'force-control';
  label.innerHTML = `<span>${name}: <b>${value}</b></span>`;
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.oninput = () => {
    label.querySelector('b')!.textContent = input.value;
    onChange(Number(input.value));
  };
  label.append(input);
  return label;
}

export function renderCanvas(parent: HTMLElement, diagram: EulerDiagram) {
  const settings = { ...defaults };
  const { nodes, links } = buildGraph(diagram);
  const canvas = document.createElement('canvas');
  const panel = document.createElement('div');
  const ctx = canvas.getContext('2d')!;
  const size = 720;

  canvas.width = size;
  canvas.height = size;
  panel.className = 'force-panel';
  parent.append(panel, canvas);

  function collisionForce(n: Node) {
    switch (n.kind) {
      case "category":
        return settings.categoryRadius;
      case "intersection":
        return 0;
      case "item":
        return settings.itemRadius;
    }
  }

  function linkDistance(l: Link) {
    if (l.kind === 'intersection') return settings.intersectionDistance;
    if (l.singleton) return 0;
    return settings.itemDistance;
  }

  const sim = forceSimulation<Node>(nodes)
    .force('center', forceCenter(size / 2, size / 2))
    .force('categoryRepel', perTypeRepulsion(nodes, 'category', () => settings.categoryRepel))
    .force('intersectionRepel', perTypeRepulsion(nodes, 'intersection', () => settings.intersectionRepel))
    // .force('x', forceX<Node>(size / 2).strength(n => n.kind === 'category' ? settings.categoryCenter : 0.01))
    // .force('y', forceY<Node>(size / 2).strength(n => n.kind === 'category' ? settings.categoryCenter : 0.01))
    .force('collide', collision(nodes, collisionForce))
    .force('link', forceLink<Node, Link>(links).id(n => n.id).distance(linkDistance).strength(l => l.strength));

  function update() {
    for (const l of links) l.strength = l.kind === 'item' ? settings.itemLink : settings.intersectionLink;
    // (sim.force('x') as ForceX<Node>).strength(n => n.kind === 'category' ? settings.categoryCenter : 0.01);
    // (sim.force('y') as ForceY<Node>).strength(n => n.kind === 'category' ? settings.categoryCenter : 0.01);
    (sim.force('link') as ForceLink<Node, Link>).distance(linkDistance).strength(l => l.strength);
    sim.alpha(1).restart();
  }

  for (const name of Object.keys(settings) as (keyof Settings)[]) {
    panel.append(slider(name, settings[name], value => { settings[name] = value; update(); }));
  }

  sim.on('tick', () => {
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    for (const l of links) {
      const a = l.source as Node, b = l.target as Node;
      ctx.beginPath(); ctx.moveTo(a.x!, a.y!); ctx.lineTo(b.x!, b.y!); ctx.stroke();
    }
    ctx.font = '13px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    for (const n of nodes) {
      ctx.fillStyle = n.color;
      ctx.beginPath(); ctx.arc(n.x!, n.y!, n.kind === 'category' ? 6 : n.kind === 'intersection' ? 4 : 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillText(n.label, n.x!, n.y! - 10);
    }
  });
}
