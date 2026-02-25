import type { EulerDiagram, EulerSet, EulerNode } from './parser';

function svgTextLabel(label: string, x: number, y: number) {
  return `
<text x="${x}" y="${y}"
  text-anchor="middle"
  fill="#FFFFFF"
  font-family="JetBrains Mono", monospace
  font-size="15"
>${label}</text>
`
}

// renders a set as a circle with the label in the circle on the top
function renderSet(set: EulerSet, cx: number, cy: number, r: number): string {
  const { id } = set;
  return `
<g class="euler-set" data-id="${id}">
  <circle cx="${cx}" cy="${cy}" r="${r}"
    fill="rgba(255,255,255,0)"
    stroke="#FFFFFF"
    stroke-width="2"
  />
  ${svgTextLabel(id, cx, cy - r - 20)}
</g>`;
}

// renders a node as a solid point with the label on top
function renderNode(node: EulerNode, cx: number, cy: number): string {
  const { id } = node;
  return `
<g class="euler-node" data-id="${id}">
  <circle cx="${cx}" cy="${cy}" r="4"
    fill="#FFFFFF"
  />
  ${svgTextLabel(id, cx, cy - 10)}
</g>`;
}

/** Full SVG document for a diagram */
export function renderSVG(diagram: EulerDiagram): string {
  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="640"
  height="640"
  viewBox="0 0 640 640"
  class="euler-diagram"
>
  <defs>
    <style>
      .euler-set-label { text-rendering: optimizeLegibility; }
      .euler-node rect { transition: opacity 0.15s; }
      .euler-node:hover rect { opacity: 0.85; }
    </style>
  </defs>
  ${renderSet(diagram.sets[0], 320, 320, 200)}
  ${renderNode(diagram.nodes[0], 20, 20)}
</svg>`;
}
