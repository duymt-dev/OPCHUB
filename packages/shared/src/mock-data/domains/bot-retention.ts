import { botState } from './bot-state';
import { mockDb } from './store';

/** Never evict active work; prune only oldest terminal snapshots for a new slot. */
export function reserveMockBotThread(): boolean {
  const state = botState();
  if (state.threads.filter((row) => row.status !== 'done').length >= 30) return false;
  while (state.threads.length >= 30) {
    const oldest = state.threads
      .filter((row) => row.status === 'done')
      .sort(
        (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id),
      )[0];
    if (!oldest) return false;
    state.threads = state.threads.filter((row) => row.id !== oldest.id);
    mockDb().botLog = mockDb().botLog.filter((row) => row.id !== oldest.id);
  }
  return true;
}
