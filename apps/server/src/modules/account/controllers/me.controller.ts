import { Controller, Get } from '@nestjs/common';
import { type Me, meSchema } from '@opchub/shared/api';
import { type AccessClaims, CurrentUser, SkipMembershipFee } from '@/common/auth';
import { respond } from '@/common/http/zod';
import { MeService } from '../services/me.service';

/**
 * SRS §13 `GET /me`. B06 trả `meSchema`; B13 mở rộng thành `profileSchema`
 * (extends meSchema — tương thích ngược).
 */
@Controller('me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @SkipMembershipFee()
  @Get()
  async me(@CurrentUser() user: AccessClaims): Promise<Me> {
    return respond(meSchema, await this.meService.me(user.sub));
  }
}
