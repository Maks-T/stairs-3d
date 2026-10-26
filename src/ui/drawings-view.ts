import type { StairLayoutResult } from '@/types/stairs';
import type { DrawingViewOption, DrawingViewType } from '@/types/drawings';
import { generateSideViewSvg } from '@/core/drawings/side-view-builder';
import { generateFrontViewSvg } from '@/core/drawings/front-view-builder';
import { generatePlanViewSvg } from '@/core/drawings/plan-view-builder';

const VIEW_OPTIONS: DrawingViewOption[] = [
  { id: 'side', title: 'Вид сбоку' },
  { id: 'front', title: 'Разрез А-А' },
  { id: 'plan', title: 'План стоек' }
];

export class DrawingsView {
  public readonly container: HTMLElement;
  private readonly viewportEl: HTMLElement;
  private currentView: DrawingViewType = 'side';
  private currentLayout: StairLayoutResult | null = null;
  private viewButtons: HTMLButtonElement[] = [];

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
    this.container.appendChild(toolbar);

    this.viewportEl = document.createElement('div');
    this.viewportEl.className = 'cad-drawing-viewport';
    this.container.appendChild(this.viewportEl);
  }

  private setActiveView(view: DrawingViewType): void {
    this.currentView = view;
    this.viewButtons.forEach((btn, idx) => {
      const opt = VIEW_OPTIONS[idx];
      if (opt) {
        btn.classList.toggle('active', opt.id === view);
      }
    });
    this.render();
  }

  public update(layout: StairLayoutResult): void {
    this.currentLayout = layout;
    this.render();
  }

  private render(): void {
    if (!this.currentLayout) return;

    let svgString = '';
    if (this.currentView === 'side') {
      svgString = generateSideViewSvg(this.currentLayout);
    } else if (this.currentView === 'front') {
      svgString = generateFrontViewSvg(this.currentLayout);
    } else {
      svgString = generatePlanViewSvg(this.currentLayout);
    }

    this.viewportEl.innerHTML = svgString;
  }
}