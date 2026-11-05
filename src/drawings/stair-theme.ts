import {
  CadDocument,
  createHatchStyle,
  entitiesBounds,
  getHatchPreset,
  insert,
  line,
  mtext,
  polygon,
  rect,
  text,
  type Entity,
  type EntityFill,
  type Point2,
  type TextAnchor
} from 'cad-blueprint';
import { DEFAULT_DRAWING_SCALE, DRAW, PAPER } from './drawing-style';

/** Слои чертежей лестницы. */
export const L = {
  outline: 'Контур',
  thin: 'Тонкие',
  tread: 'Ступени',
  riser: 'Подступенки',
  cutBoard: 'Сечение доски',
  cutSteel: 'Сечение металла',
  concrete: 'Бетон',
  ground: 'Земля',
  faintBeam: 'Балки условно',
  hidden: 'Невидимые',
  dimensions: 'Размеры',
  levels: 'Отметки',
  fasteners: 'Крепёж',
  sectionMarks: 'Секущие',
  notes: 'Надписи'
} as const;

/** Блоки условных знаков (нарисованы в мм бумаги, вставляются с масштабом `a(1)`). */
export const B = {
  plus: 'Крепёж +',
  cross: 'Крепёж ×',
  levelMark: 'Отметка уровня',
  sectionCut: 'Секущая плоскость'
} as const;

/** Текстовый и размерный стили. */
export const S = {
  text: 'GOST',
  dimText: 'Размеры',
  dim: 'Лестница'
} as const;

export interface StairDrawingOptions {
  /** Масштаб чертежей (влияет на размер текста и стрелок относительно лестницы). По умолчанию 1:10. */
  scale?: string;
}

/**
 * Документ чертежей лестницы с настроенными слоями, стилями и блоками,
 * плюс помощники для построителей видов. Модель в мм, система координат `cartesian` (Y вверх).
 */
export class StairDrawing {
  readonly doc: CadDocument;

  constructor(options: StairDrawingOptions = {}) {
    this.doc = new CadDocument({ gost: true, settings: { scale: options.scale ?? DEFAULT_DRAWING_SCALE, precision: 2, padding: 10 } });
    this.setupLayers();
    this.setupStyles();
    this.setupBlocks();
  }

  /** Мм на бумаге → единицы модели (мм лестницы). */
  a(paperMm: number): number {
    return this.doc.drawing.annotationToModel(paperMm);
  }

  private setupLayers(): void {
    const ls = this.doc.layers;
    const white = (preset: Parameters<typeof getHatchPreset>[0], background: string) =>
      createHatchStyle({ families: getHatchPreset(preset).families, background });
    ls.create(L.outline, { color: DRAW.line, lineWeight: 0.5 });
    ls.create(L.thin, { color: DRAW.lineThin, lineWeight: 0.25 });
    ls.create(L.tread, { color: DRAW.treadStroke, lineWeight: 0.25 });
    ls.create(L.riser, { color: DRAW.line, lineWeight: 0.35 });
    ls.create(L.cutBoard, { color: DRAW.line, lineWeight: 0.5, hatch: createHatchStyle({ angle: 45, spacing: 1.5, color: DRAW.hatch, background: DRAW.fill }) });
    ls.create(L.cutSteel, { color: DRAW.line, lineWeight: 0.5, hatch: white('steel-45', DRAW.fill) });
    ls.create(L.concrete, { color: DRAW.lineThin, lineWeight: 0.25, hatch: white('concrete', DRAW.concrete) });
    ls.create(L.ground, { color: DRAW.ground, lineWeight: 0.5 });
    ls.create(L.faintBeam, { color: DRAW.beamFaint, lineWeight: 0.25, lineType: 'dashed', opacity: DRAW.beamFaintOpacity });
    ls.create(L.hidden, { color: DRAW.lineThin, lineWeight: 0.25, lineType: 'dashed' });
    ls.create(L.dimensions, { color: DRAW.dim, lineWeight: 0.18 });
    ls.create(L.levels, { color: DRAW.dim, lineWeight: 0.18, lineType: 'dashdot' });
    ls.create(L.fasteners, { color: DRAW.fastener, lineWeight: 0.5 });
    ls.create(L.sectionMarks, { color: DRAW.line, lineWeight: 0.5 });
    ls.create(L.notes, { color: DRAW.line, lineWeight: 0.25 });
  }

  private setupStyles(): void {
    this.doc.textStyles.clone(S.text, S.dimText, { height: PAPER.dim });
    this.doc.dimStyles.clone('GOST', S.dim, {
      textStyle: S.dimText,
      terminatorSize: 2.5,
      lineColor: DRAW.dim,
      textColor: DRAW.dimText
    });
    this.doc.dimStyles.setCurrent(S.dim);
  }

  private setupBlocks(): void {
    const b = this.doc.blocks;
    b.define(B.plus, [line([-2.5, 0], [2.5, 0]), line([0, -2.5], [0, 2.5])], { description: 'Саморез по ступени' });
    b.define(B.cross, [line([-1.9, -1.9], [1.9, 1.9]), line([-1.9, 1.9], [1.9, -1.9])], { description: 'Саморез у торцовки 45°' });
    // Отметка уровня: треугольник остриём на линии уровня и полка над ним.
    b.define(B.levelMark, [
      polygon([[0, 0], [-1.5, 2.5], [1.5, 2.5]], { fill: 'solid', lineWeight: 0.18 }),
      line([-1.5, 2.5], [20, 2.5], { lineWeight: 0.25 })
    ], { description: 'Отметка уровня (ГОСТ 21.101)' });
    // Секущая плоскость: штрих вдоль +Y и стрелка взгляда, приходящая по +X к его началу.
    b.define(B.sectionCut, [
      line([0, -1.2], [0, 8], { lineWeight: 1 }),
      line([-10, 0], [-3, 0], { lineWeight: 0.35 }),
      polygon([[0, 0], [-3, 1], [-3, -1]], { fill: 'solid', lineWeight: 0.18 })
    ], { description: 'Обозначение секущей плоскости (ГОСТ 2.305)' });
  }

  // -------------------------------------------------------------------------------------------------------------------
  // Помощники построителей

  /** Прямоугольник по нижнему левому углу. */
  box(layer: string, x: number, y: number, w: number, h: number, fill: EntityFill | null = DRAW.fill, extra: { color?: string; lineWeight?: number } = {}): Entity | null {
    if (w <= 0 || h <= 0) return null;
    return rect(x, y, w, h, { layer, fill, ...extra });
  }

  note(position: Point2, value: string, options: { height?: number; anchor?: TextAnchor; color?: string; layer?: string; rotationDeg?: number } = {}): Entity {
    const make = value.includes('\n') ? mtext : text;
    return make(position, value, {
      layer: options.layer ?? L.notes,
      style: S.text,
      height: options.height ?? PAPER.note,
      anchor: options.anchor ?? 'bottom-left',
      ...(options.color ? { color: options.color } : {}),
      ...(options.rotationDeg ? { rotationDeg: options.rotationDeg } : {})
    });
  }

  /** Знак крепежа `+` / `×` постоянного размера на бумаге. */
  fastener(kind: 'plus' | 'cross', position: Point2): Entity {
    return insert(kind === 'plus' ? B.plus : B.cross, position, { layer: L.fasteners, scale: this.a(1) });
  }

  /** Высотная отметка: выноска от `fromX`, треугольник в `symbolX`, значение над полкой и подпись под ней. */
  levelMark(fromX: number, y: number, symbolX: number, value: string, label: string): Entity[] {
    const out: Entity[] = [
      insert(B.levelMark, [symbolX, y], { layer: L.dimensions, scale: this.a(1) }),
      this.note([symbolX + this.a(1.5), y + this.a(3.2)], value, { color: DRAW.levelValue, layer: L.dimensions }),
      this.note([symbolX + this.a(1.5), y - this.a(1.2)], label, { anchor: 'top-left', color: DRAW.dimText, layer: L.dimensions })
    ];
    if (symbolX - fromX > 1e-6) out.unshift(line([fromX, y], [symbolX, y], { layer: L.levels }));
    return out;
  }

  /**
   * Обозначение секущей плоскости. `dir` — направление взгляда (стрелки), `barSide` — сторона штриха:
   * для горизонтальной стрелки −1 — вверх, 1 — вниз; для вертикальной −1 — влево, 1 — вправо (как в прежних чертежах).
   */
  sectionCut(at: Point2, dir: 'up' | 'down' | 'left' | 'right', label: string, barSide: 1 | -1): Entity[] {
    const v: Point2 = dir === 'right' ? [1, 0] : dir === 'left' ? [-1, 0] : dir === 'up' ? [0, 1] : [0, -1];
    const p: Point2 = v[0] !== 0 ? [0, -barSide] : [barSide, 0];
    const rot90: Point2 = [-v[1], v[0]];
    const flip = p[0] * rot90[0] + p[1] * rot90[1] > 0 ? 1 : -1;
    const angle = (Math.atan2(v[1], v[0]) * 180) / Math.PI;
    const k = this.a(1);
    return [
      insert(B.sectionCut, at, { layer: L.sectionMarks, scaleX: k, scaleY: flip * k, rotationDeg: angle }),
      this.note([at[0] - v[0] * this.a(6.5) + p[0] * this.a(3.5), at[1] - v[1] * this.a(6.5) + p[1] * this.a(3.5)], label, {
        height: PAPER.subtitle,
        anchor: 'middle-center',
        layer: L.sectionMarks
      })
    ];
  }

  /** Заголовок листа по центру над содержимым. */
  withTitle(entities: Entity[], title: string): Entity[] {
    const b = entitiesBounds(entities, this.doc.context());
    if (!Number.isFinite(b.minX)) return entities;
    return [...entities, this.note([(b.minX + b.maxX) / 2, b.maxY + this.a(6)], title, { height: PAPER.title, anchor: 'bottom-center' })];
  }
}
