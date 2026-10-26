import { calculateStairLayout } from './core/stair-layout-calculator';
import { SceneManager } from './scene/scene-manager';
import { ControlsUI } from './ui/controls-ui';
import type { StairUserParams } from './types/stairs';

function initStairsApp(): void {
  const container = document.querySelector('#canvas-container') as HTMLElement;
  if (!container) return;

  let controls: ControlsUI | null = null;
  let currentParams: StairUserParams = {
    width: 1500,
    height: 300,
    viewMode: 'solid',
    atlasIndex: 0,
    background: 'white'
  };

  const sceneManager = new SceneManager(container, () => {
    renderApp(currentParams);
  });

  function renderApp(params: StairUserParams): void {
    currentParams = params;
    const layout = calculateStairLayout(params.width, params.height);
    sceneManager.setBackground(params.background);
    sceneManager.renderStairs(layout, params.viewMode, params.atlasIndex);
    if (controls) {
      controls.updateSpecification(layout);
    }
  }

  controls = new ControlsUI((params) => renderApp(params));
  renderApp(currentParams);
}

window.addEventListener('DOMContentLoaded', initStairsApp);