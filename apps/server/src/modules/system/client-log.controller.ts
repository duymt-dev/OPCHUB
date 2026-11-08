import { Controller, HttpCode, Logger, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { clientLogSchema, sanitizeClientLog, type ClientLog } from '@opchub/shared/api-domains';
import { AccessTokenService, AuthStateService, Public } from '@/common/auth';
import { ZodBody } from '@/common/http/zod';

@Controller('client-logs')
@Public()
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class ClientLogController {
  private readonly logger = new Logger(ClientLogController.name);
  constructor(
    private readonly tokens: AccessTokenService,
    private readonly state: AuthStateService,
  ) {}
  @Post()
  @HttpCode(204)
  async write(@ZodBody(clientLogSchema) body: ClientLog, @Req() req: Request): Promise<void> {
    let userId: string | undefined;
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      try {
        const claims = await this.tokens.verify(header.slice(7).trim());
        const [locked, version] = await Promise.all([
          this.state.isLocked(claims.sub, claims.realm),
          this.state.permVersion(claims.sub, claims.realm),
        ]);
        if (!locked && (version === null || version <= claims.permVersion)) userId = claims.sub;
      } catch {
        /* Public beacon remains anonymous for missing/invalid/revoked sessions. */
      }
    }
    this.logger.warn({
      label: 'client',
      ...sanitizeClientLog(body),
      ...(userId ? { userId } : {}),
    });
  }
}
