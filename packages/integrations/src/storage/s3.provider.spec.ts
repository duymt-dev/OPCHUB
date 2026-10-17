import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { S3StorageProvider } from './s3.provider';

/* eslint-disable no-restricted-syntax -- test đọc env S3 local; thiếu thì bỏ qua */
const env = {
  endpoint: process.env.S3_ENDPOINT,
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  bucket: process.env.S3_TEST_BUCKET ?? 'opchub-test',
};
/* eslint-enable no-restricted-syntax */

const ready = Boolean(env.endpoint && env.accessKeyId && env.secretAccessKey);

describe.skipIf(!ready)('S3StorageProvider trên RustFS local (ADR-0007)', () => {
  const s3 = new S3StorageProvider({
    endpoint: env.endpoint ?? '',
    region: 'us-east-1',
    bucket: env.bucket,
    accessKeyId: env.accessKeyId ?? '',
    secretAccessKey: env.secretAccessKey ?? '',
    publicBaseUrl: `${env.endpoint ?? ''}/${env.bucket}`,
  });

  it('presign PUT → upload → head khớp kích thước + kiểu → delete', async () => {
    const key = `test/${randomUUID()}.png`;
    const body = Buffer.from('89504e470d0a1a0a', 'hex');
    const url = await s3.presignPut(key, 'image/png', body.length);
    const res = await fetch(url, {
      method: 'PUT',
      body,
      headers: { 'Content-Type': 'image/png', 'Content-Length': String(body.length) },
    });
    expect(res.status).toBe(200);
    expect(await s3.head(key)).toEqual({ size: body.length, contentType: 'image/png' });
    await s3.delete(key);
    expect(await s3.head(key)).toBeNull();
  });

  it('presign GET tải lại được nội dung', async () => {
    const key = `test/${randomUUID()}.csv`;
    await s3.put(key, 'a,b\n1,2\n', 'text/csv');
    const got = await fetch(await s3.presignGet(key, 60, 'export.csv'));
    expect(await got.text()).toBe('a,b\n1,2\n');
    await s3.delete(key);
  });
});
