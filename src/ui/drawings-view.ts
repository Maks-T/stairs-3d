import type { StairLayoutResult } from '@/types/stairs';
import type { DrawingViewOption, DrawingViewType } from '@/types/drawings';
import { generateSideViewSvg } from '@/core/drawings/side-view-builder';
import { generateFrontViewSvg } from '@/core/drawings/front-view-builder';
import { generatePlanViewSvg } from '@/core/drawings/plan-view-builder';
import { generateLevelsViewSvg } from '@/core/drawings/levels-view-builder';
import { generateFastenersViewSvg } from '@/core/drawings/fasteners-view-builder';

const VIEW_OPTIONS: DrawingViewOption[] = [
  { id: 'side', title: 'Вид сбоку' },
  { id: 'front', title: 'Разрез А-А' },
  { id: 'plan', title: 'План стоек (Б-Б)' },
  { id: 'levels', title: 'Каркасы по уровням' },
  { id: 'fasteners', title: 'Точки крепления' }
];

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
const FIT_PADDING_PX = 48;
const WHEEL_ZOOM_SPEED = 0.0015;
const BUTTON_ZOOM_STEP = 1.25;

export class DrawingsView {
  public readonly container: HTMLElement;
  private readonly viewportEl: HTMLElement;
  private readonly canvasEl: HTMLElement;
  private readonly zoomLabelEl: HTMLButtonElement;
  private currentView: DrawingViewType = 'side';
  private currentLayout: StairLayoutResult | null = null;
  private viewButtons: HTMLButtonElement[] = [];

  private svgEl: SVGSVGElement | null = null;
  private baseWidth = 0;
  private baseHeight = 0;
  private zoom = 1;
  private pendingFit = true;

  private isPanning = false;
  private panStartX = 0;
  private panStartY = 0;
  private panScrollLeft = 0;
  private panScrollTop = 0;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'cad-drawing-container';

    const toolbar = document.createElement('div');
    toolbar.className = 'cad-drawing-toolbar';

    const btnGroup = document.createElement('div');
    btnGroup.className = 'cad-btn-group';

    VIEW_OPTIONS.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `cad-btn ${idx === 0 ? 'active' : ''}`;
      btn.textContent = opt.title;
      btn.addEventListener('click', () => {
        this.setActiveView(opt.id);
      });
      this.viewButtons.push(btn);
      btnGroup.appendChild(btn);
    });

    toolbar.appendChild(btnGroup);

    const spacer = document.createElement('div');
    spacer.className = 'cad-toolbar-spacer';
    toolbar.appendChild(spacer);

    const zoomGroup = document.createElement('div');
    zoomGroup.className = 'cad-btn-group cad-zoom-group';
    const zoomOut = this.createToolButton('−', 'Уменьшить', () => this.zoomBy(1 / BUTTON_ZOOM_STEP));
    this.zoomLabelEl = document.createElement('button');
    this.zoomLabelEl.type = 'button';
    this.zoomLabelEl.className = 'cad-btn cad-zoom-label';
    this.zoomLabelEl.title = 'Вписать в окно';
    this.zoomLabelEl.addEventListener('click', () => this.fitToViewport());
    const zoomIn = this.createToolButton('+', 'Увеличить', () => this.zoomBy(BUTTON_ZOOM_STEP));
    zoomGroup.append(zoomOut, this.zoomLabelEl, zoomIn);
    toolbar.appendChild(zoomGroup);

    this.container.appendChild(toolbar);

    this.viewportEl = document.createElement('div');
    this.viewportEl.className = 'cad-drawing-viewport';
    this.canvasEl = document.createElement('div');
    this.canvasEl.className = 'cad-drawing-canvas';
    this.viewportEl.appendChild(this.canvasEl);
    this.container.appendChild(this.viewportEl);

    this.bindViewportEvents();
    this.updateZoomLabel();

    // Вкладка может быть скрыта при первом рендере (нулевой размер): вписываем, когда появится размер
    new ResizeObserver(() => {
      if (this.pendingFit && this.svgEl) this.fitToViewport();
    }).observe(this.viewportEl);
  }

  private createToolButton(text: string, title: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cad-btn cad-zoom-btn';
    btn.textContent = text;
    btn.title = title;
    btn.addEventListener('click', onClick);
    return btn;
  }

  private bindViewportEvents(): void {
    // Зум колесом мыши вокруг курсора; Shift + колесо — горизонтальная прокрутка
    this.viewportEl.addEventListener('wheel', (e: WheelEvent) => {
      if (!this.svgEl) return;
      e.preventDefault();
      if (e.shiftKey) {
        this.viewportEl.scrollLeft += e.deltaY || e.deltaX;
        return;
      }
      const factor = Math.exp(-e.deltaY * WHEEL_ZOOM_SPEED);
      this.setZoom(this.zoom * factor, e.clientX, e.clientY);
    }, { passive: false });

    // Панорамирование перетаскиванием
    this.viewportEl.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button !== 0) return;
      // не перехватываем клики по полосам прокрутки
      const vpRect = this.viewportEl.getBoundingClientRect();
      if (e.clientX - vpRect.left > this.viewportEl.clientWidth || e.clientY - vpRect.top > this.viewportEl.clientHeight) return;
      this.isPanning = true;
      this.panStartX = e.clientX;
      this.panStartY = e.clientY;
      this.panScrollLeft = this.viewportEl.scrollLeft;
      this.panScrollTop = this.viewportEl.scrollTop;
      this.viewportEl.classList.add('panning');
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isPanning) return;
      this.viewportEl.scrollLeft = this.panScrollLeft - (e.clientX - this.panStartX);
      this.viewportEl.scrollTop = this.panScrollTop - (e.clientY - this.panStartY);
    });
    window.addEventListener('mouseup', () => {
      if (!this.isPanning) return;
      this.isPanning = false;
      this.viewportEl.classList.remove('panning');
    });

    this.viewportEl.addEventListener('dblclick', () => this.fitToViewport());
  }

  private setActiveView(view: DrawingViewType): void {
    this.currentView = view;
    this.viewButtons.forEach((btn, idx) => {
      const opt = VIEW_OPTIONS[idx];
      if (opt) {
        btn.classList.toggle('active', opt.id === view);
      }
    });
    this.pendingFit = true;
    this.render();
  }

  public update(layout: StairLayoutResult): void {
    this.currentLayout = layout;
    this.render();
  }

  private buildSvg(layout: StairLayoutResult): string {
    switch (this.currentView) {
      case 'front': return generateFrontViewSvg(layout);
      case 'plan': return generatePlanViewSvg(layout);
      case 'levels': return generateLevelsViewSvg(layout);
      case 'fasteners': return generateFastenersViewSvg(layout);
      default: return generateSideViewSvg(layout);
    }
  }

  private render(): void {
    if (!this.currentLayout) return;

    this.canvasEl.innerHTML = this.buildSvg(this.currentLayout);
    const svg = this.canvasEl.querySelector('svg');
    if (!svg) return;
    this.svgEl = svg;

    const vb = svg.viewBox.baseVal;
    this.baseWidth = vb.width || Number(svg.getAttribute('width')) || 1;
    this.baseHeight = vb.height || Number(svg.getAttribute('height')) || 1;

    if (this.pendingFit && this.viewportEl.clientWidth > 0) {
      this.fitToViewport();
    } else {
      this.applyZoom();
    }
  }

  private applyZoom(): void {
    if (!this.svgEl) return;
    this.svgEl.style.width = `${this.baseWidth * this.zoom}px`;
    this.svgEl.style.height = `${this.baseHeight * this.zoom}px`;
    this.updateZoomLabel();
  }

  private updateZoomLabel(): void {
    this.zoomLabelEl.textContent = `${Math.round(this.zoom * 100)}%`;
  }

  /** Зум с сохранением точки под курсором (или центра окна, если точка не задана) */
  private setZoom(next: number, anchorClientX?: number, anchorClientY?: number): void {
    if (!this.svgEl) return;
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    if (clamped === this.zoom) return;

    const vpRect = this.viewportEl.getBoundingClientRect();
    const ax = anchorClientX ?? vpRect.left + vpRect.width / 2;
    const ay = anchorClientY ?? vpRect.top + vpRect.height / 2;

    const before = this.svgEl.getBoundingClientRect();
    const relX = (ax - before.left) / this.zoom;
    const relY = (ay - before.top) / this.zoom;

    this.zoom = clamped;
    this.pendingFit = false;
    this.applyZoom();

    const after = this.svgEl.getBoundingClientRect();
    this.viewportEl.scrollLeft += after.left + relX * this.zoom - ax;
    this.viewportEl.scrollTop += after.top + relY * this.zoom - ay;
  }

  private zoomBy(factor: number): void {
    this.setZoom(this.zoom * factor);
  }

  /** Вписать чертёж в окно (не увеличивая выше 200%) */
  private fitToViewport(): void {
    if (!this.svgEl) return;
    const w = this.viewportEl.clientWidth - FIT_PADDING_PX;
    const h = this.viewportEl.clientHeight - FIT_PADDING_PX;
    if (w <= 0 || h <= 0) return;

    this.zoom = Math.min(2, Math.max(MIN_ZOOM, Math.min(w / this.baseWidth, h / this.baseHeight)));
    this.pendingFit = false;
    this.applyZoom();
    this.viewportEl.scrollLeft = 0;
    this.viewportEl.scrollTop = 0;
  }
}
