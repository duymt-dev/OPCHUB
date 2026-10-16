'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useSyncExternalStore } from 'react';
import { PANEL_TABS, type PanelTab } from '../types';

/** Bảng thông tin mở sẵn khi màn đủ rộng (prototype: ≥ 1280px) */
const WIDE = '(min-width: 1280px)';

function subscribe(cb: () => void) {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

const useWide = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE).matches,
    () => false,
  );

const isTab = (v: string | null): v is PanelTab => PANEL_TABS.some((t) => t === v);

/**
 * Trạng thái màn chat trên URL (data-state.md): `/chat/:groupId/:room?q=&panel=`.
 * `panel` = members | files | pins | none; vắng mặt = mặc định theo độ rộng màn.
 */
export function useChatUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const wide = useWide();
  const [, , groupId = null, roomKey = null] = pathname.split('/').map(decodeURIComponent);
  const q = sp.get('q') ?? '';
  const searchOpen = sp.has('q');
  const raw = sp.get('panel');
  const panel: PanelTab | null = isTab(raw) ? raw : raw === 'none' || !wide ? null : 'members';

  const setParams = useCallback(
    (patch: Record<string, string | null>, path = pathname) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) next.delete(k);
        else next.set(k, v);
      }
      const s = next.toString();
      router.replace(s ? `${path}?${s}` : path, { scroll: false });
    },
    [pathname, router, sp],
  );

  return {
    groupId,
    roomKey,
    q,
    searchOpen,
    panel,
    setQ: (v: string) => setParams({ q: v }),
    toggleSearch: () => setParams({ q: searchOpen ? null : '' }),
    setPanel: (t: PanelTab | null) => setParams({ panel: t ?? 'none' }),
    /** Đổi phòng: giữ trạng thái bảng, bỏ từ khoá tìm */
    go: (gid: string, key?: string) =>
      setParams({ q: null }, key && key !== 'general' ? `/chat/${gid}/${key}` : `/chat/${gid}`),
    push: (href: string) => router.push(href),
  };
}
