import { env } from '../env';
import { ADMIN_URL, PORTAL_URL } from '../urls';

/** Do not run the ordinary auto-enabled global seed against a real-provider worker. */
export default async function setup(): Promise<void> {
  if (env.E2E_TARGET !== 'server') throw new Error('Real provider E2E requires the native target');
  for (const url of [
    `${env.API_PROXY_URL}/v1/health`,
    `${ADMIN_URL}/login`,
    `${PORTAL_URL}/login`,
  ]) {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Native acceptance stack unavailable');
  }
}
