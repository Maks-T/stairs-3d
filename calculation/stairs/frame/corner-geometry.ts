import { CORNER } from '../constants';

type Pt = [number, number];

export interface DiagonalSpec {
  idSuffix: 'd1' | 'd2';
  x: number;
  z: number;
  lengthMm: number;
  polygonXZ: Pt[];
}

interface Bounds {
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
}

function toSpec(idSuffix: 'd1' | 'd2', p1: Pt, p2: Pt, p3: Pt, p4: Pt): DiagonalSpec {
  const pts = [p1, p2, p3, p4];
  const m1: Pt = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
  const m2: Pt = [(p3[0] + p4[0]) / 2, (p3[1] + p4[1]) / 2];
  return {
    idSuffix,
    x: Number((pts.reduce((s, p) => s + p[0], 0) / 4).toFixed(2)),
    z: Number((pts.reduce((s, p) => s + p[1], 0) / 4).toFixed(2)),
    lengthMm: Number(Math.hypot(m2[0] - m1[0], m2[1] - m1[1]).toFixed(1)),
    polygonXZ: pts
  };
}

// пара диагоналей 45°, 30 мм от вершины, по оси 270.11
function leftPair(b: Bounds, tube: number): [DiagonalSpec, DiagonalSpec] {
  const axial = tube * Math.SQRT2;
  const c0 = b.xMax + b.zMin;
  const k1 = c0 - CORNER.DIAGONAL_OFFSET_MM;
  const k2 = k1 - axial;
  const k3 = c0 + CORNER.DIAGONAL_OFFSET_MM;
  const k4 = k3 + axial;
  return [
    toSpec('d1', [b.xMax, k1 - b.xMax], [b.xMax, k2 - b.xMax], [b.xMin, k2 - b.xMin], [b.xMin, k1 - b.xMin]),
    toSpec('d2', [k3 - b.zMin, b.zMin], [k4 - b.zMin, b.zMin], [k4 - b.zMax, b.zMax], [k3 - b.zMax, b.zMax])
  ];
}

function rightPair(b: Bounds, tube: number): [DiagonalSpec, DiagonalSpec] {
  const axial = tube * Math.SQRT2;
  const c0 = b.zMin - b.xMin;
  const k1 = c0 - CORNER.DIAGONAL_OFFSET_MM;
  const k2 = k1 - axial;
  const k3 = c0 + CORNER.DIAGONAL_OFFSET_MM;
  const k4 = k3 + axial;
  return [
    toSpec('d1', [b.xMin, b.xMin + k1], [b.xMin, b.xMin + k2], [b.xMax, b.xMax + k2], [b.xMax, b.xMax + k1]),
    toSpec('d2', [b.zMin - k3, b.zMin], [b.zMin - k4, b.zMin], [b.zMax - k4, b.zMax], [b.zMax - k3, b.zMax])
  ];
}

export function calcCornerDiagonalPair(params: {
  isLeft: boolean;
  xOuter: number;
  xInner: number;
  zFront: number;
  zRear: number;
  tube: number;
}): [DiagonalSpec, DiagonalSpec] {
  const { isLeft, xOuter, xInner, zFront, zRear, tube } = params;
  const bounds: Bounds = {
    xMin: isLeft ? xOuter + tube : xInner + tube,
    xMax: isLeft ? xInner - tube : xOuter - tube,
    zMin: zRear + tube,
    zMax: zFront - tube
  };
  return isLeft ? leftPair(bounds, tube) : rightPair(bounds, tube);
}
