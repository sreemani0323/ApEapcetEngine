import { create } from 'zustand';

type TaskState = 'idle' | 'processing' | 'complete' | 'error';

interface AppState {
  taskState: TaskState;
  setTaskState: (state: TaskState) => void;
}

export const useAppStore = create<AppState>((set) => ({
  taskState: 'idle',
  setTaskState: (taskState) => set({ taskState }),
}));
