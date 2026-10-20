'use client';

import { useEffect, useState } from 'react';

/** Tab đang hiện (`visibilitychange`) — NA-24 dừng làm mới khi tab ẩn. SSR coi như hiện */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const on = () => setVisible(document.visibilityState === 'visible');
    on();
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return visible;
}
