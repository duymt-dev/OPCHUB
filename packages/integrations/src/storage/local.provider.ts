import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, sep } from 'node:path';
import type { ObjectHead, StorageProvider } from './types';

export interface LocalStorageConfig {
  /** Thư mục gốc trên đĩa (ngoài repo), dùng chung cho api + worker */
  root: string;
  /** Gốc URL công khai, vd `http://localhost:3000/v1/uploads` */
  baseUrl: string;
  /** Khoá ký HMAC cho URL PUT/GET (giả lập presigned URL của S3) */
  signingKey: string;
}

const META_SUFFIX = '.meta.json';

/**
 * Chỉ dev/e2e (không có S3): object nằm trên đĩa, phục vụ qua `PUT|GET /v1/uploads/*`.
 * URL ký HMAC(key, exp, contentType) giống presigned S3 — server kiểm chữ ký trước khi ghi.
 */
export class LocalStorageProvider implements StorageProvider {
  readonly name = 'local';

  constructor(private readonly cfg: LocalStorageConfig) {}

  presignPut(key: string, contentType: string, size: number, ttlSec = 300): Promise<string> {
    return Promise.resolve(this.signedUrl(key, 'put', ttlSec, `${contentType}:${size}`));
  }

  presignGet(key: string, ttlSec = 300): Promise<string> {
    return Promise.resolve(this.signedUrl(key, 'get', ttlSec, ''));
  }

  async head(key: string): Promise<ObjectHead | null> {
    try {
      const st = await stat(this.pathOf(key));
      return { size: st.size, contentType: (await this.meta(key))?.contentType ?? null };
    } catch {
      return null;
    }
  }

  async put(key: string, body: Buffer | string, contentType: string): Promise<void> {
    const p = this.pathOf(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, body);
    await writeFile(`${p}${META_SUFFIX}`, JSON.stringify({ contentType }));
  }

  async read(key: string): Promise<{ body: Buffer; contentType: string } | null> {
    try {
      const body = await readFile(this.pathOf(key));
      return {
        body,
        contentType: (await this.meta(key))?.contentType ?? 'application/octet-stream',
      };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const p = this.pathOf(key);
    await rm(p, { force: true });
    await rm(`${p}${META_SUFFIX}`, { force: true });
  }

  publicUrl(key: string): string {
    return `${this.cfg.baseUrl}/${key}`;
  }

  /** Kiểm chữ ký URL PUT: đúng key, chưa hết hạn, đúng kiểu + kích thước đã ký */
  verifyPut(
    key: string,
    q: { exp?: string | undefined; sig?: string | undefined; ct?: string | undefined },
    size: number,
  ): boolean {
    if (!q.exp || !q.sig || !q.ct) return false;
    if (Number(q.exp) * 1000 < Date.now()) return false;
    const expected = this.sign(key, 'put', q.exp, `${q.ct}:${size}`);
    const a = Buffer.from(expected);
    const b = Buffer.from(q.sig);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private signedUrl(key: string, op: 'put' | 'get', ttlSec: number, extra: string): string {
    const exp = String(Math.floor(Date.now() / 1000) + ttlSec);
    const u = new URL(this.publicUrl(key));
    u.searchParams.set('exp', exp);
    u.searchParams.set('sig', this.sign(key, op, exp, extra));
    if (op === 'put') u.searchParams.set('ct', extra.split(':')[0] ?? '');
    return u.toString();
  }

  private sign(key: string, op: string, exp: string, extra: string): string {
    return createHmac('sha256', this.cfg.signingKey)
      .update(`${op}\n${key}\n${exp}\n${extra}`)
      .digest('base64url');
  }

  private pathOf(key: string): string {
    const p = normalize(join(this.cfg.root, key));
    if (!p.startsWith(normalize(this.cfg.root) + sep) || key.endsWith(META_SUFFIX)) {
      throw new Error('Khoá object không hợp lệ');
    }
    return p;
  }

  private async meta(key: string): Promise<{ contentType: string } | null> {
    try {
      const raw: unknown = JSON.parse(await readFile(`${this.pathOf(key)}${META_SUFFIX}`, 'utf8'));
      if (raw && typeof raw === 'object' && 'contentType' in raw) {
        const ct = raw.contentType;
        return typeof ct === 'string' ? { contentType: ct } : null;
      }
      return null;
    } catch {
      return null;
    }
  }
}
