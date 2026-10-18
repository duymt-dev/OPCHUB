import { Controller, Get, HttpCode, Inject, Put, Req, Res } from '@nestjs/common';
import { LocalStorageProvider, type StorageProvider } from '@opchub/integrations';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { Public, SkipMembershipFee } from '@/common/auth';
import { AppError, notFound } from '@/common/errors';
import { ZodQuery } from '@/common/http/zod';
import { STORAGE } from '@/common/integrations';

const MAX_BYTES = 5 * 1024 * 1024;
const putQuerySchema = z.object({
  exp: z.string().optional(),
  sig: z.string().optional(),
  ct: z.string().optional(),
});

/** Khoá object sau `/uploads/` (express 5: wildcard `*key` trả mảng đoạn) */
function keyOf(req: Request): string {
  const raw: unknown = (req.params as Record<string, unknown>).key;
  const parts: unknown[] = Array.isArray(raw) ? raw : [raw];
  const key = parts.filter((p): p is string => typeof p === 'string').join('/');
  if (!key || key.includes('..')) throw notFound();
  return key;
}

/**
 * `PUT|GET /uploads/*key` — chỉ khi STORAGE_PROVIDER=local (dev/e2e, Q-B61-2). Thay MinIO/S3:
 * PUT kiểm chữ ký presigned (key + kiểu + kích thước + hạn) nên không cần Bearer; GET công khai như
 * bucket ảnh. Provider khác (S3) → 404: client PUT thẳng vào S3.
 */
@Controller('uploads')
export class LocalUploadsController {
  constructor(@Inject(STORAGE) private readonly storage: StorageProvider) {}

  private local(): LocalStorageProvider {
    if (!(this.storage instanceof LocalStorageProvider)) throw notFound();
    return this.storage;
  }

  @Public()
  @SkipMembershipFee()
  @Put('*key')
  @HttpCode(200)
  async put(
    @Req() req: Request,
    @ZodQuery(putQuerySchema) q: z.infer<typeof putQuerySchema>,
  ): Promise<{ key: string }> {
    const store = this.local();
    const key = keyOf(req);
    const body = await readBody(req);
    if (!store.verifyPut(key, q, body.length)) {
      throw new AppError('FORBIDDEN', 'Chữ ký tải lên không hợp lệ hoặc đã hết hạn');
    }
    const ct = req.headers['content-type'] ?? '';
    if (ct !== q.ct) throw new AppError('VALIDATION_ERROR', 'Sai kiểu tệp đã ký');
    await store.put(key, body, ct);
    return { key };
  }

  @Public()
  @SkipMembershipFee()
  @Get('*key')
  async get(@Req() req: Request, @Res() res: Response): Promise<void> {
    const obj = await this.local().read(keyOf(req));
    if (!obj) throw notFound('Không có tệp');
    res.setHeader('Content-Type', obj.contentType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Ảnh công khai như bucket: Admin (origin khác Portal) phải hiển thị được (helmet mặc định same-origin)
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(obj.body);
  }
}

/** Đọc thân thô (giới hạn 5MB như presign) — API JSON không nhận multipart */
async function readBody(req: Request): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req as AsyncIterable<Buffer | string>) {
    const b = typeof c === 'string' ? Buffer.from(c) : c;
    size += b.length;
    if (size > MAX_BYTES) throw new AppError('VALIDATION_ERROR', 'Tệp vượt 5MB');
    chunks.push(b);
  }
  return Buffer.concat(chunks);
}
