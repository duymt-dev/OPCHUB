/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { MessageChannel, type MessagePort } from 'node:worker_threads';
import { afterEach, describe, expect, it } from 'vitest';

type WorkerMessage = {
  source: { id: string };
  data: string;
  waitUntil: (promise: Promise<void>) => void;
};
const ports: MessagePort[] = [];
afterEach(() => ports.splice(0).forEach((port) => port.close()));

function harness(app: 'admin' | 'portal') {
  const source = readFileSync(
    new URL(`../../../../../apps/${app}/public/mockServiceWorker.js`, import.meta.url),
    'utf8',
  );
  const listeners = new Map<string, (event: WorkerMessage) => void>();
  const notifications: unknown[] = [];
  const transferred: MessagePort[] = [];
  const client = {
    id: 'worker-lifetime-client',
    postMessage: (data: unknown, transfer: MessagePort[] = []) => {
      notifications.push(data);
      transferred.push(...transfer);
    },
  };
  class TrackedChannel extends MessageChannel {
    constructor() {
      super();
      ports.push(this.port1, this.port2);
    }
  }
  const context = {
    MessageChannel: TrackedChannel,
    addEventListener: (name: string, receive: (event: WorkerMessage) => void) =>
      listeners.set(name, receive),
    client,
    self: {
      clients: { get: () => Promise.resolve(client), matchAll: () => Promise.resolve([client]) },
      registration: { unregister: () => Promise.resolve(true) },
    },
  };
  runInNewContext(source, context);
  return {
    notifications,
    transferred,
    async notify(type: string) {
      let pending: Promise<void> | undefined;
      listeners.get('message')?.({
        source: { id: client.id },
        data: type,
        waitUntil: (promise) => {
          pending = promise;
        },
      });
      if (!pending) throw new Error('Worker message event did not register its lifetime');
      return Promise.race([
        pending.then(() => 'settled'),
        new Promise<string>((resolve) => setTimeout(() => resolve('pending'), 30)),
      ]);
    },
    rpc: () =>
      runInNewContext(
        'sendToClient(client, { type: "REQUEST", payload: {} })',
        context,
      ) as Promise<unknown>,
  };
}

for (const app of ['admin', 'portal'] as const) {
  describe(`UAT-15 P5-MSW-LIFECYCLE-01 ${app} generated worker event lifetime`, () => {
    it.each([
      ['MOCK_ACTIVATE', 'MOCKING_ENABLED'],
      ['KEEPALIVE_REQUEST', 'KEEPALIVE_RESPONSE'],
      ['INTEGRITY_CHECK_REQUEST', 'INTEGRITY_CHECK_RESPONSE'],
      ['CLIENT_CLOSE', 'CLIENT_CLOSED'],
    ])('%s settles without a notification acknowledgement', async (request, response) => {
      const worker = harness(app);
      expect(await worker.notify(request)).toBe('settled');
      expect(worker.notifications).toHaveLength(1);
      expect(worker.notifications[0]).toMatchObject({ type: response });
      expect(worker.transferred).toHaveLength(0);
    });

    it('keeps actual request RPC pending until its transferred port receives the response', async () => {
      const worker = harness(app);
      const pending = worker.rpc();
      expect(worker.notifications).toEqual([{ type: 'REQUEST', payload: {} }]);
      expect(worker.transferred).toHaveLength(1);
      expect(
        await Promise.race([
          pending.then(() => 'early'),
          new Promise<string>((resolve) => setTimeout(() => resolve('waiting'), 10)),
        ]),
      ).toBe('waiting');
      worker.transferred[0]?.postMessage({ type: 'MOCK_RESPONSE', data: { status: 200 } });
      await expect(pending).resolves.toEqual({ type: 'MOCK_RESPONSE', data: { status: 200 } });
    });
  });
}
