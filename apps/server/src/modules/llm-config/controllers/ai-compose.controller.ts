import { Controller, Get, Post, HttpCode } from '@nestjs/common';
import {
  aiComposeSchema,
  aiComposeResponseSchema,
  aiComposeConfigSchema,
  type AiCompose,
} from '@opchub/shared/api-domains';
import { CurrentUser, RequireAdmin, SkipMembershipFee, type AccessClaims } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import { AiComposeService } from '../services/ai-compose.service';

@Controller('ai')
export class AiComposeController {
  constructor(private readonly service: AiComposeService) {}
  @Get('config')
  @SkipMembershipFee()
  async config() {
    return respond(aiComposeConfigSchema, await this.service.config());
  }
  @Post('compose')
  @HttpCode(200)
  async compose(@CurrentUser() user: AccessClaims, @ZodBody(aiComposeSchema) body: AiCompose) {
    return respond(
      aiComposeResponseSchema,
      await this.service.compose({ realm: 'member', id: user.sub }, body),
    );
  }
}
@Controller('admin/ai')
@RequireAdmin('settings.mail')
export class AdminAiComposeController {
  constructor(private readonly service: AiComposeService) {}
  @Get('config')
  async config() {
    return respond(aiComposeConfigSchema, await this.service.config());
  }
  @Post('compose')
  @HttpCode(200)
  async compose(@CurrentUser() user: AccessClaims, @ZodBody(aiComposeSchema) body: AiCompose) {
    return respond(
      aiComposeResponseSchema,
      await this.service.compose({ realm: 'admin', id: user.sub }, body),
    );
  }
}
