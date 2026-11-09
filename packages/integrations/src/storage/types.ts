export interface ObjectHead {
  size: number;
  contentType: string | null;
}

/** ADR-0007: chỉ dùng S3 API (RustFS / SeaweedFS / Garage / dịch vụ S3) */
export interface StorageProvider {
  readonly name: string;
  /** URL PUT có chữ ký; client upload thẳng, API không nhận file (security.md › Upload) */
  presignPut(key: string, contentType: string, size: number, ttlSec?: number): Promise<string>;
  presignGet(key: string, ttlSec?: number, downloadName?: string): Promise<string>;
  /** Kiểm lại kích thước + kiểu thật sau upload; không có → null */
  head(key: string): Promise<ObjectHead | null>;
  /** `bytes` byte đầu object (kiểm chữ ký tệp — D-117 B5); không có → null */
  readPrefix(key: string, bytes: number): Promise<Buffer | null>;
  put(key: string, body: Buffer | string, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  /** URL công khai (ảnh đại diện, ảnh bìa…) — qua Nginx / CDN */
  publicUrl(key: string): string;
  /** Đảm bảo bucket cho phép đọc công khai (anonymous GET) với các tiền tố chỉ định */
  ensurePublicPolicy?(prefixes: readonly string[]): Promise<void>;
}

export interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Gốc URL công khai cho `publicUrl`, vd `https://files.opchub.community` */
  publicBaseUrl: string;
}
