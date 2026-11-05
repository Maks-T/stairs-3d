export type DrawingViewType = 'side' | 'front' | 'plan' | 'levels' | 'fasteners';

export interface DrawingViewOption {
  id: DrawingViewType;
  title: string;
}
