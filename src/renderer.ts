import { getLayout, type LayoutPoint } from "./layout";
import { type ParsedDiagram, type Settings } from "./parser";

type ScreenPoint = LayoutPoint;

export function renderSVG(parsed: ParsedDiagram) {
  const layout = getLayout(parsed.diagram);
  const settings = parsed.settings;
  const nodeById = new Map(layout.nodes.map((node) => [node.id, node]));

  const svg: string[] = [
    `<svg class="euler-diagram" xmlns="http://www.w3.org/2000/svg" width="${settings.width}" height="${settings.height}" viewBox="0 0 ${settings.width} ${settings.height}">`,
    `<rect width="100%" height="100%" fill="#050505"/>`,
  ];

  for (const set of layout.sets) {
    const path = getRoundedPath(set.hull.map((point) => scalePoint(point, settings)), settings);

    if (path) {
      svg.push(`<path d="${path}" fill="${set.color}" fill-opacity="${settings.fillOpacity}" stroke="${set.color}" stroke-opacity="0.8" stroke-width="${settings.strokeWidth}"/>`);
    }
  }

  for (const set of layout.sets) {
    const members = parsed.diagram.nodes
      .filter((node) => node.sets.includes(set.id))
      .map((node) => nodeById.get(node.id))
      .filter((node): node is NonNullable<typeof node> => Boolean(node))
      .map((node) => scalePoint(node, settings));

    if (members.length === 0) {
      continue;
    }

    const labelPoint = getGeometricMedian(members);

    svg.push(`<text x="${labelPoint.x}" y="${labelPoint.y}" text-anchor="middle" dominant-baseline="middle" font-family="JetBrains Mono, Consolas, monospace" font-size="${settings.setLabelFontSize}" font-weight="700" fill="${set.color}">${escapeXml(set.label ?? set.id)}</text>`);
  }

  for (const node of layout.nodes) {
    const point = scalePoint(node, settings);

    svg.push(`<text x="${point.x}" y="${point.y}" text-anchor="middle" dominant-baseline="middle" font-family="JetBrains Mono, Consolas, monospace" font-size="${settings.nodeFontSize}" fill="${node.color ?? "#ffffff"}">${escapeXml(node.label ?? node.id)}</text>`);
  }

  svg.push("</svg>");

  return svg.join("\n");
}

function getRoundedPath(points: ScreenPoint[], settings: Settings) {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    const radius = settings.cornerRadius;

    return `M ${points[0].x - radius} ${points[0].y} a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 ${-radius * 2} 0`;
  }

  if (points.length === 2) {
    return getCapsulePath(points[0], points[1], settings.cornerRadius);
  }

  const orientation = Math.sign(area(points)) || 1;
  const radii = points.map((_, index) => isConcave(points, index, orientation) ? settings.concaveRadius : settings.cornerRadius);
  const tangents = points.map((_, index) => getEdgeTangents(points, radii, index, orientation));
  const path = [`M ${tangents[0].start.x} ${tangents[0].start.y}`, `L ${tangents[0].end.x} ${tangents[0].end.y}`];

  for (let index = 1; index < points.length; index++) {
    path.push(getCorner(points, radii, tangents, index, orientation));
    path.push(`L ${tangents[index].end.x} ${tangents[index].end.y}`);
  }

  path.push(getCorner(points, radii, tangents, 0, orientation), "Z");

  return path.join(" ");
}

function getEdgeTangents(points: ScreenPoint[], radii: number[], index: number, orientation: number) {
  const from = points[index];
  const to = points[(index + 1) % points.length];
  const fromRadius = radii[index];
  const toRadius = radii[(index + 1) % points.length];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const baseNormal = orientation > 0 ? { x: uy, y: -ux } : { x: -uy, y: ux };
  const radiusDelta = clamp((fromRadius - toRadius) / length, -0.95, 0.95);
  const normalScale = Math.sqrt(1 - radiusDelta * radiusDelta);
  const candidates = [
    { x: ux * radiusDelta - uy * normalScale, y: uy * radiusDelta + ux * normalScale },
    { x: ux * radiusDelta + uy * normalScale, y: uy * radiusDelta - ux * normalScale },
  ];
  const normal = dot(candidates[0], baseNormal) > dot(candidates[1], baseNormal) ? candidates[0] : candidates[1];

  return {
    start: { x: from.x + normal.x * fromRadius, y: from.y + normal.y * fromRadius },
    end: { x: to.x + normal.x * toRadius, y: to.y + normal.y * toRadius },
  };
}

function getCorner(points: ScreenPoint[], radii: number[], tangents: { start: ScreenPoint; end: ScreenPoint }[], index: number, orientation: number) {
  const radius = radii[index];
  const previousTangent = tangents[wrap(index - 1, tangents.length)];
  const nextTangent = tangents[index];
  const from = previousTangent.end;
  const to = nextTangent.start;

  if (radius <= 0) {
    return `L ${to.x} ${to.y}`;
  }

  if (isConcave(points, index, orientation)) {
    const control = lineIntersection(previousTangent.start, previousTangent.end, nextTangent.start, nextTangent.end) ?? getAntiArcFallback(points[index], from, to);

    return `Q ${control.x} ${control.y} ${to.x} ${to.y}`;
  }

  const sweep = orientation > 0 ? 1 : 0;

  return `A ${radius} ${radius} 0 0 ${sweep} ${to.x} ${to.y}`;
}

function isConcave(points: ScreenPoint[], index: number, orientation: number) {
  return Math.sign(cross(points[wrap(index - 1, points.length)], points[index], points[wrap(index + 1, points.length)])) !== orientation;
}

function getCapsulePath(from: ScreenPoint, to: ScreenPoint, radius: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const px = (-dy / length) * radius;
  const py = (dx / length) * radius;

  return [
    `M ${from.x + px} ${from.y + py}`,
    `L ${to.x + px} ${to.y + py}`,
    `Q ${to.x} ${to.y} ${to.x - px} ${to.y - py}`,
    `L ${from.x - px} ${from.y - py}`,
    `Q ${from.x} ${from.y} ${from.x + px} ${from.y + py}`,
    "Z",
  ].join(" ");
}

function scalePoint(point: LayoutPoint, settings: Settings) {
  return {
    x: settings.padding + ((point.x + 1) / 2) * (settings.width - settings.padding * 2),
    y: settings.padding + ((point.y + 1) / 2) * (settings.height - settings.padding * 2),
  };
}

function getGeometricMedian(points: ScreenPoint[]) {
  let point = getCenter(points);

  for (let iteration = 0; iteration < 40; iteration++) {
    let weight = 0;
    let x = 0;
    let y = 0;

    for (const target of points) {
      const distanceToTarget = Math.max(distance(point, target), 0.001);
      const targetWeight = 1 / distanceToTarget;

      weight += targetWeight;
      x += target.x * targetWeight;
      y += target.y * targetWeight;
    }

    point = { x: x / weight, y: y / weight };
  }

  return point;
}

function getCenter(points: ScreenPoint[]) {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function area(points: ScreenPoint[]) {
  let total = 0;

  for (let index = 0; index < points.length; index++) {
    const from = points[index];
    const to = points[(index + 1) % points.length];
    total += from.x * to.y - to.x * from.y;
  }

  return total / 2;
}

function cross(origin: ScreenPoint, a: ScreenPoint, b: ScreenPoint) {
  return (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);
}

function distance(a: ScreenPoint, b: ScreenPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function lineIntersection(a: ScreenPoint, b: ScreenPoint, c: ScreenPoint, d: ScreenPoint) {
  const abX = b.x - a.x;
  const abY = b.y - a.y;
  const cdX = d.x - c.x;
  const cdY = d.y - c.y;
  const denominator = abX * cdY - abY * cdX;

  if (Math.abs(denominator) < 0.000001) {
    return undefined;
  }

  const amount = ((c.x - a.x) * cdY - (c.y - a.y) * cdX) / denominator;

  return {
    x: a.x + abX * amount,
    y: a.y + abY * amount,
  };
}

function getAntiArcFallback(center: ScreenPoint, from: ScreenPoint, to: ScreenPoint) {
  const midpoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const dx = midpoint.x - center.x;
  const dy = midpoint.y - center.y;

  return {
    x: midpoint.x + dx,
    y: midpoint.y + dy,
  };
}

function dot(a: ScreenPoint, b: ScreenPoint) {
  return a.x * b.x + a.y * b.y;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function wrap(index: number, length: number) {
  return (index + length) % length;
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
