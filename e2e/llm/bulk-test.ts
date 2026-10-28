import { test as base, expect } from '../server/test';
import { env } from '../env';
import { startBulkStub } from './bulk-stub';
import { configureBulkProvider } from './bulk-provider-setup';

export { expect };

/** The scenario/assertions are identical; only the external-provider prerequisite differs. */
export const test = base.extend<{ nativeBulkProvider: void }>({
  nativeBulkProvider: [
    async ({ demoReset, request }, use) => {
      void demoReset;
      if (env.E2E_TARGET !== 'server') {
        await use();
        return;
      }
      const stub = await startBulkStub();
      let config: Awaited<ReturnType<typeof configureBulkProvider>> | undefined;
      try {
        config = await configureBulkProvider(request, stub.url);
        await use();
        expect(stub.requests).toHaveLength(2);
        expect(stub.requests.map((request) => request.variant)).toEqual([1, 2]);
        expect(stub.requests.every((request) => request.turns === 4)).toBe(true);
      } finally {
        try {
          await config?.disable();
        } finally {
          await stub.close();
        }
      }
    },
    { auto: true },
  ],
});
