import type { ObjectHead, StorageProvider } from './types';

/** Test/dev offline: giữ object trong bộ nhớ (adapters.md — fake cho mọi dịch vụ ngoài) */
export class FakeStorageProvider implements StorageProvider {
  readonly name = 'fake';
  readonly objects = new Map<string, { body: Buffer; contentType: string }>();

  constructor(private readonly baseUrl = 'http://fake-storage.local') {}

  presignPut(key: string): Promise<string> {
    return Promise.resolve(`${this.baseUrl}/${key}?put=1`);
  }

  presignGet(key: string, ttlSec = 300): Promise<string> {
    return Promise.resolve(`${this.baseUrl}/${key}?ttl=${ttlSec}`);
  }

  head(key: string): Promise<ObjectHead | null> {
    const o = this.objects.get(key);
    return Promise.resolve(o ? { size: o.body.length, contentType: o.contentType } : null);
  }

  put(key: string, body: Buffer | string, contentType: string): Promise<void> {
    this.objects.set(key, { body: Buffer.isBuffer(body) ? body : Buffer.from(body), contentType });
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.objects.delete(key);
    return Promise.resolve();
  }

  publicUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }
}
