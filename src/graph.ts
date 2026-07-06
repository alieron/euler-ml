import { type Layout, type LayoutSet } from "./layout";

const svgNamespace = "http://www.w3.org/2000/svg";
const viewBoxWidth = 640;
const padding = 48;

export function renderGraph(graph: Layout) {
  const graphNodes = graph.nodes.map((node) => ({
    ...node,
    x: scale(node.x),
    y: scale(node.y),
  }));

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

  drawSetHulls(svg, graph.sets);

  for (const node of graphNodes) {
    const point = createSvgElement("circle", {
      cx: String(node.x),
      cy: String(node.y),
      r: "6",
      fill: node.color ?? "#fff",
    });

    svg.append(point);

    if (node.label) {
      const label = createSvgElement("text", {
        x: String(node.x),
        y: String(node.y - 14),
        fill: "#fff",
        "font-family": "system-ui, sans-serif",
        "font-size": "16",
        "text-anchor": "middle",
      });
      label.textContent = node.label;
      svg.append(label);
    }
  }
}

function drawSetHulls(svg: SVGSVGElement, sets: LayoutSet[]) {
  sets.forEach((set) => {
    const hull = set.hull.map((point) => ({ x: scale(point.x), y: scale(point.y) }));

    if (hull.length === 2) {
      svg.append(createSvgElement("line", {
        x1: String(hull[0].x),
        y1: String(hull[0].y),
        x2: String(hull[1].x),
        y2: String(hull[1].y),
        stroke: set.color,
        "stroke-opacity": "0.75",
        "stroke-width": "2",
      }));
    } else if (hull.length > 2) {
      svg.append(createSvgElement("polygon", {
        points: hull.map((point) => `${point.x},${point.y}`).join(" "),
        fill: set.color,
        "fill-opacity": "0.14",
        stroke: set.color,
        "stroke-opacity": "0.75",
        "stroke-width": "2",
      }));
    }
  });
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
