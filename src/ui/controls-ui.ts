import {
  createDockview,
  type DockviewApi,
  type IContentRenderer
} from 'dockview';
import type { BackgroundType, StairLayoutResult, StairUserParams, ViewMode } from '@/types/stairs';
import {
  MIN_STAIR_WIDTH_MM,
  MAX_STAIR_WIDTH_MM,
  MIN_STAIR_HEIGHT_MM,
  MAX_STAIR_HEIGHT_MM,
  ATLAS_UV_MAP
} from '@/constants/stairs-config';
import { calculateCladdingEstimate } from '@/core/cladding-calculator';
import { calculatePipeCutting } from '@/services/cutting-service';
import { buildStairsEstimate, type FlatEstimateRow } from '@/services/estimate-service';

export class ControlsUI {
  private dockviewApi!: DockviewApi;
  public readonly viewportContainer: HTMLElement;

  private sliderWidth!: HTMLInputElement;
  private inputWidth!: HTMLInputElement;
  private sliderHeight!: HTMLInputElement;
  private inputHeight!: HTMLInputElement;
  private badgeStepInfo!: HTMLElement;
  private checkRisers!: HTMLInputElement;
  private checkCladding!: HTMLInputElement;

  private selectBg!: HTMLSelectElement;
  private selectTexture!: HTMLSelectElement;
  private viewModeButtons: HTMLButtonElement[] = [];

  private specTreads!: HTMLElement;
  private specPipe!: HTMLElement;
  private specCladdingBoards!: HTMLElement;
  private specSpans!: HTMLElement;

  private estimateTableBody!: HTMLElement;
  private estimateGrandTotal!: HTMLElement;
  private cuttingContainer!: HTMLElement;

  private params: StairUserParams = {
    width: 1500,
    height: 300,
    viewMode: 'solid',
    hasRisers: true,
    hasSideCladding: true,
    atlasIndex: 0,
    background: 'white'
  };

  private readonly onChangeCallback: (params: StairUserParams) => void;

  constructor(rootContainer: HTMLElement, onChange: (params: StairUserParams) => void) {
    this.onChangeCallback = onChange;
    this.viewportContainer = document.createElement('div');
    this.viewportContainer.id = 'cad-viewport-container';

    this.initDockview(rootContainer);
  }

  private initDockview(rootContainer: HTMLElement): void {
    this.dockviewApi = createDockview(rootContainer, {
      className: 'dockview-theme-light',
      createComponent: (options: { name: string }): IContentRenderer => {
        return {
          element: this.createPanelContent(options.name),
          init: () => {},
          dispose: () => {},
          update: () => {}
        };
      }
    });

    this.dockviewApi.addPanel({
      id: 'panel_viewport',
      component: 'viewport',
      title: '3D Модель'
    });

    this.dockviewApi.addPanel({
      id: 'panel_params',
      component: 'params',
      title: 'Параметры конструкции',
      position: { referencePanel: 'panel_viewport', direction: 'right' }
    });

    this.dockviewApi.addPanel({
      id: 'panel_materials',
      component: 'materials',
      title: 'Материалы и вид',
      position: { referencePanel: 'panel_params', direction: 'within' }
    });

    this.dockviewApi.addPanel({
      id: 'panel_estimate',
      component: 'estimate',
      title: 'Смета (Estimate)',
      position: { referencePanel: 'panel_params', direction: 'below' }
    });

    this.dockviewApi.addPanel({
      id: 'panel_cutting',
      component: 'cutting',
      title: 'Раскрой (LinearCutter)',
      position: { referencePanel: 'panel_estimate', direction: 'within' }
    });

    this.dockviewApi.addPanel({
      id: 'panel_spec',
      component: 'specification',
      title: 'Спецификация',
      position: { referencePanel: 'panel_estimate', direction: 'within' }
    });
  }

  private createPanelContent(componentName: string): HTMLElement {
    switch (componentName) {
      case 'viewport': return this.viewportContainer;
      case 'params': return this.createParamsView();
      case 'materials': return this.createMaterialsView();
      case 'specification': return this.createSpecificationView();
      case 'estimate': return this.createEstimateView();
      case 'cutting': return this.createCuttingView();
      default: return document.createElement('div');
    }
  }

  private createParamsView(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'cad-panel-content';
    el.innerHTML = `
      <div class="cad-group">
        <label class="cad-label">Ширина марша (W), мм</label>
        <div class="cad-row">
          <input type="range" id="p-slider-width" min="${MIN_STAIR_WIDTH_MM}" max="${MAX_STAIR_WIDTH_MM}" step="50" value="${this.params.width}">
          <input type="number" id="p-input-width" class="cad-input-number" min="${MIN_STAIR_WIDTH_MM}" max="${MAX_STAIR_WIDTH_MM}" step="10" value="${this.params.width}">
        </div>
      </div>

      <div class="cad-group">
        <label class="cad-label">Высота крыльца (H), мм</label>
        <div class="cad-row">
          <input type="range" id="p-slider-height" min="${MIN_STAIR_HEIGHT_MM}" max="${MAX_STAIR_HEIGHT_MM}" step="150" value="${this.params.height}">
          <input type="number" id="p-input-height" class="cad-input-number" min="${MIN_STAIR_HEIGHT_MM}" max="${MAX_STAIR_HEIGHT_MM}" step="10" value="${this.params.height}">
        </div>
        <div id="p-badge-step-info" class="cad-badge">2 ступени (~150 мм)</div>
      </div>

      <div class="cad-group" style="margin-top: 4px;">
        <label class="cad-label">Конструктивные элементы</label>
        <div class="cad-toggle-row">
          <label for="check-risers">Вертикальные подступенки</label>
          <input type="checkbox" id="check-risers" checked>
        </div>
        <div class="cad-toggle-row">
          <label for="check-cladding">Боковая зашивка (доска 145 мм)</label>
          <input type="checkbox" id="check-cladding" checked>
        </div>
      </div>
    `;

    this.sliderWidth = el.querySelector('#p-slider-width') as HTMLInputElement;
    this.inputWidth = el.querySelector('#p-input-width') as HTMLInputElement;
    this.sliderHeight = el.querySelector('#p-slider-height') as HTMLInputElement;
    this.inputHeight = el.querySelector('#p-input-height') as HTMLInputElement;
    this.badgeStepInfo = el.querySelector('#p-badge-step-info') as HTMLElement;
    this.checkRisers = el.querySelector('#check-risers') as HTMLInputElement;
    this.checkCladding = el.querySelector('#check-cladding') as HTMLInputElement;

    this.bindDimensionPair(this.sliderWidth, this.inputWidth, MIN_STAIR_WIDTH_MM, MAX_STAIR_WIDTH_MM, (val) => {
      this.params.width = val;
      this.onChangeCallback(this.params);
    });

    this.bindDimensionPair(this.sliderHeight, this.inputHeight, MIN_STAIR_HEIGHT_MM, MAX_STAIR_HEIGHT_MM, (val) => {
      this.params.height = val;
      this.onChangeCallback(this.params);
    });

    this.checkRisers.addEventListener('change', () => {
      this.params.hasRisers = this.checkRisers.checked;
      this.onChangeCallback(this.params);
    });

    this.checkCladding.addEventListener('change', () => {
      this.params.hasSideCladding = this.checkCladding.checked;
      this.onChangeCallback(this.params);
    });

    return el;
  }

  private createMaterialsView(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'cad-panel-content';

    const textureOptionsHtml = Object.entries(ATLAS_UV_MAP)
      .map(([idx, item]) => `<option value="${idx}">${item.name}</option>`)
      .join('');

    el.innerHTML = `
      <div class="cad-group">
        <label class="cad-label">Режим отображения каркаса</label>
        <div class="cad-btn-group" id="p-view-mode-group">
          <button type="button" class="cad-btn active" data-mode="solid">Сплошной</button>
          <button type="button" class="cad-btn" data-mode="xray">Рентген (X-Ray)</button>
          <button type="button" class="cad-btn" data-mode="frame">Только каркас</button>
        </div>
      </div>

      <div class="cad-group">
        <label class="cad-label">Текстура ступеней (Атлас)</label>
        <select id="p-select-texture" class="cad-select">
          ${textureOptionsHtml}
        </select>
      </div>

      <div class="cad-group">
        <label class="cad-label">Окружение / Фон</label>
        <select id="p-select-bg" class="cad-select">
          <option value="white">Белый (нейтральный)</option>
          <option value="park">Парк (куб)</option>
          <option value="sky">Небо (куб)</option>
          <option value="no">Без фона</option>
        </select>
      </div>
    `;

    this.viewModeButtons = Array.from(el.querySelectorAll('#p-view-mode-group .cad-btn'));
    this.selectTexture = el.querySelector('#p-select-texture') as HTMLSelectElement;
    this.selectBg = el.querySelector('#p-select-bg') as HTMLSelectElement;

    this.viewModeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.viewModeButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.params.viewMode = btn.dataset.mode as ViewMode;
        this.onChangeCallback(this.params);
      });
    });

    this.selectTexture.addEventListener('change', () => {
      this.params.atlasIndex = Number(this.selectTexture.value);
      this.onChangeCallback(this.params);
    });

    this.selectBg.addEventListener('change', () => {
      this.params.background = this.selectBg.value as BackgroundType;
      this.onChangeCallback(this.params);
    });

    return el;
  }

  private createSpecificationView(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'cad-panel-content';
    el.innerHTML = `
      <table class="cad-spec-table">
        <tbody>
          <tr>
            <td>Ступени ДПК CM 305 (25×305 мм)</td>
            <td id="spec-treads">-</td>
          </tr>
          <tr>
            <td>Труба каркаса 40×40×2 мм</td>
            <td id="spec-pipe">- м</td>
          </tr>
          <tr>
            <td>Заборная доска МПК 11×145 мм (хлысты 3м)</td>
            <td id="spec-cladding-boards">- шт</td>
          </tr>
          <tr>
            <td>Пролёты стоек в свету</td>
            <td id="spec-spans">-</td>
          </tr>
        </tbody>
      </table>
    `;

    this.specTreads = el.querySelector('#spec-treads') as HTMLElement;
    this.specPipe = el.querySelector('#spec-pipe') as HTMLElement;
    this.specCladdingBoards = el.querySelector('#spec-cladding-boards') as HTMLElement;
    this.specSpans = el.querySelector('#spec-spans') as HTMLElement;

    return el;
  }

  private createEstimateView(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'cad-panel-content';
    el.innerHTML = `
      <table class="cad-spec-table">
        <thead>
          <tr>
            <th>Позиция</th>
            <th>Кол-во</th>
            <th>Цена</th>
            <th>Сумма</th>
          </tr>
        </thead>
        <tbody id="est-tbody"></tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="3">Итого по смете:</td>
            <td id="est-grand-total">0 ₽</td>
          </tr>
        </tfoot>
      </table>
    `;

    this.estimateTableBody = el.querySelector('#est-tbody') as HTMLElement;
    this.estimateGrandTotal = el.querySelector('#est-grand-total') as HTMLElement;

    return el;
  }

  private createCuttingView(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'cad-panel-content';
    el.innerHTML = `
      <div id="cutting-summary" class="cad-badge" style="margin-bottom: 8px;">
        Расчёт раскроя...
      </div>
      <div id="cutting-bars-list"></div>
    `;

    this.cuttingContainer = el;
    return el;
  }

  private bindDimensionPair(
    slider: HTMLInputElement,
    numberInput: HTMLInputElement,
    min: number,
    max: number,
    onUpdate: (value: number) => void
  ): void {
    const update = (raw: string) => {
      const clamped = Math.max(min, Math.min(max, Number(raw) || min));
      slider.value = String(clamped);
      numberInput.value = String(clamped);
      onUpdate(clamped);
    };

    slider.addEventListener('input', () => update(slider.value));
    numberInput.addEventListener('change', () => update(numberInput.value));
  }

  updateAll(layout: StairLayoutResult): void {
    const claddingEst = calculateCladdingEstimate(layout);
    const pipeCutting = calculatePipeCutting(layout);
    const estimate = buildStairsEstimate(layout, pipeCutting, claddingEst);

    if (this.badgeStepInfo) {
      this.badgeStepInfo.textContent = `${layout.stepCount} ступ. (~${Math.round(layout.stepHeight)} мм)`;
    }
    if (this.specTreads) {
      this.specTreads.textContent = `${layout.stepCount} шт (${layout.totalWidth} мм)`;
    }
    if (this.specPipe) {
      this.specPipe.textContent = `${pipeCutting.pipeStocksCount} хлыстов (${layout.totalPipeLengthM} м)`;
    }
    if (this.specCladdingBoards) {
      this.specCladdingBoards.textContent = `${claddingEst.totalCladdingBoards} шт (~${claddingEst.totalCladdingLinearMeters} м)`;
    }
    if (this.specSpans) {
      this.specSpans.textContent = layout.spacing.spans.join(' | ') + ' мм';
    }

    if (this.estimateTableBody) {
      this.estimateTableBody.innerHTML = estimate.rows
        .map((row: FlatEstimateRow) => `
          <tr style="${row.isGroup ? 'font-weight: 600; background: #f9fafb;' : ''}">
            <td>${row.isGroup ? `${row.name}` : `&nbsp;&nbsp;• ${row.name}`}</td>
            <td>${row.isGroup ? '' : `${row.count} ${row.unit}`}</td>
            <td>${row.isGroup ? '' : `${row.unitPrice.toLocaleString('ru-RU')} ₽`}</td>
            <td>${row.totalPrice.toLocaleString('ru-RU')} ₽</td>
          </tr>
        `)
        .join('');

      this.estimateGrandTotal.textContent = `${estimate.grandTotal.toLocaleString('ru-RU')} ₽`;
    }

    if (this.cuttingContainer) {
      const summary = this.cuttingContainer.querySelector('#cutting-summary');
      const list = this.cuttingContainer.querySelector('#cutting-bars-list');

      if (summary) {
        summary.innerHTML = `Труба 40×40 (6м): <b>${pipeCutting.pipeStocksCount} шт</b> | Резов: <b>${pipeCutting.totalCuts}</b> | Отход: <b>${pipeCutting.wastePercent}%</b> (${pipeCutting.totalWasteM} м)`;
      }

      if (list) {
        list.innerHTML = pipeCutting.cutMap
          .map((bar) => {
            const segmentsHtml = bar.parts
              .map((p) => {
                const pct = (p.length / bar.stockLength) * 100;
                return `<div class="cut-segment" style="width: ${pct}%;" title="${p.name}">${p.length}</div>`;
              })
              .join('');

            const wastePct = (bar.remainLength / bar.stockLength) * 100;
            const wasteHtml = bar.remainLength > 0
              ? `<div class="cut-segment waste" style="width: ${wastePct}%;" title="Остаток: ${bar.remainLength} мм">${bar.remainLength}</div>`
              : '';

            return `
              <div class="cut-bar-container">
                <div class="cut-bar-header">
                  <span>Хлыст #${bar.stockIndex} (6000 мм)</span>
                  <span>Остаток: ${bar.remainLength} мм (${bar.wastePercent}%)</span>
                </div>
                <div class="cut-bar-visual">
                  ${segmentsHtml}
                  ${wasteHtml}
                </div>
              </div>
            `;
          })
          .join('');
      }
    }
  }
}