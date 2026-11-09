'use client';
import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { env } from '@/lib/env';
import { refreshSession } from '@/lib/session';

/** Analytics is noncritical. Never persists identity/IP, never runs under browser automation. */
export function GuestViewBeacon({ slug }: { slug: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (navigator.webdriver || sent.current) return;
    sent.current = true;
    const send = async () => {
      // A new preview tab has no in-memory token. Reuse the existing single-flight,
      // httpOnly refresh flow; never forward session cookies during anonymous SSR.
      if (!useAuthStore.getState().accessToken) await refreshSession();
      const token = useAuthStore.getState().accessToken;
      const url = `${env.NEXT_PUBLIC_API_URL}/public/stores/${encodeURIComponent(slug)}/view`;
      const body = new Blob(['{}'], { type: 'application/json' });
      // sendBeacon cannot attach a bearer token; authenticated viewers use keepalive instead.
      if (!token && navigator.sendBeacon?.(url, body)) return;
      await fetch(url, {
        method: 'POST',
        body,
        keepalive: true,
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    };
    void send().catch(() => undefined);
  }, [slug]);
  return null;
}
