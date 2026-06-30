export type GraphNode = {
  id: string;
  x: number;
  y: number;
  label: string;
};

export type GraphEdge = {
  from: string;
  to: string;
  weight: number | null;
};

export type Graph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

const svgNamespace = "http://www.w3.org/2000/svg";
const viewBoxWidth = 640;
const padding = 48;

export function renderGraph(graph: Graph) {
  const graphNodes = graph.nodes.map((node) => ({
    ...node,
    x: scale(node.x),
    y: scale(node.y),
  }));
  const graphEdges = graph.edges;

  document.body.replaceChildren();
  document.body.style.margin = "0";
  document.body.style.background = "#050505";
  document.body.style.overflow = "hidden";

  const svg = document.createElementNS(svgNamespace, "svg");
  svg.setAttribute("width", "100vw");
  svg.setAttribute("height", "100vh");
  svg.setAttribute("viewBox", `0 0 ${viewBoxWidth} ${viewBoxWidth}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Graph");
  svg.style.display = "block";
  svg.style.background = "#050505";

  document.body.append(svg);

  const nodesById = new Map(graphNodes.map((node) => [node.id, node]));

  for (const edge of graphEdges) {
    const from = nodesById.get(edge.from);
    const to = nodesById.get(edge.to);

    if (!from || !to) {
      continue;
    }

    const line = createSvgElement("line", {
      x1: String(from.x),
      y1: String(from.y),
      x2: String(to.x),
      y2: String(to.y),
      stroke: "#777",
      "stroke-width": "2",
    });

    svg.append(line);

    if (edge.weight !== null) {
      const label = createSvgElement("text", {
        x: String((from.x + to.x) / 2),
        y: String((from.y + to.y) / 2 - 8),
        fill: "#ddd",
        "font-family": "system-ui, sans-serif",
        "font-size": "16",
        "text-anchor": "middle",
      });
      label.textContent = String(edge.weight);
      svg.append(label);
    }
  }

  for (const node of graphNodes) {
    const point = createSvgElement("circle", {
      cx: String(node.x),
      cy: String(node.y),
      r: "6",
      fill: "#fff",
    });

    const label = createSvgElement("text", {
      x: String(node.x),
      y: String(node.y - 14),
      fill: "#fff",
      "font-family": "system-ui, sans-serif",
      "font-size": "16",
      "text-anchor": "middle",
    });
    label.textContent = node.label;

    svg.append(point, label);
  }
}

function scale(x: number) {
  return padding + ((x + 1) / 2) * (viewBoxWidth - padding * 2);
}

function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tagName: K,
  attributes: Record<string, string>,
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(svgNamespace, tagName);

  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }

  return element;
}
