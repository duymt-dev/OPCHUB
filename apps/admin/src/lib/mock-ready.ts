/**
 * Cầu nối giữa instrumentation-client (khởi động MSW) và MockProvider (chờ trước khi render).
 * Lưu trên globalThis vì instrumentation-client có thể nằm ở bundle khác.
 */
const KEY = '__opchubMockReady';

type Holder = { [KEY]?: Promise<void> };

export function setMockReady(p: Promise<void>) {
  (globalThis as Holder)[KEY] = p;
}

export function mockReady(): Promise<void> {
  return (globalThis as Holder)[KEY] ?? Promise.resolve();
}
