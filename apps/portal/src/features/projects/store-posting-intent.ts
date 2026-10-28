'use client';

import { create } from 'zustand';
import type { ProjectStoreSource } from './types';

/** Transient cross-route intent; the server independently validates store ownership on save. */
export const useStorePostingIntent = create<{
  source: ProjectStoreSource | null;
  open: (source: ProjectStoreSource) => void;
  close: () => void;
}>((set) => ({
  source: null,
  open: (source) => set({ source }),
  close: () => set({ source: null }),
}));

export const openStoreProject = (source: ProjectStoreSource) =>
  useStorePostingIntent.getState().open(source);
