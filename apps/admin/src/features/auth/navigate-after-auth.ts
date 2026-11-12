import type { useRouter } from 'next/navigation';
import { KEEP_SCROLL, leaveAuth } from './keep-scroll';

type Router = Pick<ReturnType<typeof useRouter>, 'replace'>;

/** Setup is still Auth: retain the form scroll. Only app entry resets to the top. */
export function navigateAfterAdminAuth(
  router: Router,
  setup: '/first-password' | '/two-factor' | null,
  next: string,
): void {
  if (setup) router.replace(setup, KEEP_SCROLL);
  else leaveAuth(() => router.replace(next));
}
