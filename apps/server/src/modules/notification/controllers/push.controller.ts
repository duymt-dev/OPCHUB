import { Controller, Delete, Get, Post, Put } from '@nestjs/common';
import {
  pushPublicConfigSchema,
  pushPreferencesSchema,
  pushSubscribeSchema,
  pushUnsubscribeSchema,
  pushMutationResultSchema,
  type PushPreferences,
  type PushSubscribe,
} from '@opchub/shared/api-domains';
import { type AccessClaims, AllowRealm, CurrentUser, SkipMembershipFee } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import { PushSubscriptionService } from '../services/push-subscription.service';

@AllowRealm('member', 'admin')
@SkipMembershipFee()
@Controller('push')
export class PushController {
  constructor(private readonly push: PushSubscriptionService) {}
  @Get('config')
  async config() {
    return respond(pushPublicConfigSchema, await this.push.config());
  }
  @Post('subscriptions')
  async subscribe(
    @CurrentUser() user: AccessClaims,
    @ZodBody(pushSubscribeSchema) body: PushSubscribe,
  ) {
    return respond(pushMutationResultSchema, await this.push.subscribe(user.realm, user.sub, body));
  }
  @Delete('subscriptions')
  async remove(
    @CurrentUser() user: AccessClaims,
    @ZodBody(pushUnsubscribeSchema) body: { endpoint: string },
  ) {
    return respond(
      pushMutationResultSchema,
      await this.push.remove(user.realm, user.sub, body.endpoint),
    );
  }
  @Get('preferences')
  async preferences(@CurrentUser() user: AccessClaims) {
    return respond(pushPreferencesSchema, await this.push.preferences(user.realm, user.sub));
  }
  @Put('preferences')
  async savePreferences(
    @CurrentUser() user: AccessClaims,
    @ZodBody(pushPreferencesSchema) body: PushPreferences,
  ) {
    return respond(
      pushPreferencesSchema,
      await this.push.savePreferences(user.realm, user.sub, body),
    );
  }
}
