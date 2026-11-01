
import {
  createDockview,
  type AddPanelPositionOptions,
  type DockviewApi,
  type IContentRenderer,
  themeLightSpaced
} from 'dockview';
import type { BackgroundType, StairLayoutResult, StairUserParams, ViewMode } from '@/types/stairs';
import {
  MIN_STAIR_WIDTH_MM,
  MAX_STAIR_WIDTH_MM,
  MIN_STAIR_HEIGHT_MM,
  MAX_STAIR_HEIGHT_MM,
  ATLAS_UV_MAP,
  type StairType
} from '@/constants/stairs-config';
import {
  calculateBoardCutting,
  calculatePipeCutting,
  type BoardCuttingResult,
  type CuttingOptimizationResult,
  type StockCutMapItem
} from '@/services/cutting-service';
import { buildStairsEstimate, type FlatEstimateRow } from '@/services/estimate-service';
import { DrawingsView } from '@/ui/drawings-view';
import {
  STAIRS_CATALOG,
  DEFAULT_CLADDING_ID,
  DEFAULT_PROFILE_ID,
  DEFAULT_TREAD_ID,
  checkCatalogSelection,
  getActiveCladding,
  getActiveProfile,
  getActiveTread
} from '@/catalog/stairs-catalog';

type PanelId =
  | 'panel_viewport'
  | 'panel_drawings'
  | 'panel_params'
  | 'panel_materials'
  | 'panel_view'
  | 'panel_estimate'
  | 'panel_cutting'
  | 'panel_spec';

interface PanelDef {
  id: PanelId;
  component: string;
  title: string;
  /** боковая панель: получает начальную ширину ~30% окна */
  sidebar?: boolean;
}

/** Порядок важен: опорные панели создаются раньше тех, что к ним привязаны */
const PANEL_DEFS: PanelDef[] = [
  { id: 'panel_viewport', component: 'viewport', title: '3D Модель' },
  { id: 'panel_drawings', component: 'drawings', title: 'Чертежи' },
  { id: 'panel_params', component: 'params', title: 'Конструкция', sidebar: true },
  { id: 'panel_materials', component: 'materials', title: 'Материалы' },
  { id: 'panel_view', component: 'view', title: 'Вид' },
  { id: 'panel_estimate', component: 'estimate', title: 'Смета' },
  { id: 'panel_cutting', component: 'cutting', title: 'Раскрой' },
  { id: 'panel_spec', component: 'specification', title: 'Спецификация' }
];

export class ControlsUI {
  private dockviewApi!: DockviewApi;
  private rootContainer!: HTMLElement;
  private windowMenu: HTMLElement | null = null;
  private windowMenuTrigger: HTMLElement | null = null;
  private lastLayout: StairLayoutResult | null = null;
  public readonly viewportContainer: HTMLElement;
  private readonly drawingsView: DrawingsView;

  private badgeStepInfo!: HTMLElement;


  private specTreads!: HTMLElement;
  private specPipe!: HTMLElement;
  private specCladdingBoards!: HTMLElement;
  private specHardware!: HTMLElement;
  private specSpans!: HTMLElement;

  private estimateTableBody!: HTMLElement;
  private estimateGrandTotal!: HTMLElement;
  private cuttingContainer!: HTMLElement;
  private specLabelCladding!: HTMLElement;
  private labelCladdingToggle!: HTMLElement;
  private specWarnings!: HTMLElement;
  private specLabelTreads!: HTMLElement;
  private specLabelPipe!: HTMLElement;

  /** id выбранного на карте раскроя элемента каркаса (подсвечивается в 3D) */
  private selectedTubeId: string | null = null;

  private params: StairUserParams = {
    stairType: 'straight',
    width: 1500,
    height: 300,
    viewMode: 'solid',
    hasRisers: true,
    hasSideCladding: true,
    showFasteners: false,
    atlasIndex: 0,
    background: 'white',
    profileId: DEFAULT_PROFILE_ID,
    treadId: DEFAULT_TREAD_ID,
    claddingId: DEFAULT_CLADDING_ID,
    postPitchMm: 400,
    supportMode: 'posts'
  };

  private readonly onChangeCallback: (params: StairUserParams) => void;
  private readonly onTubeSelectCallback: (tubeId: string | null) => void;

  constructor(
    rootContainer: HTMLElement,
    onChange: (params: StairUserParams) => void,
    onTubeSelect: (tubeId: string | null) => void = () => {}
  ) {
    this.onChangeCallback = onChange;
    this.onTubeSelectCallback = onTubeSelect;
    this.viewportContainer = document.createElement('div');
    this.viewportContainer.id = 'cad-viewport-container';
    this.drawingsView = new DrawingsView();

    this.initDockview(rootContainer);
  }

  private initDockview(rootContainer: HTMLElement): void {
    this.rootContainer = rootContainer;
    rootContainer.classList.add('shadcn-root');

    this.dockviewApi = createDockview(rootContainer, {
      theme: themeLightSpaced,
      createComponent: (options: { name: string }): IContentRenderer => {
        return {
          element: this.createPanelContent(options.name),
          init: () => {},
          dispose: () => {},
          update: () => {}
        };
      }
    });

    this.buildDefaultLayout();
    this.buildMenubar(rootContainer);

    // Закрытие и добавление панелей (в том числе крестиком на вкладке) синхронизируем с меню «Окно»
    this.dockviewApi.onDidAddPanel(() => {
      this.syncWindowMenu();
      this.refreshAfterPanelChange();
    });
    this.dockviewApi.onDidRemovePanel(() => this.syncWindowMenu());
  }

  /** Куда по умолчанию помещается панель; если опорной панели нет (закрыта), подбирается запасное место */
  private getPanelPosition(id: PanelId): AddPanelPositionOptions | undefined {
    const api = this.dockviewApi;
    const has = (panelId: PanelId): boolean => !!api.getPanel(panelId);
    const anyPanel = api.panels[0];
    const fallback: AddPanelPositionOptions | undefined = anyPanel
      ? { referencePanel: anyPanel.id, direction: 'right' }
      : undefined;

    // Правая колонка: верхний блок (параметры, материалы) и нижний (смета, раскрой, спецификация)
    const topId = (['panel_params', 'panel_materials', 'panel_view'] as PanelId[]).find(has);
    const bottomId = (['panel_estimate', 'panel_cutting', 'panel_spec'] as PanelId[]).find(has);
    const rightOfViewport: AddPanelPositionOptions | undefined = has('panel_viewport')
      ? { referencePanel: 'panel_viewport', direction: 'right' }
      : fallback;

    switch (id) {
      case 'panel_viewport':
        return anyPanel ? { referencePanel: anyPanel.id, direction: 'left' } : undefined;
      case 'panel_drawings':
        return has('panel_viewport') ? { referencePanel: 'panel_viewport', direction: 'within' } : fallback;
      case 'panel_params':
      case 'panel_materials':
      case 'panel_view':
        if (topId) return { referencePanel: topId, direction: 'within' };
        if (bottomId) return { referencePanel: bottomId, direction: 'above' };
        return rightOfViewport;
      case 'panel_estimate':
      case 'panel_cutting':
      case 'panel_spec':
        if (bottomId) return { referencePanel: bottomId, direction: 'within' };
        if (topId) return { referencePanel: topId, direction: 'below' };
        return rightOfViewport;
      default:
        return fallback;
    }
  }

  private openPanel(id: PanelId): void {
    const existing = this.dockviewApi.getPanel(id);
    if (existing) {
      existing.api.setActive();
      return;
    }
    const def = PANEL_DEFS.find((p) => p.id === id);
    if (!def) return;

    const rootWidth = this.rootContainer.clientWidth || window.innerWidth;
    this.dockviewApi.addPanel({
      id: def.id,
      component: def.component,
      title: def.title,
      position: this.getPanelPosition(id),
      ...(def.sidebar ? { initialWidth: Math.max(320, Math.round(rootWidth * 0.3)) } : {})
    });
  }

  private closePanel(id: PanelId): void {
    this.dockviewApi.getPanel(id)?.api.close();
  }

  /** Раскладка по умолчанию: 3D и чертежи слева, параметры сверху справа, смета/раскрой/спецификация снизу справа */
  private buildDefaultLayout(): void {
    PANEL_DEFS.forEach((def) => this.openPanel(def.id));
    this.dockviewApi.getPanel('panel_viewport')?.api.setActive();
    this.dockviewApi.getPanel('panel_params')?.api.setActive();
    this.dockviewApi.getPanel('panel_estimate')?.api.setActive();
  }

  private resetLayout(): void {
    this.dockviewApi.clear();
    this.buildDefaultLayout();
  }

  /** Содержимое панелей создаётся заново при повторном открытии: заполняем его текущими данными */
  private refreshAfterPanelChange(): void {
    if (this.lastLayout) this.updateAll(this.lastLayout);
  }

  private buildMenubar(rootContainer: HTMLElement): void {
    const bar = document.createElement('div');
    bar.className = 'app-menubar';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'menu-trigger';
    trigger.textContent = 'Окно';
    trigger.setAttribute('aria-haspopup', 'menu');

    const menu = document.createElement('div');
    menu.className = 'menu-dropdown';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;

    const title = document.createElement('div');
    title.className = 'menu-label';
    title.textContent = 'Панели';
    menu.appendChild(title);

    PANEL_DEFS.forEach((def) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'menu-item';
      item.dataset.panelId = def.id;
      item.setAttribute('role', 'menuitemcheckbox');
      item.innerHTML = `<span class="menu-check" aria-hidden="true"></span><span>${def.title}</span>`;
      item.addEventListener('click', () => {
        if (this.dockviewApi.getPanel(def.id)) this.closePanel(def.id);
        else this.openPanel(def.id);
      });
      menu.appendChild(item);
    });

    const separator = document.createElement('div');
    separator.className = 'menu-separator';
    menu.appendChild(separator);

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'menu-item';
    reset.setAttribute('role', 'menuitem');
    reset.innerHTML = '<span class="menu-check" aria-hidden="true"></span><span>Сбросить раскладку</span>';
    reset.addEventListener('click', () => {
      this.resetLayout();
      this.toggleWindowMenu(false);
    });
    menu.appendChild(reset);

    const wrap = document.createElement('div');
    wrap.className = 'menu-wrap';
    wrap.append(trigger, menu);
    bar.appendChild(wrap);

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleWindowMenu(menu.hidden !== false);
    });
    document.addEventListener('click', (e) => {
      if (!menu.hidden && !wrap.contains(e.target as Node)) this.toggleWindowMenu(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.toggleWindowMenu(false);
    });

    this.windowMenu = menu;
    this.windowMenuTrigger = trigger;
    rootContainer.parentElement?.insertBefore(bar, rootContainer);
    this.syncWindowMenu();
  }

  private toggleWindowMenu(open: boolean): void {
    if (!this.windowMenu || !this.windowMenuTrigger) return;
    this.windowMenu.hidden = !open;
    this.windowMenuTrigger.classList.toggle('open', open);
    this.windowMenuTrigger.setAttribute('aria-expanded', String(open));
  }

  /** Галочки в меню «Окно» показывают, какие панели сейчас открыты */
  private syncWindowMenu(): void {
    if (!this.windowMenu) return;
    this.windowMenu.querySelectorAll<HTMLElement>('[data-panel-id]').forEach((item) => {
      const open = !!this.dockviewApi.getPanel(item.dataset.panelId as PanelId);
      item.classList.toggle('checked', open);
      item.setAttribute('aria-checked', String(open));
    });
  }

  private createPanelContent(componentName: string): HTMLElement {
    switch (componentName) {
      case 'viewport': return this.viewportContainer;
      case 'drawings': return this.drawingsView.container;
      case 'params': return this.createParamsView();
      case 'materials': return this.createMaterialsView();
      case 'view': return this.createViewSettingsView();
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
        <label class="cad-label">Опора каркаса</label>
        <div class="cad-btn-group" id="p-support-group">
          <button type="button" class="cad-btn" data-support="posts">На опорах</button>
          <button type="button" class="cad-btn" data-support="concrete">На бетонном основании</button>
        </div>
      </div>

      <div class="cad-group">
        <label class="cad-label">Форма марша</label>
        <div class="cad-btn-group" id="p-stair-type-group">
          <button type="button" class="cad-btn" data-type="straight">Прямая</button>
          <button type="button" class="cad-btn" data-type="corner-left">С 1 углом слева</button>
          <button type="button" class="cad-btn" data-type="corner-right">С 1 углом справа</button>
          <button type="button" class="cad-btn" data-type="corner-double">С 2 углами</button>
        </div>
      </div>

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
          <input type="range" id="p-slider-height" min="${MIN_STAIR_HEIGHT_MM}" max="${MAX_STAIR_HEIGHT_MM}" step="10" value="${this.params.height}">
          <input type="number" id="p-input-height" class="cad-input-number" min="${MIN_STAIR_HEIGHT_MM}" max="${MAX_STAIR_HEIGHT_MM}" step="5" value="${this.params.height}">
        </div>
        <div id="p-badge-step-info" class="cad-badge"></div>
      </div>

      <div class="cad-group">
        <label class="cad-label">Шаг опор (между осями), мм</label>
        <div class="cad-row">
          <input type="range" id="p-slider-post" min="250" max="800" step="10" value="${this.params.postPitchMm ?? 400}">
          <input type="number" id="p-input-post" class="cad-input-number" min="250" max="800" step="10" value="${this.params.postPitchMm ?? 400}">
        </div>
      </div>

      <div id="p-spec-warnings" class="cad-warn" hidden></div>

      <div class="cad-group">
        <label class="cad-label">Конструктивные элементы</label>
        <div class="cad-toggle-row">
          <label for="check-risers">Вертикальные подступенки</label>
          <input type="checkbox" id="check-risers">
        </div>
        <div class="cad-toggle-row">
          <label for="check-cladding">Боковая зашивка</label>
          <input type="checkbox" id="check-cladding">
        </div>
      </div>
    `;

    this.specWarnings = el.querySelector('#p-spec-warnings') as HTMLElement;
    this.badgeStepInfo = el.querySelector('#p-badge-step-info') as HTMLElement;
    this.labelCladdingToggle = el.querySelector('label[for="check-cladding"]') as HTMLElement;

    this.bindButtonGroup(el, '#p-support-group', 'support', this.params.supportMode ?? 'posts', (value) => {
      this.params.supportMode = value === 'concrete' ? 'concrete' : 'posts';
    });
    this.bindButtonGroup(el, '#p-stair-type-group', 'type', this.params.stairType ?? 'straight', (value) => {
      this.params.stairType = value as StairType;
    });

    this.bindDimensionPair(
      el.querySelector('#p-slider-width') as HTMLInputElement,
      el.querySelector('#p-input-width') as HTMLInputElement,
      MIN_STAIR_WIDTH_MM,
      MAX_STAIR_WIDTH_MM,
      (val) => {
        this.params.width = val;
        this.onChangeCallback(this.params);
      }
    );
    this.bindDimensionPair(
      el.querySelector('#p-slider-height') as HTMLInputElement,
      el.querySelector('#p-input-height') as HTMLInputElement,
      MIN_STAIR_HEIGHT_MM,
      MAX_STAIR_HEIGHT_MM,
      (val) => {
        this.params.height = val;
        this.onChangeCallback(this.params);
      }
    );
    this.bindDimensionPair(
      el.querySelector('#p-slider-post') as HTMLInputElement,
      el.querySelector('#p-input-post') as HTMLInputElement,
      250,
      800,
      (val) => {
        this.params.postPitchMm = val;
        this.onChangeCallback(this.params);
      }
    );

    this.bindCheckbox(el, '#check-risers', this.params.hasRisers, (checked) => {
      this.params.hasRisers = checked;
    });
    this.bindCheckbox(el, '#check-cladding', this.params.hasSideCladding, (checked) => {
      this.params.hasSideCladding = checked;
    });

    return el;
  }

  private createMaterialsView(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'cad-panel-content';
    const options = (items: Array<{ id: string; name: string }>): string =>
      items.map((item) => `<option value="${item.id}">${item.name}</option>`).join('');
    el.innerHTML = `
      <div class="cad-group">
        <label class="cad-label">Ступень</label>
        <select id="p-select-tread" class="cad-select">${options(STAIRS_CATALOG.treads)}</select>
      </div>

      <div class="cad-group">
        <label class="cad-label">Доска подступенков и зашивки</label>
        <select id="p-select-cladding" class="cad-select">${options(STAIRS_CATALOG.claddings)}</select>
      </div>

      <div class="cad-group">
        <label class="cad-label">Профиль каркаса</label>
        <select id="p-select-profile" class="cad-select">${options(STAIRS_CATALOG.profiles)}</select>
      </div>
    `;

    this.bindSelect(el, '#p-select-tread', this.params.treadId ?? DEFAULT_TREAD_ID, (value) => {
      this.params.treadId = value;
    });
    this.bindSelect(el, '#p-select-cladding', this.params.claddingId ?? DEFAULT_CLADDING_ID, (value) => {
      this.params.claddingId = value;
    });
    this.bindSelect(el, '#p-select-profile', this.params.profileId ?? DEFAULT_PROFILE_ID, (value) => {
      this.params.profileId = value;
    });

    return el;
  }

  private createViewSettingsView(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'cad-panel-content';
    const textureOptionsHtml = Object.entries(ATLAS_UV_MAP)
      .map(([idx, item]) => `<option value="${idx}">${item.name}</option>`)
      .join('');

    el.innerHTML = `
      <div class="cad-group">
        <label class="cad-label">Режим отображения каркаса</label>
        <div class="cad-btn-group" id="p-view-mode-group">
          <button type="button" class="cad-btn" data-mode="solid">Сплошной</button>
          <button type="button" class="cad-btn" data-mode="xray">Рентген (X-Ray)</button>
          <button type="button" class="cad-btn" data-mode="frame">Только каркас</button>
        </div>
        <div class="cad-toggle-row">
          <label for="check-fasteners">Точки крепления</label>
          <input type="checkbox" id="check-fasteners">
        </div>
      </div>

      <div class="cad-group">
        <label class="cad-label">Текстура ступеней</label>
        <select id="p-select-texture" class="cad-select">${textureOptionsHtml}</select>
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

    this.bindButtonGroup(el, '#p-view-mode-group', 'mode', this.params.viewMode, (value) => {
      this.params.viewMode = value as ViewMode;
    });
    this.bindCheckbox(el, '#check-fasteners', this.params.showFasteners, (checked) => {
      this.params.showFasteners = checked;
    });
    this.bindSelect(el, '#p-select-texture', String(this.params.atlasIndex), (value) => {
      this.params.atlasIndex = Number(value);
    });
    this.bindSelect(el, '#p-select-bg', this.params.background, (value) => {
      this.params.background = value as BackgroundType;
    });

    return el;
  }

  /** Группа кнопок-переключателей: data-атрибут кнопки задаёт значение параметра */
  private bindButtonGroup(
    root: HTMLElement,
    selector: string,
    dataKey: string,
    current: string,
    apply: (value: string) => void
  ): void {
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>(`${selector} .cad-btn`));
    buttons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset[dataKey] === current);
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.toggle('active', b === btn));
        apply(btn.dataset[dataKey] ?? '');
        this.onChangeCallback(this.params);
      });
    });
  }

  private bindSelect(root: HTMLElement, selector: string, current: string, apply: (value: string) => void): void {
    const select = root.querySelector(selector) as HTMLSelectElement;
    select.value = current;
    select.addEventListener('change', () => {
      apply(select.value);
      this.onChangeCallback(this.params);
    });
  }

  private bindCheckbox(root: HTMLElement, selector: string, current: boolean, apply: (checked: boolean) => void): void {
    const input = root.querySelector(selector) as HTMLInputElement;
    input.checked = current;
    input.addEventListener('change', () => {
      apply(input.checked);
      this.onChangeCallback(this.params);
    });
  }

  private createSpecificationView(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'cad-panel-content';
    el.innerHTML = `
      <table class="cad-spec-table">
        <tbody>
          <tr>
            <td id="spec-label-treads">Ступени ДПК</td>
            <td id="spec-treads">-</td>
          </tr>
          <tr>
            <td id="spec-label-pipe">Труба каркаса</td>
            <td id="spec-pipe">- м</td>
          </tr>
          <tr>
            <td id="spec-label-cladding">Заборная доска</td>
            <td id="spec-cladding-boards">- шт</td>
          </tr>
          <tr>
            <td>Крепеж (саморезы с запасом 10%)</td>
            <td id="spec-hardware">- шт</td>
          </tr>
          <tr>
            <td>Пролёты стоек в свету</td>
            <td id="spec-spans">-</td>
          </tr>
        </tbody>
      </table>
    `;

    this.specLabelCladding = el.querySelector('#spec-label-cladding') as HTMLElement;
    this.specLabelTreads = el.querySelector('#spec-label-treads') as HTMLElement;
    this.specLabelPipe = el.querySelector('#spec-label-pipe') as HTMLElement;
    this.specTreads = el.querySelector('#spec-treads') as HTMLElement;
    this.specPipe = el.querySelector('#spec-pipe') as HTMLElement;
    this.specCladdingBoards = el.querySelector('#spec-cladding-boards') as HTMLElement;
    this.specHardware = el.querySelector('#spec-hardware') as HTMLElement;
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
      <div id="cutting-selected" class="cut-selected" hidden></div>
      <div id="cutting-bars-list"></div>
    `;

    // Клик по куску (на шкале или в списке) выделяет элемент в 3D; повторный клик снимает выделение
    el.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-cut-clear]')) {
        this.selectTube(null);
        return;
      }
      const piece = target.closest('[data-tube-id]') as HTMLElement | null;
      if (!piece) return;
      const id = piece.dataset.tubeId || null;
      this.selectTube(id === this.selectedTubeId ? null : id);
    });

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
    this.lastLayout = layout;
    const pipeCutting = calculatePipeCutting(layout);
    const boardCutting = calculateBoardCutting(layout);
    const estimate = buildStairsEstimate(layout, pipeCutting, boardCutting);

    this.drawingsView.update(layout);
    this.updateSpecInfo(layout);

    if (this.badgeStepInfo) {
      const plan = layout.stepPlan;
      const h = Math.round(layout.stepHeight * 10) / 10;
      let text = `${layout.stepCount} ступ. по ${h} мм`;
      if (plan && plan.riserHeightMm > 0) {
        const rip = plan.ripWidthMm > 0.5 ? `, срез доски ${Math.round(plan.ripWidthMm)} мм` : '';
        text += ` · подступенок ${Math.round(plan.riserHeightMm)} мм из доски ${plan.boardWidthMm} мм${rip}`;
      }
      this.badgeStepInfo.textContent = text;
    }
    if (this.specTreads) {
      this.specTreads.textContent =
        `${layout.stepCount} шт (${layout.totalWidth} мм), досок ${boardCutting.treads.boardsCount} × ${boardCutting.treads.stockLengthMm / 1000} м`;
    }
    if (this.specPipe) {
      this.specPipe.textContent = `${pipeCutting.pipeStocksCount} хлыстов (${layout.totalPipeLengthM} м)`;
    }
    if (this.specCladdingBoards) {
      const claddingBoards = boardCutting.cladding?.boardsCount ?? 0;
      this.specCladdingBoards.textContent =
        `${claddingBoards} шт (~${((claddingBoards * (boardCutting.cladding?.stockLengthMm ?? 3000)) / 1000).toFixed(1)} м)`;
    }
    if (this.specHardware) {
      this.specHardware.textContent = `${layout.fasteners.totalScrewsWithReserve} шт (${layout.fasteners.treads.countWithReserve} шт 4.8×50 + ${layout.fasteners.risersAndCladding.countWithReserve} шт 4.2×32)`;
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

    this.renderCutting(pipeCutting, boardCutting);
  }
  /** Подписи спецификации, подсказки по профилю/ступени и предупреждения */
  private updateSpecInfo(layout: StairLayoutResult): void {
    const profile = getActiveProfile();
    const tread = getActiveTread();
    const board = getActiveCladding();

    if (this.specLabelCladding) {
      this.specLabelCladding.textContent = `Заборная доска ${board.name} мм`;
    }
    if (this.labelCladdingToggle) {
      this.labelCladdingToggle.textContent = `Боковая зашивка (доска ${board.widthMm} мм)`;
    }
    if (this.specLabelTreads) {
      this.specLabelTreads.textContent = `Ступени ${tread.name} (${tread.thicknessMm}×${tread.depthMm} мм)`;
    }
    if (this.specLabelPipe) {
      this.specLabelPipe.textContent = `${profile.name} мм (каркас)`;
    }
    if (this.specWarnings) {
      const warnings = [
        ...(layout.stepPlan?.warnings ?? []),
        ...checkCatalogSelection(this.params.width, this.params.height, layout)
      ];
      this.specWarnings.hidden = warnings.length === 0;
      this.specWarnings.innerHTML = warnings.map((w) => `<div>⚠ ${w}</div>`).join('');
    }
  }


  /** Выделение элемента раскроя: подсвечивается на карте и в 3D */
  private selectTube(tubeId: string | null): void {
    this.selectedTubeId = tubeId;
    this.refreshCutSelection();
    this.onTubeSelectCallback(tubeId);
  }

  private refreshCutSelection(): void {
    if (!this.cuttingContainer) return;
    const selectedInfo = this.cuttingContainer.querySelector('#cutting-selected') as HTMLElement | null;
    let found: HTMLElement | null = null;

    this.cuttingContainer.querySelectorAll<HTMLElement>('[data-tube-id]').forEach((node) => {
      const isSelected = this.selectedTubeId !== null && node.dataset.tubeId === this.selectedTubeId;
      node.classList.toggle('selected', isSelected);
      if (isSelected && !found) found = node;
    });

    if (!selectedInfo) return;
    if (found && this.selectedTubeId) {
      const node = found as HTMLElement;
      selectedInfo.hidden = false;
      selectedInfo.innerHTML =
        `<span>Выбрано: <b>${node.dataset.name ?? ''}</b> · <code>${this.selectedTubeId}</code></span>` +
        '<button type="button" class="cut-clear" data-cut-clear>Снять ✕</button>';
    } else {
      selectedInfo.hidden = true;
      selectedInfo.innerHTML = '';
    }
  }

  /** Один блок карты раскроя: заголовок, шкалы хлыстов (в масштабе) и под каждой чипы с размерами с автопереносом строк */
  private renderCutSection(title: string, cutMap: StockCutMapItem[], kind: 'pipe' | 'boards'): string {
    // Узкие куски на шкале не вмещают подпись, поэтому под шкалой те же куски идут чипами
    const MIN_LABEL_PCT = 6;
    const bars = cutMap
      .map((bar) => {
        const segmentsHtml = bar.parts
          .map((p) => {
            const pct = (p.length / bar.stockLength) * 100;
            const label = pct >= MIN_LABEL_PCT ? p.length : '';
            return `<div class="cut-segment" data-tube-id="${p.tubeId}" data-name="${p.name}" style="width: ${pct}%; flex-basis: ${pct}%;" title="${p.name}">${label}</div>`;
          })
          .join('');

        const chipsHtml = bar.parts
          .map((p) => `<button type="button" class="cut-chip" data-tube-id="${p.tubeId}" data-name="${p.name}" title="${p.name}">${p.length}</button>`)
          .join('');

        const wastePct = (bar.remainLength / bar.stockLength) * 100;
        const wasteHtml = bar.remainLength > 0
          ? `<div class="cut-segment waste" style="width: ${wastePct}%; flex-basis: ${wastePct}%;" title="Остаток: ${bar.remainLength} мм">${wastePct >= MIN_LABEL_PCT ? bar.remainLength : ''}</div>`
          : '';
        const wasteChip = bar.remainLength > 0
          ? `<span class="cut-chip waste" title="Остаток">ост. ${bar.remainLength}</span>`
          : '';

        return `
          <div class="cut-bar-container">
            <div class="cut-bar-header">
              <span>${kind === 'pipe' ? 'Хлыст' : 'Доска'} #${bar.stockIndex} (${bar.stockLength} мм)</span>
              <span>Остаток: ${bar.remainLength} мм (${bar.wastePercent}%)</span>
            </div>
            <div class="cut-bar-visual">
              ${segmentsHtml}
              ${wasteHtml}
            </div>
            <div class="cut-chips">${chipsHtml}${wasteChip}</div>
          </div>
        `;
      })
      .join('');

    return `
      <div class="cut-section cut-section-${kind}">
        <div class="cut-section-title">${title}</div>
        ${bars}
      </div>
    `;
  }

  private renderCutting(pipeCutting: CuttingOptimizationResult, boardCutting: BoardCuttingResult): void {
    if (!this.cuttingContainer) return;
    const profile = getActiveProfile();
    const summary = this.cuttingContainer.querySelector('#cutting-summary');
    const list = this.cuttingContainer.querySelector('#cutting-bars-list');
    const stockM = profile.stockLengthMm / 1000;
    const cladding = boardCutting.cladding;

    if (summary) {
      summary.innerHTML =
        `Закупка: ${profile.name} (${stockM} м) <b>${pipeCutting.pipeStocksCount} шт</b>` +
        ` | ступени <b>${boardCutting.treads.boardsCount} шт</b>` +
        (cladding ? ` | доска ${cladding.title.replace('Доска ', '')} <b>${cladding.boardsCount} шт</b>` : '');
    }

    if (list) {
      const pipeTitle =
        `${profile.name} (${stockM} м): <b>${pipeCutting.pipeStocksCount} шт</b> | резов ${pipeCutting.totalCuts} | ` +
        `отход ${pipeCutting.wastePercent}% (${pipeCutting.totalWasteM} м)`;
      const sectionTitle = (s: BoardCuttingResult['treads']): string =>
        `${s.title} (${s.stockLengthMm / 1000} м): <b>${s.boardsCount} шт</b> | резов ${s.totalCuts} | ` +
        `отход ${s.wastePercent}% (${s.totalWasteM} м)` +
        (s.joints > 0 ? ` | <span class="cut-joint">стыков: ${s.joints}</span>` : '');

      list.innerHTML =
        this.renderCutSection(pipeTitle, pipeCutting.cutMap, 'pipe') +
        this.renderCutSection(sectionTitle(boardCutting.treads), boardCutting.treads.cutMap, 'boards') +
        (cladding ? this.renderCutSection(sectionTitle(cladding), cladding.cutMap, 'boards') : '');
    }

    // Выбранный элемент мог исчезнуть после пересчёта
    if (this.selectedTubeId && !this.cuttingContainer.querySelector(`[data-tube-id="${this.selectedTubeId}"]`)) {
      this.selectedTubeId = null;
      this.onTubeSelectCallback(null);
    }
    this.refreshCutSelection();
  }
}
