import { Module } from '@nestjs/common';
import { PushController } from './controllers/push.controller';
import { PushSubscriptionRepository } from './repositories/push-subscription.repository';
import { PushDeliveryRepository } from './repositories/push-delivery.repository';
import { PushSubscriptionService } from './services/push-subscription.service';
import { PushDispatchService } from './services/push-dispatch.service';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationRepository } from './repositories/notification.repository';
import { FundraisingNotifyHandler } from './services/fundraising-notify.handler';
import { NotificationEventsHandler } from './services/notification-events.handler';
import { NotificationService } from './services/notification.service';

const services = [
  PushSubscriptionRepository,
  PushDeliveryRepository,
  PushSubscriptionService,
  PushDispatchService,
  NotificationRepository,
  NotificationService,
  NotificationEventsHandler,
  FundraisingNotifyHandler,
];

/** Thông báo cá nhân (S-04, D-29) — api (hộp thư) + worker (consumer outbox) */
@Module({ providers: services, exports: services })
export class NotificationCoreModule {}

@Module({
  imports: [NotificationCoreModule],
  controllers: [NotificationsController, PushController],
})
export class NotificationHttpModule {}
