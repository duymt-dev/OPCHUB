import { captureMockAffiliateSnapshot, restoreMockAffiliateSnapshot } from './snapshot';
import { openMockAffiliateFrame } from './frame';
import {
  AFFILIATE_BRIDGE_CHANNEL,
  affiliateBridgeReplySchema,
  type AffiliateBridgeReply,
} from './protocol';
import { enableMockAffiliatePersistence, flushMockAffiliateWebhooks } from './webhooks';
import {
  captureCommunitySnapshot,
  restoreCommunitySnapshot,
} from '../community-persistence/snapshot';

function reply(port: MessagePort): Promise<AffiliateBridgeReply> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Mock Affiliate lease timed out')), 35_000);
    port.onmessage = (event: MessageEvent<unknown>) => {
      clearTimeout(timeout);
      const parsed = affiliateBridgeReplySchema.safeParse(event.data);
      if (!parsed.success || parsed.data.type === 'error')
        reject(new Error('Mock Affiliate storage unavailable'));
      else resolve(parsed.data);
    };
    port.start();
  });
}

/** Both app runtimes execute against one persisted ledger, never the native API. */
export function createMockAffiliateBridge(origin: string) {
  enableMockAffiliatePersistence();
  let frame: Promise<HTMLIFrameElement> | undefined;
  let queue: Promise<unknown> = Promise.resolve();
  const run = async <T>(task: () => Promise<T>): Promise<T> => {
    const target = new URL(origin).origin;
    if (new URL(target).hostname !== location.hostname)
      throw new Error('Mock relay must use the same host');
    frame ??= openMockAffiliateFrame(target).catch((error: unknown) => {
      frame = undefined;
      throw error;
    });
    const host = await frame;
    const channel = new MessageChannel();
    const first = reply(channel.port1);
    const fixture = document.cookie.split('; ').includes('opchub-mock-affiliate-demo=1')
      ? 'affiliate'
      : 'base';
    host.contentWindow?.postMessage(
      { channel: AFFILIATE_BRIDGE_CHANNEL, type: 'begin', fixture },
      target,
      [channel.port2],
    );
    let before: ReturnType<typeof captureMockAffiliateSnapshot> | undefined;
    let beforeCommunity: ReturnType<typeof captureCommunitySnapshot> | undefined;
    try {
      const initial = await first;
      if (initial.type !== 'state') throw new Error('Invalid mock lease');
      if (initial.snapshot) restoreMockAffiliateSnapshot(initial.snapshot);
      if (initial.communitySnapshot) restoreCommunitySnapshot(initial.communitySnapshot);
      before = captureMockAffiliateSnapshot();
      beforeCommunity = captureCommunitySnapshot();
      flushMockAffiliateWebhooks();
      const result = await task();
      const committed = reply(channel.port1);
      channel.port1.postMessage({
        type: 'commit',
        snapshot: captureMockAffiliateSnapshot(),
        communitySnapshot: captureCommunitySnapshot(),
      });
      if ((await committed).type !== 'committed') throw new Error('Mock state was not committed');
      return result;
    } catch (error: unknown) {
      channel.port1.postMessage({ type: 'abort' });
      if (before) restoreMockAffiliateSnapshot(before);
      if (beforeCommunity) restoreCommunitySnapshot(beforeCommunity);
      throw error;
    } finally {
      channel.port1.close();
    }
  };
  return <T>(task: () => Promise<T>): Promise<T> => {
    const next = queue.then(() => run(task));
    queue = next.catch(() => undefined);
    return next;
  };
}
