'use client';

import { useEffect, useRef } from 'react';
import type { AffiliateDetailParams } from '../types';

/** Reveal only within the horizontal tab strip; never scroll the page vertically. */
export function revealAffiliateTab(container: HTMLDivElement): void {
  const active = container.querySelector<HTMLElement>('[aria-selected="true"]');
  if (!active) return;
  const outer = container.getBoundingClientRect();
  const inner = active.getBoundingClientRect();
  if (inner.left < outer.left) container.scrollLeft += inner.left - outer.left;
  else if (inner.right > outer.right) container.scrollLeft += inner.right - outer.right;
}

export function useAffiliateTabVisibility(
  tab: AffiliateDetailParams['tab'],
  customers: number | undefined,
) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const reveal = () => revealAffiliateTab(container);
    reveal();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(reveal);
    observer?.observe(container);
    return () => observer?.disconnect();
  }, [tab, customers]);
  return ref;
}
