import { BOT_TAB_PATH, type BotTab } from './types';

/**
 * Đường dẫn màn Bot (screens.md D-36 → D-41):
 *   /bots · /bots/personas[/new|/:id] · /bots/scripts[/new|/:id] · /bots/threads
 */
export interface BotRoute {
  tab: BotTab;
  /** Drawer đang mở: 'new' hoặc id đang sửa */
  drawer: string | null;
}

const SEG_TAB: Record<string, BotTab> = {
  replies: 'reply',
  personas: 'persona',
  scripts: 'script',
  threads: 'queue',
};

export function parseBotPath(pathname: string): BotRoute | null {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts[0] !== 'bots' || parts.length > 3) return null;
  const [, seg, sub] = parts;
  if (!seg) return { tab: 'log', drawer: null };
  const tab = SEG_TAB[seg];
  if (!tab) return null;
  if (sub === undefined) return { tab, drawer: null };
  if (tab === 'queue' || tab === 'reply') return null;
  return { tab, drawer: decodeURIComponent(sub) };
}

export const tabPath = (tab: BotTab) => BOT_TAB_PATH[tab];
export const drawerPath = (tab: 'persona' | 'script', id: string | null) =>
  `${BOT_TAB_PATH[tab]}/${id ? encodeURIComponent(id) : 'new'}`;
