'use client';

import { useEffect, useState } from 'react';

/** Giờ hiện tại, làm mới mỗi phút (dòng ngày + lời chào theo buổi) */
export function useNowMinute(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}
