/** Serialize rotating httpOnly-cookie requests across Admin tabs, without sharing tokens. */
export async function withAdminRefreshLock(refresh: () => Promise<boolean>): Promise<boolean> {
  try {
    const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
    return locks ? await locks.request('opchub:admin:refresh', refresh) : await refresh();
  } catch {
    return false;
  }
}
