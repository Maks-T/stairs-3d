import type { BackgroundType, StairLayoutResult, StairUserParams, ViewMode } from '../types/stairs';
import {
  MIN_STAIR_WIDTH_MM,
  MAX_STAIR_WIDTH_MM,
  MIN_STAIR_HEIGHT_MM,
  MAX_STAIR_HEIGHT_MM
} from '../constants/stairs-config';

export class ControlsUI {
  private readonly sliderWidth: HTMLInputElement;
  private readonly inputWidth: HTMLInputElement;
  private readonly sliderHeight: HTMLInputElement;
  private readonly inputHeight: HTMLInputElement;
  private readonly badgeCalcInfo: HTMLElement;
  private readonly viewModeButtons: NodeListOf<HTMLButtonElement>;
  private readonly selectBg: HTMLSelectElement;
  private readonly selectTexture: HTMLSelectElement;
  private readonly specSpans: HTMLElement;
  private readonly specPipe: HTMLElement;

  private params: StairUserParams = {
    width: 1500,
    height: 300,
    viewMode: 'solid',
    atlasIndex: 0,
    background: 'white'
  };

  private readonly onChangeCallback: (params: StairUserParams) => void;

  constructor(onChange: (params: StairUserParams) => void) {
    this.onChangeCallback = onChange;

    this.sliderWidth = document.querySelector('#slider-width') as HTMLInputElement;
    this.inputWidth = document.querySelector('#input-width') as HTMLInputElement;
    this.sliderHeight = document.querySelector('#slider-height') as HTMLInputElement;
    this.inputHeight = document.querySelector('#input-height') as HTMLInputElement;
    this.badgeCalcInfo = document.querySelector('#step-calc-info') as HTMLElement;
    this.viewModeButtons = document.querySelectorAll('#view-mode-group .btn');
    this.selectBg = document.querySelector('#select-bg') as HTMLSelectElement;
    this.selectTexture = document.querySelector('#select-texture') as HTMLSelectElement;
    this.specSpans = document.querySelector('#spec-spans') as HTMLElement;
    this.specPipe = document.querySelector('#spec-pipe') as HTMLElement;

    this.initListeners();
  }

  private initListeners(): void {
    this.bindDimensionPair(
      this.sliderWidth,
      this.inputWidth,
      MIN_STAIR_WIDTH_MM,
      MAX_STAIR_WIDTH_MM,
      (val) => {
        this.params.width = val;
        this.onChangeCallback(this.params);
      }
    );

    this.bindDimensionPair(
      this.sliderHeight,
      this.inputHeight,
      MIN_STAIR_HEIGHT_MM,
      MAX_STAIR_HEIGHT_MM,
      (val) => {
        this.params.height = val;
        this.onChangeCallback(this.params);
      }
    );

    this.viewModeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.viewModeButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.params.viewMode = btn.dataset.mode as ViewMode;
        this.onChangeCallback(this.params);
      });
    });

    this.selectBg.addEventListener('change', () => {
      this.params.background = this.selectBg.value as BackgroundType;
      this.onChangeCallback(this.params);
    });

    this.selectTexture.addEventListener('change', () => {
      this.params.atlasIndex = Number(this.selectTexture.value);
      this.onChangeCallback(this.params);
    });
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

  updateSpecification(layout: StairLayoutResult): void {
    this.badgeCalcInfo.textContent = `${layout.stepCount} ступ. (~${Math.round(layout.stepHeight)} мм)`;
    this.specSpans.textContent = layout.spacing.spans.join(' | ') + ' мм';
    this.specPipe.textContent = `${layout.totalPipeLengthM}`;
  }
}