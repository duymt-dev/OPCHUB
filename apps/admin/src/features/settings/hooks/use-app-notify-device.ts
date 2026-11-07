'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pushSubscribeSchema } from '@opchub/shared/api-domains';
import { env } from '@/lib/env';
import { fetchDeviceConfig, registerDevice, unregisterDevice } from '../app-notify-api';

type State = 'loading' | 'unsupported' | 'ios' | 'denied' | 'off' | 'on';
async function worker() {
  if (env.NEXT_PUBLIC_API_MOCKING !== 'off') return null;
  // Production uses /admin; standalone native test deployments deliberately have no basePath.
  const prefix = window.location.pathname.startsWith('/admin/') ? '/admin' : '';
  const registration = await navigator.serviceWorker.register(`${prefix}/sw.js`, {
    scope: `${prefix}/`,
    updateViaCache: 'none',
  });
  await navigator.serviceWorker.ready;
  return registration;
}
function blocked(): State | null {
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios && !window.matchMedia('(display-mode: standalone)').matches) return 'ios';
  if (!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator))
    return 'unsupported';
  return Notification.permission === 'denied' ? 'denied' : null;
}
function key(value: string): Uint8Array<ArrayBuffer> {
  const encoded = value.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')), (c) =>
    c.charCodeAt(0),
  );
}

async function enableDevice(registration: ServiceWorkerRegistration, publicKey: string) {
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key(publicKey),
    }));
  await registerDevice(
    pushSubscribeSchema.parse({
      endpoint: subscription.endpoint,
      keys: subscription.toJSON().keys,
      userAgent: navigator.userAgent.slice(0, 300),
    }),
  );
}

export function useAppNotifyDevice() {
  const config = useQuery({ queryKey: ['push', 'config'], queryFn: fetchDeviceConfig });
  const [state, setState] = useState<State>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enabled = config.data?.enabled;
  useEffect(() => {
    let alive = true;
    void Promise.resolve()
      .then(async () => {
        if (!alive || !enabled) return;
        const unavailable = blocked();
        if (unavailable) {
          setState(unavailable);
          return;
        }
        const registration = await worker();
        if (!registration) {
          if (alive) setState('unsupported');
          return;
        }
        const subscription = await registration?.pushManager.getSubscription();
        if (alive) setState(subscription ? 'on' : 'off');
      })
      .catch(() => {
        if (alive) setState('unsupported');
      });
    return () => {
      alive = false;
    };
  }, [enabled]);
  const toggle = async () => {
    if (busy || !config.data?.enabled) return;
    setBusy(true);
    setError(null);
    try {
      const unavailable = blocked();
      if (unavailable) {
        setState(unavailable);
        return;
      }
      if (state !== 'on' && (await Notification.requestPermission()) !== 'granted') {
        setState(Notification.permission === 'denied' ? 'denied' : 'off');
        return;
      }
      const registration = await worker();
      if (!registration) {
        setState('unsupported');
        return;
      }
      if (state === 'on') {
        const current = await registration.pushManager.getSubscription();
        if (current) {
          await unregisterDevice(current.endpoint);
          await current.unsubscribe();
        }
        setState('off');
        return;
      }
      await enableDevice(registration, config.data.vapidPublicKey);
      setState('on');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể cập nhật thông báo');
    } finally {
      setBusy(false);
    }
  };
  return { state, busy, error, config, toggle };
}
