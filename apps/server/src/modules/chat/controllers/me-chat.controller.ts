import { Controller, Get } from '@nestjs/common';
import { type ChatOverview, chatOverviewSchema } from '@opchub/shared/api-domains';
import { type AccessClaims, CurrentUser } from '@/common/auth';
import { respond } from '@/common/http/zod';
import { ChatOverviewService } from '../services/chat-overview.service';

/** `GET /me/chat` — rail nhóm của màn Chat */
@Controller('me/chat')
export class MeChatController {
  constructor(private readonly overview: ChatOverviewService) {}

  @Get()
  async get(@CurrentUser() user: AccessClaims): Promise<ChatOverview> {
    return respond(chatOverviewSchema, await this.overview.overview(user));
  }
}
