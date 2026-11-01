
import 'dockview/dist/styles/dockview.css';
import './style.css';
import { calculateStairLayout } from './core/stair-layout-calculator';
import { SceneManager } from './scene/scene-manager';
import { ControlsUI } from './ui/controls-ui';
import type { StairUserParams } from './types/stairs';
import {
  applyCatalogSelection,
  DEFAULT_CLADDING_ID,
  DEFAULT_PROFILE_ID,
  DEFAULT_TREAD_ID
} from './catalog/stairs-catalog';

let activeScene: SceneManager | null = null;

function initStairsApp(): void {
  const root = document.querySelector('#dockview-root') as HTMLElement;
  if (!root) return;

  let controls: ControlsUI | null = null;
  let currentParams: StairUserParams = {
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
    claddingId: DEFAULT_CLADDING_ID
  };

  let sceneManager: SceneManager | null = null;

  controls = new ControlsUI(
    root,
    (params) => {
      renderApp(params);
    },
    (tubeId) => {
      sceneManager?.highlightTube(tubeId);
    }
  );

  // Если браузер не смог создать WebGL (лимит контекстов, заблокированный GPU), чертежи, смета и раскрой всё равно работают
  try {
    sceneManager = new SceneManager(controls.viewportContainer, () => {
      renderApp(currentParams);
    });
    activeScene = sceneManager;
    const resizeObserver = new ResizeObserver(() => {
      sceneManager?.handleResize();
    });
    resizeObserver.observe(controls.viewportContainer);
  } catch (error) {
    console.error('3D недоступно:', error);
    sceneManager = null;
    controls.viewportContainer.innerHTML =
      '<div style="padding:24px;color:#475569;font:14px sans-serif">3D-вид недоступен: браузер не создал WebGL-контекст. Закройте лишние вкладки с 3D или перезапустите браузер и обновите страницу. Чертежи, смета и раскрой работают.</div>';
  }

  function renderApp(params: StairUserParams): void {
    currentParams = params;
    // Профиль и ступень из каталога задают геометрию каркаса: применяем до расчёта раскладки
    applyCatalogSelection(
      params.profileId ?? DEFAULT_PROFILE_ID,
      params.treadId ?? DEFAULT_TREAD_ID,
      params.claddingId ?? DEFAULT_CLADDING_ID,
      params.postPitchMm
    );
    const layout = calculateStairLayout(params.width, params.height, {
      stairType: params.stairType,
      hasRisers: params.hasRisers,
      hasSideCladding: params.hasSideCladding,
      supportMode: params.supportMode
    });

    if (sceneManager) {
      sceneManager.setBackground(params.background);
      sceneManager.renderStairs(layout, params.viewMode, params.atlasIndex, params.showFasteners);
    }

    if (controls) {
      controls.updateAll(layout);
    }
  }

  renderApp(currentParams);
}

window.addEventListener('DOMContentLoaded', initStairsApp);

// При горячей перезагрузке освобождаем WebGL-контекст
const hot = (import.meta as unknown as { hot?: { dispose: (cb: () => void) => void } }).hot;
hot?.dispose(() => {
  activeScene?.dispose();
});


