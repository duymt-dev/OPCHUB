'use client';

import { useEffect, useRef, useState } from 'react';

/** Draft input is local; the committed filter remains URL-owned. */
export function useRevenueSearch(query: string, onQuery: (q: string) => void) {
  const [draft, setDraft] = useState({ source: query, value: query });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (draft.source !== query) setDraft({ source: query, value: query });
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [query],
  );
  return {
    value: draft.value,
    onChange: (value: string) => {
      setDraft({ source: query, value });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => onQuery(value), 300);
    },
  };
}
