import { Controller, Get, Header, HttpCode, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  unsubscribeInfoSchema,
  unsubscribeResultSchema,
  type UnsubscribeRequest,
  unsubscribeSchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import type { z } from 'zod';
import { Public } from '@/common/auth';
import { respond, ZodQuery } from '@/common/http/zod';
import { UnsubscribeService } from '../services/unsubscribe.service';

type Info = z.infer<typeof unsubscribeInfoSchema>;
type Result = z.infer<typeof unsubscribeResultSchema>;

/**
 * BUG-036: trang công khai huỷ nhận thư chiến dịch (không cần đăng nhập), throttle 10/phút.
 * POST nhận token ở body (trang Portal) hoặc query (RFC 8058 one-click từ trình đọc thư) — V2Q-85.
 */
@Controller('public/unsubscribe')
export class UnsubscribeController {
  constructor(private readonly svc: UnsubscribeService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Get()
  @Header('Cache-Control', 'no-store')
  info(@ZodQuery(unsubscribeSchema) q: UnsubscribeRequest): Info {
    return respond(unsubscribeInfoSchema, this.svc.info(q.token));
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post()
  @HttpCode(200)
  async unsubscribe(@Req() req: Request): Promise<Result> {
    // Body JSON `{token}` (Portal) hoặc form `List-Unsubscribe=One-Click` + `?token=` (RFC 8058)
    const body: unknown = req.body;
    const fromBody =
      typeof body === 'object' && body !== null && 'token' in body ? body.token : undefined;
    const { token } = unsubscribeSchema.parse({ token: fromBody ?? req.query.token });
    return respond(unsubscribeResultSchema, await this.svc.unsubscribe(token));
  }
}
