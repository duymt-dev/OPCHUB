import { AFFILIATE_BRIDGE_CHANNEL, affiliateBridgeHelloSchema } from './protocol';

export function openMockAffiliateFrame(origin: string): Promise<HTMLIFrameElement> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.hidden = true;
    frame.title = 'MSW Affiliate state relay';
    frame.referrerPolicy = 'origin';
    frame.src = `${origin}/mock-affiliate-state`;
    const finish = (error?: Error) => {
      clearInterval(poll);
      clearTimeout(timeout);
      window.removeEventListener('message', receive);
      if (error) {
        frame.remove();
        reject(error);
      } else resolve(frame);
    };
    const receive = (event: MessageEvent<unknown>) => {
      if (event.source !== frame.contentWindow || event.origin !== origin) return;
      const hello = affiliateBridgeHelloSchema.safeParse(event.data);
      if (hello.success && hello.data.type === 'ready') finish();
    };
    const ping = () =>
      frame.contentWindow?.postMessage(
        { channel: AFFILIATE_BRIDGE_CHANNEL, type: 'ping', fixture: 'base' },
        origin,
      );
    const poll = setInterval(ping, 100);
    const timeout = setTimeout(() => finish(new Error('Mock Affiliate relay unavailable')), 10_000);
    window.addEventListener('message', receive);
    document.body.append(frame);
    ping();
  });
}
