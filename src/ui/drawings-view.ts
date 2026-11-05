import type { StairLayoutResult } from '@calculation/stairs';
import type { CadDocument } from 'cad-blueprint';
import { CadViewer } from 'cad-blueprint/viewer';
import { DRAWING_VIEWS, buildStairDrawings } from '@/drawings/stair-drawings';
import type { DrawingViewType } from '@/drawings/types';

const BUTTON_ZOOM_STEP = 1.25;
const FILE_PREFIX = 'stairs';

/**
 * Вкладка «Чертежи»: тулбар (виды, зум, скачивание) и `CadViewer` из `cad-blueprint`.
 * При пересчёте лестницы собирается один `CadDocument` со всеми пятью листами; переключение вида — смена листа.
 */
export class DrawingsView {
  public readonly container: HTMLElement;
  private readonly viewportEl: HTMLElement;
  private readonly zoomLabelEl: HTMLButtonElement;
  private readonly viewButtons = new Map<DrawingViewType, HTMLButtonElement>();
  private currentView: DrawingViewType = 'side';
  private doc: CadDocument | null = null;
  private viewer: CadViewer | null = null;
  // вписать, как только у вкладки появится размер (при первом показе она скрыта)
  private pendingFit = true;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'cad-drawing-container';

    const toolbar = document.createElement('div');
    toolbar.className = 'cad-drawing-toolbar';

    const viewGroup = document.createElement('div');
    viewGroup.className = 'cad-btn-group';
    DRAWING_VIEWS.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `cad-btn ${opt.id === this.currentView ? 'active' : ''}`;
      btn.textContent = opt.title;
      btn.addEventListener('click', () => this.setActiveView(opt.id));
      this.viewButtons.set(opt.id, btn);
      viewGroup.appendChild(btn);
    });
    toolbar.appendChild(viewGroup);

    const spacer = document.createElement('div');
    spacer.className = 'cad-toolbar-spacer';
    toolbar.appendChild(spacer);

    const zoomGroup = document.createElement('div');
    zoomGroup.className = 'cad-btn-group cad-zoom-group';
    this.zoomLabelEl = document.createElement('button');
    this.zoomLabelEl.type = 'button';
    this.zoomLabelEl.className = 'cad-btn cad-zoom-label';
    this.zoomLabelEl.title = 'Вписать в окно';
    this.zoomLabelEl.addEventListener('click', () => this.viewer?.fitToView());
    zoomGroup.append(
      this.createToolButton('−', 'Уменьшить', () => this.viewer?.zoomBy(1 / BUTTON_ZOOM_STEP)),
      this.zoomLabelEl,
      this.createToolButton('+', 'Увеличить', () => this.viewer?.zoomBy(BUTTON_ZOOM_STEP))
    );
    toolbar.appendChild(zoomGroup);

    const exportGroup = document.createElement('div');
    exportGroup.className = 'cad-btn-group cad-export-group';
    exportGroup.append(
      this.createToolButton('DXF', 'Скачать текущий вид в DXF (AutoCAD, nanoCAD, Компас, ЧПУ)', () => this.viewer?.downloadDxf(this.fileName())),
      this.createToolButton('SVG', 'Скачать текущий вид в SVG (печать в масштабе)', () => this.viewer?.downloadSvg(this.fileName())),
      this.createToolButton('VCAD', 'Скачать все чертежи лестницы (.vcad)', () => this.viewer?.downloadVcad(FILE_PREFIX))
    );
    toolbar.appendChild(exportGroup);

    this.container.appendChild(toolbar);

    this.viewportEl = document.createElement('div');
    this.viewportEl.className = 'cad-drawing-viewport';
    this.container.appendChild(this.viewportEl);
    this.updateZoomLabel(1);

    new ResizeObserver(() => {
      if (this.pendingFit && this.viewer && this.viewportEl.clientWidth > 0 && this.viewportEl.clientHeight > 0) {
        this.viewer.fitToView();
        this.pendingFit = false;
      }
    }).observe(this.viewportEl);
  }

  /** Документ со всеми листами текущей лестницы (для отправки в БД: `stringifyDocument(doc)`). */
  public get document(): CadDocument | null {
    return this.doc;
  }

  public update(layout: StairLayoutResult): void {
    this.doc = buildStairDrawings(layout);
    if (!this.viewer) {
      this.viewer = new CadViewer(this.viewportEl, this.doc, {
        sheet: this.currentView,
        background: 'transparent',
        paper: '#ffffff',
        fitMargin: 24,
        maxZoom: 40,
        fileName: this.fileName()
      });
      this.viewer.on((e) => {
        if (e.type === 'view') this.updateZoomLabel(e.zoom);
      });
      this.pendingFit = this.viewportEl.clientWidth === 0;
      return;
    }
    // пересчёт параметров: тот же лист, зум и положение сохраняются
    this.viewer.setDocument(this.doc, { keepView: true });
  }

  private setActiveView(view: DrawingViewType): void {
    this.currentView = view;
    this.viewButtons.forEach((btn, id) => btn.classList.toggle('active', id === view));
    if (!this.viewer) return;
    this.viewer.setSheet(view);
    this.pendingFit = this.viewportEl.clientWidth === 0;
  }

  private fileName(): string {
    return `${FILE_PREFIX}-${this.currentView}`;
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

  private updateZoomLabel(zoom: number): void {
    this.zoomLabelEl.textContent = `${Math.round(zoom * 100)}%`;
  }
}
