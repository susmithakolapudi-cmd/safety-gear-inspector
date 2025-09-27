export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  class: string;
  confidence: number;
}

export interface RFResponse {
  time: number;
  predictions: BoundingBox[];
}

export interface AppState {
  file: File | null;
  previewUrl: string | null;
  boxes: BoundingBox[];
  status: 'idle' | 'loading' | 'done' | 'error';
  errorMessage?: string;
}

export interface AppActions {
  setFile: (file: File | null) => void;
  setPreviewUrl: (url: string | null) => void;
  setBoxes: (boxes: BoundingBox[]) => void;
  setStatus: (status: AppState['status'], errorMessage?: string) => void;
  reset: () => void;
}
