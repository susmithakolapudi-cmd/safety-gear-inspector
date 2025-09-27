import { create } from 'zustand';
import type { AppState, AppActions } from './types';

const initialState: AppState = {
  file: null,
  previewUrl: null,
  boxes: [],
  status: 'idle',
  errorMessage: undefined,
};

export const useAppStore = create<AppState & AppActions>((set) => ({
  ...initialState,
  
  setFile: (file) => {
    set({ file });
    if (file) {
      const url = URL.createObjectURL(file);
      set({ previewUrl: url });
    } else {
      set({ previewUrl: null });
    }
  },
  
  setPreviewUrl: (previewUrl) => set({ previewUrl }),
  
  setBoxes: (boxes) => set({ boxes }),
  
  setStatus: (status, errorMessage) => set({ status, errorMessage }),
  
  reset: () => {
    const currentState = useAppStore.getState();
    if (currentState.previewUrl) {
      URL.revokeObjectURL(currentState.previewUrl);
    }
    set(initialState);
  },
}));
