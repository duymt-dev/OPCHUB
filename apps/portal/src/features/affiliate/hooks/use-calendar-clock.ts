'use client';

import { useEffect, useState } from 'react';

/** Calendar labels follow a tab kept open across the VN month boundary, without polling API. */
export function useCalendarClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
