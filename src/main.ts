import 'dockview/dist/styles/dockview.css';
import './style.css';
import { calcStairLayout } from '@calculation/stairs';
import { resolveSelection, toStairSpec } from './catalog/stairs-catalog';
import { DEFAULT_PARAMS } from './config/defaults';
import { SceneManager } from './scene/scene-manager';
import { ControlsUI } from './ui/controls-ui';
import type { StairUserParams } from './types/app';

let activeScene: SceneManager | null = null;

function initStairsApp(): void {
  const root = document.querySelector('#dockview-root') as HTMLElement;
  if (!root) return;

  let currentParams: StairUserParams = { ...DEFAULT_PARAMS };
  let sceneManager: SceneManager | null = null;

  const controls = new ControlsUI(root, currentParams, renderApp, (tubeId) => sceneManager?.highlightTube(tubeId));

  // нет WebGL
  try {
    sceneManager = new SceneManager(controls.viewportContainer, () => renderApp(currentParams));
    activeScene = sceneManager;
    new ResizeObserver(() => sceneManager?.handleResize()).observe(controls.viewportContainer);
  } catch (error) {
    console.error('3D недоступно:', error);
    sceneManager = null;
    controls.viewportContainer.innerHTML =
      '<div style="padding:24px;color:#475569;font:14px sans-serif">3D-вид недоступен: браузер не создал WebGL-контекст. Закройте лишние вкладки с 3D или перезапустите браузер и обновите страницу. Чертежи, смета и раскрой работают.</div>';
  }

  function renderApp(params: StairUserParams): void {
    currentParams = params;
    const selection = resolveSelection(params);
    const layout = calcStairLayout({
      stairType: params.stairType,
      widthMm: params.width,
      heightMm: params.height,
      hasRisers: params.hasRisers,
      hasSideCladding: params.hasSideCladding,
      supportMode: params.supportMode,
      postPitchMm: params.postPitchMm,
      spec: toStairSpec(selection)
    });

    if (sceneManager) {
      sceneManager.setBackground(params.background);
      sceneManager.renderStairs(layout, params.viewMode, params.atlasIndex, params.showFasteners);
    }
    controls.updateAll(layout, selection);
  }

  renderApp(currentParams);
}

window.addEventListener('DOMContentLoaded', initStairsApp);

// HMR: освободить WebGL
const hot = (import.meta as unknown as { hot?: { dispose: (cb: () => void) => void } }).hot;
hot?.dispose(() => activeScene?.dispose());
