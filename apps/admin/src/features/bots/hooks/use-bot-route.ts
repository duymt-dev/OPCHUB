'use client';

import { usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { drawerPath, parseBotPath, tabPath } from '../route';
import type { BotTab } from '../types';

/**
 * Tab + drawer của màn Bot nằm trên URL (data-state.md, screens.md D-36 → D-41).
 * Một trang `bots/[[...slug]]` nên đổi tab bằng history API của Next (đồng bộ
 * usePathname, không tải lại RSC); nút Back của trình duyệt vẫn hoạt động.
 */
export function useBotRoute() {
  const pathname = usePathname();
  const route = parseBotPath(pathname) ?? { tab: 'log' as BotTab, drawer: null };

  const go = useCallback((path: string) => {
    if (window.location.pathname !== path) window.history.pushState(null, '', path);
  }, []);
  return {
    ...route,
    setTab: (tab: BotTab) => go(tabPath(tab)),
    openDrawer: (tab: 'persona' | 'script', id: string | null) => go(drawerPath(tab, id)),
    closeDrawer: () => go(tabPath(route.tab)),
  };
}
