import { Controller, Get, HttpCode, Inject, Put, Req, Res } from '@nestjs/common';
import { LocalStorageProvider, type StorageProvider } from '@opchub/integrations';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { CHAT_FILE_MAX_BYTES } from '@opchub/shared/api-domains';
import { Public, SkipMembershipFee } from '@/common/auth';
import { AppError, notFound } from '@/common/errors';
import { ZodQuery } from '@/common/http/zod';
import { STORAGE } from '@/common/integrations';
import { isPrivateKey } from './private-file-url.service';

/** Trần chung = tệp chat 10 MB; ảnh ≤ 5 MB đã chặn bằng chữ ký (kích thước ký sẵn) */
const MAX_BYTES = CHAT_FILE_MAX_BYTES;
const getQuerySchema = z.object({ exp: z.string().optional(), sig: z.string().optional() });
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
 * PUT kiểm chữ ký presigned (key + kiểu + kích thước + hạn) nên không cần Bearer; GET ảnh công khai như
 * bucket ảnh, tệp chat (`chat-*`) cần URL GET ký (D-117 B6). Provider khác (S3) → 404.
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
  async get(
    @Req() req: Request,
    @Res() res: Response,
    @ZodQuery(getQuerySchema) q: z.infer<typeof getQuerySchema>,
  ): Promise<void> {
    const key = keyOf(req);
    const store = this.local();
    // D-117 B6: tệp chat chỉ tải bằng URL ký do API cấp sau khi kiểm thành viên nhóm
    if (isPrivateKey(key) && !store.verifyGet(key, q)) throw notFound('Không có tệp');
    const obj = await store.read(key);
    if (!obj) throw notFound('Không có tệp');
    res.setHeader('Content-Type', obj.contentType);
    // Tệp chat (PDF, ZIP…) tải về, không hiển thị trong origin API (TIP-V2-111)
    if (key.startsWith('chat-file/')) res.setHeader('Content-Disposition', 'attachment');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Ảnh công khai như bucket: Admin (origin khác Portal) phải hiển thị được (helmet mặc định same-origin)
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(obj.body);
  }
}

/** Đọc thân thô (giới hạn như presign) — API JSON không nhận multipart */
async function readBody(req: Request): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req as AsyncIterable<Buffer | string>) {
    const b = typeof c === 'string' ? Buffer.from(c) : c;
    size += b.length;
    if (size > MAX_BYTES) throw new AppError('VALIDATION_ERROR', 'Tệp vượt 10 MB');
    chunks.push(b);
  }
  return Buffer.concat(chunks);
}
