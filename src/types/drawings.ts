export type DrawingViewType = 'side' | 'front' | 'plan';

export interface DrawingViewOption {
  id: DrawingViewType;
  title: string;
}

export interface DimensionLineOptions {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  text: string;
  offset?: number;
  orientation?: 'horizontal' | 'vertical';
  textSide?: 'start' | 'end';
  arrowSize?: number;
}