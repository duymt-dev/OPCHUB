import { Module } from '@nestjs/common';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationEventsHandler } from './services/notification-events.handler';
import { NotificationService } from './services/notification.service';

const services = [NotificationRepository, NotificationService, NotificationEventsHandler];

/** Thông báo cá nhân (S-04, D-29) — api (hộp thư) + worker (consumer outbox) */
@Module({ providers: services, exports: services })
export class NotificationCoreModule {}

@Module({ imports: [NotificationCoreModule], controllers: [NotificationsController] })
export class NotificationHttpModule {}
