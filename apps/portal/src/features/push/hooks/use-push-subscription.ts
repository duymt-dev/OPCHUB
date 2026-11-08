'use client';
import { useCallback, useEffect, useState } from 'react';
import { pushSubscribeSchema } from '@opchub/shared/api-domains';
import { subscribePush, unsubscribePush } from '../push-api';
import { applicationServerKey, registerPushWorker } from '../register-sw';

export type DeviceState = 'loading' | 'unsupported' | 'ios' | 'denied' | 'off' | 'on';
function unavailable(): DeviceState | null {
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios && !window.matchMedia('(display-mode: standalone)').matches) return 'ios';
  if (!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator))
    return 'unsupported';
  return Notification.permission === 'denied' ? 'denied' : null;
}

export function usePushSubscription(publicKey: string) {
  const [state, setState] = useState<DeviceState>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    const blocked = unavailable();
    if (blocked) {
      setState(blocked);
      return;
    }
    const registration = await registerPushWorker();
    if (!registration) {
      setState('unsupported');
      return;
    }
    setState((await registration.pushManager.getSubscription()) ? 'on' : 'off');
  }, []);
  useEffect(() => {
    let alive = true;
    void Promise.resolve()
      .then(() => {
        if (alive) return refresh();
      })
      .catch(() => {
        if (alive) setState('unsupported');
      });
    return () => {
      alive = false;
    };
  }, [refresh]);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const blocked = unavailable();
      if (blocked) {
        setState(blocked);
        return;
      }
      // requestPermission stays in the click gesture (especially Safari).
      if (state !== 'on' && (await Notification.requestPermission()) !== 'granted') {
        setState(Notification.permission === 'denied' ? 'denied' : 'off');
        return;
      }
      const registration = await registerPushWorker();
      if (!registration) {
        setState('unsupported');
        return;
      }
      if (state === 'on') {
        const current = await registration.pushManager.getSubscription();
        if (current) {
          await unsubscribePush(current.endpoint);
          await current.unsubscribe();
        }
        setState('off');
        return;
      }
      const current =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey(publicKey),
        }));
      await subscribePush(
        pushSubscribeSchema.parse({
          endpoint: current.endpoint,
          keys: current.toJSON().keys,
          userAgent: navigator.userAgent.slice(0, 300),
        }),
      );
      setState('on');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể cập nhật thông báo');
    } finally {
      setBusy(false);
    }
  };
  return { state, busy, error, toggle };
}
