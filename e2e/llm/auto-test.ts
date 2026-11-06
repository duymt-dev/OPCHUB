import { test as base } from '../server/test';
import { nativeReplyProvider } from './reply-provider-setup';
import { isolateNativeAutoTopics } from './auto-provider-setup';

export { expect } from '../server/test';

/** A configured local provider is a prerequisite, not a fake browser/API response. */
export const test = base.extend<{ nativeAutoProvider: void }>({
  nativeAutoProvider: [
    async ({ demoReset, page }, use) => {
      void demoReset;
      const provider = await nativeReplyProvider(page);
      try {
        await isolateNativeAutoTopics(page);
        await use();
      } finally {
        await provider.close();
      }
    },
    { auto: true },
  ],
});
