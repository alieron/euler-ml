import { type LayoutPoint } from "./layout";

const epsilon = 0.000001;
const minComfortableAngle = Math.PI / 2;
const anglePenaltyWeight = 1.5;

export function getSetHull(members: LayoutPoint[], obstacles: LayoutPoint[]) {
  let hull = getConvexHull(members);

  if (hull.length <= 2) {
    return hull;
  }

  for (let attempts = 0; attempts < members.length; attempts++) {
    const obstacle = obstacles.find((point) => isInsidePolygon(point, hull));

    if (!obstacle) {
      break;
    }

    const next = getConcaveHull(hull, members, obstacle);

    if (!next) {
      break;
    }

    hull = next;
  }

  return hull;
}

function getConcaveHull(hull: LayoutPoint[], members: LayoutPoint[], obstacle: LayoutPoint) {
  let best: { hull: LayoutPoint[]; cost: number } | undefined;

  for (let index = 0; index < hull.length; index++) {
    const from = hull[index];
    const to = hull[(index + 1) % hull.length];

    for (const point of members) {
      if (hull.includes(point) || !isInsideTriangle(obstacle, from, point, to)) {
        continue;
      }

      const candidate = [...hull.slice(0, index + 1), point, ...hull.slice(index + 1)];

      if (isInsidePolygon(obstacle, candidate) || !isSimplePolygon(candidate) || members.some((member) => !isInsideOrOnPolygon(member, candidate))) {
        continue;
      }

      const cost = getCandidateCost(candidate, index + 1, distance(from, point) + distance(point, to) - distance(from, to));

      if (!best || cost < best.cost) {
        best = { hull: candidate, cost };
      }
    }
  }

  return best?.hull;
}

function getCandidateCost(candidate: LayoutPoint[], insertedIndex: number, lengthCost: number) {
  const changedIndexes = [insertedIndex - 1, insertedIndex, insertedIndex + 1];
  const angleCost = changedIndexes.reduce((sum, index) => {
    const angle = getCornerAngle(candidate, index);
    const penalty = Math.max((minComfortableAngle - angle) / minComfortableAngle, 0);

    return sum + penalty * penalty;
  }, 0);

  return lengthCost + angleCost * anglePenaltyWeight;
}

function getConvexHull(points: LayoutPoint[]) {
  const sorted = [...points]
    .sort((a, b) => a.x - b.x || a.y - b.y)
    .filter((point, index, array) => index === 0 || point.x !== array[index - 1].x || point.y !== array[index - 1].y);

  if (sorted.length <= 2) {
    return sorted;
  }

  const lower: LayoutPoint[] = [];
  const upper: LayoutPoint[] = [];

  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop();
    }
    lower.push(point);
  }

  for (const point of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop();
    }
    upper.push(point);
  }

  lower.pop();
  upper.pop();

  return lower.concat(upper);
}

function isInsidePolygon(point: LayoutPoint, polygon: LayoutPoint[]) {
  if (isOnPolygon(point, polygon)) {
    return false;
  }

  let inside = false;

  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index];
    const b = polygon[previous];

    if ((a.y > point.y) !== (b.y > point.y) && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }

  return inside;
}

function isInsideOrOnPolygon(point: LayoutPoint, polygon: LayoutPoint[]) {
  return isOnPolygon(point, polygon) || isInsidePolygon(point, polygon);
}

function isOnPolygon(point: LayoutPoint, polygon: LayoutPoint[]) {
  return polygon.some((from, index) => isOnSegment(point, from, polygon[(index + 1) % polygon.length]));
}

function isInsideTriangle(point: LayoutPoint, a: LayoutPoint, b: LayoutPoint, c: LayoutPoint) {
  const area = Math.abs(cross(a, b, c));
  const parts = Math.abs(cross(point, a, b)) + Math.abs(cross(point, b, c)) + Math.abs(cross(point, c, a));

  return Math.abs(area - parts) < epsilon && area > epsilon;
}

function isSimplePolygon(points: LayoutPoint[]) {
  for (let fromIndex = 0; fromIndex < points.length; fromIndex++) {
    const fromA = points[fromIndex];
    const toA = points[(fromIndex + 1) % points.length];

    for (let toIndex = fromIndex + 1; toIndex < points.length; toIndex++) {
      if (Math.abs(fromIndex - toIndex) <= 1 || (fromIndex === 0 && toIndex === points.length - 1)) {
        continue;
      }

      const fromB = points[toIndex];
      const toB = points[(toIndex + 1) % points.length];

      if (segmentsIntersect(fromA, toA, fromB, toB)) {
        return false;
      }
    }
  }

  return true;
}

function segmentsIntersect(a: LayoutPoint, b: LayoutPoint, c: LayoutPoint, d: LayoutPoint) {
  return cross(a, b, c) * cross(a, b, d) < -epsilon && cross(c, d, a) * cross(c, d, b) < -epsilon;
}

function isOnSegment(point: LayoutPoint, from: LayoutPoint, to: LayoutPoint) {
  return Math.abs(cross(from, to, point)) < epsilon && point.x >= Math.min(from.x, to.x) - epsilon && point.x <= Math.max(from.x, to.x) + epsilon && point.y >= Math.min(from.y, to.y) - epsilon && point.y <= Math.max(from.y, to.y) + epsilon;
}

function cross(origin: LayoutPoint, a: LayoutPoint, b: LayoutPoint) {
  return (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);
}

function distance(a: LayoutPoint, b: LayoutPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getCornerAngle(points: LayoutPoint[], index: number) {
  const point = points[wrapIndex(index, points.length)];
  const previous = points[wrapIndex(index - 1, points.length)];
  const next = points[wrapIndex(index + 1, points.length)];
  const fromX = previous.x - point.x;
  const fromY = previous.y - point.y;
  const toX = next.x - point.x;
  const toY = next.y - point.y;
  const length = Math.hypot(fromX, fromY) * Math.hypot(toX, toY);

  if (length < epsilon) {
    return 0;
  }

  return Math.acos(clamp((fromX * toX + fromY * toY) / length, -1, 1));
}

function wrapIndex(index: number, length: number) {
  return (index + length) % length;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
