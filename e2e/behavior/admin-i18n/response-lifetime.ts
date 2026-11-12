import type { Page, Request, Response, TestInfo } from '@playwright/test';

/** A destroyed document's discarded body cannot contribute text to the new UI. */
export function isDiscardedDocumentBody(
  error: unknown,
  requestEpoch: number | undefined,
  currentEpoch: number,
  sameLoader: boolean,
): boolean {
  return (
    error instanceof Error &&
    requestEpoch !== undefined &&
    currentEpoch > requestEpoch &&
    !sameLoader &&
    /^response\.(?:json|body): Protocol error \(Network\.getResponseBody\): No resource with given identifier found/.test(
      error.message,
    )
  );
}

/** Track actual top-frame loaders, never client-side RSC or hash navigation. */
export async function trackDocumentBodies(page: Page) {
  const requests = new WeakMap<Request, { epoch: number; loaderId: string }>();
  const discarded: { path: string; from: number; to: number }[] = [];
  const cdp = await page.context().newCDPSession(page);
  let epoch = 0;
  let loaderId = (await cdp.send('Page.getFrameTree')).frameTree.frame.loaderId;
  cdp.on('Page.frameNavigated', ({ frame }) => {
    if (!frame.parentId && frame.loaderId !== loaderId) {
      loaderId = frame.loaderId;
      epoch++;
    }
  });
  await cdp.send('Page.enable');
  page.on('request', (request) => requests.set(request, { epoch, loaderId }));
  return {
    discarded,
    detach: () => cdp.detach(),
    async json(response: Response): Promise<{ body: unknown } | undefined> {
      const document = requests.get(response.request());
      const from = document?.epoch;
      try {
        return { body: (await response.json()) as unknown };
      } catch (error: unknown) {
        if (!isDiscardedDocumentBody(error, from, epoch, document?.loaderId === loaderId))
          throw error;
        if (from === undefined) throw error;
        discarded.push({ path: new URL(response.url()).pathname, from, to: epoch });
        return undefined;
      }
    },
  };
}

export async function reportDiscardedBodies(
  info: TestInfo,
  discarded: { path: string; from: number; to: number }[],
): Promise<void> {
  if (!discarded.length) return;
  await info.attach('discarded-older-document-bodies-not-validated', {
    body: JSON.stringify(discarded),
    contentType: 'application/json',
  });
  process.stdout.write(`Document-lifetime observation: ${JSON.stringify(discarded)}\n`);
}
