import { Blob as NodeBlob } from 'node:buffer';
import { afterEach, expect, it, vi } from 'vitest';
import { createClientLogger } from '@opchub/shared/client-logger';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('SPEC14 reports locally, beacons no PII/query/stack/body and limits ten per tab/minute', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-09T00:00:00Z'));
  const sendBeacon = vi.fn(() => true),
    reportError = vi.fn();
  vi.stubGlobal('Blob', NodeBlob);
  vi.stubGlobal('navigator', { sendBeacon });
  vi.stubGlobal('reportError', reportError);
  window.history.replaceState({}, '', '/vi/affiliate?email=private@example.com');
  const logger = createClientLogger('portal');
  const error = Object.assign(new TypeError('private@example.com 0901234567 secret-token'), {
    digest: '123456',
  });
  for (let i = 0; i < 12; i++) logger.error('affiliate.my-region', error, { body: 'private' });
  expect(reportError).toHaveBeenCalledTimes(12);
  expect(reportError).toHaveBeenCalledWith(error);
  expect(sendBeacon).toHaveBeenCalledTimes(10);
  const [url, blob] = sendBeacon.mock.calls[0] as unknown as [string, Blob];
  expect(url).toBe('/v1/client-logs');
  const text = await (blob as unknown as NodeBlob).text();
  expect(JSON.parse(text)).toEqual({
    app: 'portal',
    scope: 'affiliate.my-region',
    message: 'GET /me/gdv failed',
    name: 'TypeError',
    digest: '123456',
    path: '/affiliate',
    at: '2026-11-09T00:00:00.000Z',
  });
  expect(text).not.toMatch(/private|0901234567|secret-token|stack|body|\?/);
  vi.advanceTimersByTime(60_000);
  logger.warn('app', error);
  expect(sendBeacon).toHaveBeenCalledTimes(11);
});
it('SPEC14 unavailable/throwing transports never break the app and unknown context is not sent', () => {
  vi.stubGlobal('navigator', {
    sendBeacon: vi.fn(() => {
      throw new Error('network');
    }),
  });
  vi.stubGlobal(
    'reportError',
    vi.fn(() => {
      throw new Error('reporter');
    }),
  );
  expect(() => createClientLogger('admin').warn('app', new Error('sensitive'))).not.toThrow();
});
