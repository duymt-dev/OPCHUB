import { env } from '@/lib/env';

/** Never compete with mockServiceWorker.js for the root scope. */
export async function registerPushWorker(): Promise<ServiceWorkerRegistration | null> {
  if (env.NEXT_PUBLIC_API_MOCKING !== 'off' || !('serviceWorker' in navigator)) return null;
  const registration = await navigator.serviceWorker.register('/sw.js', {
    scope: '/',
    updateViaCache: 'none',
  });
  await navigator.serviceWorker.ready;
  return registration;
}
export function applicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const encoded = value.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '='));
  return Uint8Array.from(bytes, (c) => c.charCodeAt(0));
}
