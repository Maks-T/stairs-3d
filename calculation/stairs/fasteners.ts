import { CORNER, FASTENERS } from './constants';
import { isBaseRail, isPost, treadOutline, type Pt } from './lib/plan-geometry';
import type {
  BoxElement,
  FastenerPoint,
  FastenerPointType,
  FastenersItemSummary,
  FastenersSummary,
  StairModule
} from './types';

const TREAD_EDGE_MARGIN_MM = 8;
const FACE_TOLERANCE_MM = 2;

type Segment = [Pt, Pt];

function tubeAxis(tube: BoxElement): Segment {
  if (tube.width >= tube.depth) {
    return [[tube.x - tube.width / 2, tube.z], [tube.x + tube.width / 2, tube.z]];
  }
  return [[tube.x, tube.z - tube.depth / 2], [tube.x, tube.z + tube.depth / 2]];
}

function insidePolygon(poly: Pt[], x: number, z: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (!a || !b) continue;
    if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

function distanceToPolygonEdge(poly: Pt[], x: number, z: number): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if (!a || !b) continue;
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / len2));
    best = Math.min(best, Math.hypot(x - (a[0] + t * dx), z - (a[1] + t * dz)));
  }
  return best;
}

// саморезы ступени: 2 на поперечину, у торцовки 45° в 41.21 мм от шва
function treadPoints(m: StairModule, treads: BoxElement[], tubes: BoxElement[]): FastenerPoint[] {
  const points: FastenerPoint[] = [];
  const supports = tubes.filter((t) => !isPost(t) && !t.polygonXZ && !isBaseRail(t));

  treads.forEach((tread) => {
    const top = tread.y + tread.height / 2;
    const bottom = tread.y - tread.height / 2;
    const outline = treadOutline(tread);
    const rot = tread.rotationY ?? 0;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const toLocal = ([x, z]: Pt): Pt => {
      const dx = x - tread.x;
      const dz = z - tread.z;
      return [dx * cos - dz * sin, dx * sin + dz * cos];
    };
    const toWorld = (u: number, v: number): Pt => [tread.x + u * cos + v * sin, tread.z - u * sin + v * cos];
    const hw = tread.width / 2;
    const hd = tread.depth / 2;
    const lines = [hd - FASTENERS.TREAD_FROM_NOSE_MM, -hd + FASTENERS.TREAD_FROM_BACK_MM];
    const add = (u: number, v: number, suffix: string): void => {
      const [x, z] = toWorld(u, v);
      if (!insidePolygon(outline, x, z) || distanceToPolygonEdge(outline, x, z) < TREAD_EDGE_MARGIN_MM) return;
      points.push({
        id: `fastener-${tread.id}-${suffix}`,
        x,
        y: top,
        z,
        normalX: 0,
        normalY: 1,
        normalZ: 0,
        type: 'tread'
      });
    };

    [
      { deg: tread.cutAngleLeftDeg ?? 0, side: -1 },
      { deg: tread.cutAngleRightDeg ?? 0, side: 1 }
    ].forEach(({ deg, side }) => {
      if (deg <= 0) return;
      const angle = (deg * Math.PI) / 180;
      const shift = CORNER.SCREW_MITER_OFFSET_MM / Math.cos(angle);
      lines.forEach((v, k) => {
        const u = side * (hw - (hd - v) * Math.tan(angle) - shift);
        add(u, v, `miter${side < 0 ? 'l' : 'r'}-${k === 0 ? 'front' : 'rear'}`);
      });
    });

    supports
      .filter((t) => Math.abs(t.y + t.height / 2 - bottom) < 1)
      .forEach((tube) => {
        const [a, b] = tubeAxis(tube).map(toLocal) as [Pt, Pt];
        const du = b[0] - a[0];
        const dv = b[1] - a[1];
        if (Math.abs(dv) < Math.abs(du) - 1) return;
        const len = Math.hypot(du, dv);
        const reach = m.tube / len;
        lines.forEach((v, k) => {
          const s = (v - a[1]) / dv;
          if (s < -reach || s > 1 + reach) return;
          add(a[0] + du * s, v, `${tube.id}-${k === 0 ? 'front' : 'rear'}`);
        });
      });
  });

  return dedupe(points);
}

// саморезы досок: 2 на стойку
function boardPoints(m: StairModule, boards: BoxElement[], tubes: BoxElement[], type: FastenerPointType): FastenerPoint[] {
  const points: FastenerPoint[] = [];
  const posts = tubes.filter(isPost);

  boards.forEach((board) => {
    const thinAlongX = board.width < board.depth;
    const y0 = board.y - board.height / 2;
    const y1 = board.y + board.height / 2;
    const edge = FASTENERS.BOARD_EDGE_MM;
    const ys = board.height > 2 * edge + 10 ? [y1 - edge, y0 + edge] : [board.y];
    const across = thinAlongX ? board.x : board.z;
    const half = (thinAlongX ? board.width : board.depth) / 2;
    const alongCenter = thinAlongX ? board.z : board.x;
    const alongHalf = (thinAlongX ? board.depth : board.width) / 2;

    posts.forEach((post) => {
      const postAcross = thinAlongX ? post.x : post.z;
      const postAlong = thinAlongX ? post.z : post.x;
      const gap = Math.abs(postAcross - across) - m.tube / 2 - half;
      if (Math.abs(gap) > FACE_TOLERANCE_MM) return;
      if (Math.abs(postAlong - alongCenter) > alongHalf - m.tube / 4) return;
      const py0 = post.y - post.height / 2;
      const py1 = post.y + post.height / 2;
      if (py1 < y0 + 1 || py0 > y1 - 1) return;
      const sign = across > postAcross ? 1 : -1;
      const face = across + sign * half;
      ys.forEach((y, k) => {
        points.push({
          id: `fastener-${board.id}-${post.id}-${k}`,
          x: thinAlongX ? face : postAlong,
          y,
          z: thinAlongX ? postAlong : face,
          normalX: thinAlongX ? sign : 0,
          normalY: 0,
          normalZ: thinAlongX ? 0 : sign,
          type
        });
      });
    });
  });

  return dedupe(points);
}

function dedupe(points: FastenerPoint[]): FastenerPoint[] {
  const seen = new Set<string>();
  return points.filter((p) => {
    const key = `${Math.round(p.x)}|${Math.round(p.y)}|${Math.round(p.z)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildFastenerPoints(
  m: StairModule,
  layout: { frameTubes: BoxElement[]; treads: BoxElement[]; risers: BoxElement[]; cladding: BoxElement[] }
): FastenerPoint[] {
  return [
    ...treadPoints(m, layout.treads, layout.frameTubes),
    ...boardPoints(m, layout.risers, layout.frameTubes, 'riser'),
    ...boardPoints(m, layout.cladding, layout.frameTubes, 'cladding')
  ];
}

function summary(countRaw: number, spec: string, drillBitDiameterMm: number): FastenersItemSummary {
  const countWithReserve = Math.ceil(countRaw * FASTENERS.RESERVE_FACTOR);
  return {
    spec,
    countRaw,
    countWithReserve,
    boxesCount: Math.max(1, Math.ceil(countWithReserve / FASTENERS.PACKAGE_SIZE)),
    drillBitDiameterMm
  };
}

export function summarizeFasteners(points: FastenerPoint[]): FastenersSummary {
  const count = (type: FastenerPointType): number => points.filter((p) => p.type === type).length;
  const treadsCount = count('tread');
  const risersCount = count('riser');
  const sideCladdingCount = count('cladding');
  const treads = summary(treadsCount, FASTENERS.TREAD_SPEC, FASTENERS.TREAD_DRILL_MM);
  const risersAndCladding = summary(
    risersCount + sideCladdingCount,
    FASTENERS.BOARD_SPEC,
    FASTENERS.BOARD_DRILL_MM
  );
  return {
    treads,
    risersAndCladding,
    breakdown: { treadsCount, risersCount, sideCladdingCount },
    totalScrewsWithReserve: treads.countWithReserve + risersAndCladding.countWithReserve
  };
}
