import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IntegrationError } from '../errors';
import type { ObjectHead, S3Config, StorageProvider } from './types';

/** S3 path-style (RustFS local + VPS, ADR-0007) */
export class S3StorageProvider implements StorageProvider {
  readonly name = 's3';
  private readonly client: S3Client;

  constructor(private readonly cfg: S3Config) {
    this.client = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      forcePathStyle: true,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    });
  }

  presignPut(key: string, contentType: string, size: number, ttlSec = 300): Promise<string> {
    const cmd = new PutObjectCommand({
      Bucket: this.cfg.bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    });
    return this.wrap(() => getSignedUrl(this.client, cmd, { expiresIn: ttlSec }));
  }

  presignGet(key: string, ttlSec = 300, downloadName?: string): Promise<string> {
    const cmd = new GetObjectCommand({
      Bucket: this.cfg.bucket,
      Key: key,
      ...(downloadName
        ? {
            ResponseContentDisposition: `attachment; filename="${encodeURIComponent(downloadName)}"`,
          }
        : {}),
    });
    return this.wrap(() => getSignedUrl(this.client, cmd, { expiresIn: ttlSec }));
  }

  async head(key: string): Promise<ObjectHead | null> {
    try {
      const r = await this.client.send(
        new HeadObjectCommand({ Bucket: this.cfg.bucket, Key: key }),
      );
      return { size: r.ContentLength ?? 0, contentType: r.ContentType ?? null };
    } catch (err) {
      if (err instanceof NotFound || (err as { name?: string }).name === 'NotFound') return null;
      throw new IntegrationError(this.name, 'Không đọc được object', true, { cause: err });
    }
  }

  async readPrefix(key: string, bytes: number): Promise<Buffer | null> {
    try {
      const r = await this.client.send(
        new GetObjectCommand({ Bucket: this.cfg.bucket, Key: key, Range: `bytes=0-${bytes - 1}` }),
      );
      const body = r.Body ? await r.Body.transformToByteArray() : null;
      return body ? Buffer.from(body) : null;
    } catch (err) {
      const name = (err as { name?: string }).name;
      if (err instanceof NotFound || name === 'NotFound' || name === 'NoSuchKey') return null;
      throw new IntegrationError(this.name, 'Không đọc được object', true, { cause: err });
    }
  }

  async put(key: string, body: Buffer | string, contentType: string): Promise<void> {
    await this.wrap(() =>
      this.client.send(
        new PutObjectCommand({
          Bucket: this.cfg.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      ),
    );
  }

  async delete(key: string): Promise<void> {
    await this.wrap(() =>
      this.client.send(new DeleteObjectCommand({ Bucket: this.cfg.bucket, Key: key })),
    );
  }

  publicUrl(key: string): string {
    return `${this.cfg.publicBaseUrl.replace(/\/$/, '')}/${key}`;
  }

  async ensurePublicPolicy(prefixes: readonly string[]): Promise<void> {
    if (!prefixes.length) return;
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicMediaRead',
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: prefixes.map(
            (p) => `arn:aws:s3:::${this.cfg.bucket}/${p.replace(/^\/|\/$/g, '')}/*`,
          ),
        },
      ],
    };
    try {
      await this.client.send(
        new PutBucketPolicyCommand({
          Bucket: this.cfg.bucket,
          Policy: JSON.stringify(policy),
        }),
      );
    } catch {
      // Bỏ qua nếu S3 provider không hỗ trợ policy hoặc quyền IAM bị hạn chế
    }
  }

  private async wrap<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      throw new IntegrationError(this.name, 'Lỗi storage', true, { cause: err });
    }
  }
}
