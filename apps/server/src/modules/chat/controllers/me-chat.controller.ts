import { Controller, Get } from '@nestjs/common';
import {
  type ChatOverview,
  type ChatUnread,
  chatOverviewSchema,
  chatUnreadSchema,
} from '@opchub/shared/api-domains';
import { type AccessClaims, CurrentUser } from '@/common/auth';
import { respond } from '@/common/http/zod';
import { ChatOverviewService } from '../services/chat-overview.service';

/** `GET /me/chat` — rail nhóm của màn Chat; `GET /me/chat/unread` — số chưa đọc */
@Controller('me/chat')
export class MeChatController {
  constructor(private readonly overview: ChatOverviewService) {}

  @Get()
  async get(@CurrentUser() user: AccessClaims): Promise<ChatOverview> {
    return respond(chatOverviewSchema, await this.overview.overview(user));
  }

  /** NA-25: số đỏ menu Chat nhóm / rail nhóm / danh sách chủ đề */
  @Get('unread')
  async unread(@CurrentUser() user: AccessClaims): Promise<ChatUnread> {
    return respond(chatUnreadSchema, await this.overview.unreadSummary(user.sub));
  }
}
