import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  type NotificationList,
  notificationListSchema,
  type NotificationReadRequest,
  notificationReadResultSchema,
  notificationReadSchema,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import { type AccessClaims, AllowRealm, CurrentUser, SkipMembershipFee } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { NotificationService } from '../services/notification.service';

const listQuery = z.object({
  cursor: z.string().min(1).optional(),
  size: z.coerce.number().int().min(1).max(50).catch(20),
});

/** Hộp thư thông báo (Portal + Admin, D-29) — mọi người đăng nhập, không paywall */
@AllowRealm('member', 'admin')
@SkipMembershipFee()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  async list(
    @CurrentUser() user: AccessClaims,
    @ZodQuery(listQuery) q: z.infer<typeof listQuery>,
  ): Promise<NotificationList> {
    return respond(
      notificationListSchema,
      await this.notifications.list(user.sub, q.cursor, q.size),
    );
  }

  @Post('read')
  @HttpCode(200)
  async read(
    @CurrentUser() user: AccessClaims,
    @ZodBody(notificationReadSchema) body: NotificationReadRequest,
  ): Promise<{ unread: number }> {
    return respond(
      notificationReadResultSchema,
      await this.notifications.markRead(user.sub, body.ids),
    );
  }
}
