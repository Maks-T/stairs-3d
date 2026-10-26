import 'dockview/dist/styles/dockview.css';
import './style.css';
import { calculateStairLayout } from './core/stair-layout-calculator';
import { SceneManager } from './scene/scene-manager';
import { ControlsUI } from './ui/controls-ui';
import type { StairUserParams } from './types/stairs';

function initStairsApp(): void {
  const root = document.querySelector('#dockview-root') as HTMLElement;
  if (!root) return;

  let controls: ControlsUI | null = null;
  let currentParams: StairUserParams = {
    width: 1500,
    height: 300,
    viewMode: 'solid',
    hasRisers: true,
    hasSideCladding: true,
    atlasIndex: 0,
    background: 'white'
  };

  controls = new ControlsUI(root, (params) => {
    renderApp(params);
  });

  const sceneManager = new SceneManager(controls.viewportContainer, () => {
    renderApp(currentParams);
  });

  const resizeObserver = new ResizeObserver(() => {
    sceneManager.handleResize();
  });
  resizeObserver.observe(controls.viewportContainer);

  function renderApp(params: StairUserParams): void {
    currentParams = params;
    const layout = calculateStairLayout(params.width, params.height, {
      hasRisers: params.hasRisers,
      hasSideCladding: params.hasSideCladding
    });

    sceneManager.setBackground(params.background);
    sceneManager.renderStairs(layout, params.viewMode, params.atlasIndex);

    if (controls) {
      controls.updateAll(layout);
    }
  }

  renderApp(currentParams);
}

window.addEventListener('DOMContentLoaded', initStairsApp);