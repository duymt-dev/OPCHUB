import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { QUEUES } from '@opchub/shared/queues';
import { OutboxRelayService } from '@/common/outbox';
import { WorkerFactory } from '@/common/queue';
import { EventSchedulerService } from '@/modules/event';
import { EventMailHandler } from '@/modules/mail';
import { NotificationEventsHandler } from '@/modules/notification';

/**
 * Worker sự kiện (NA-23, REQ-223): `scheduler.eventsSweep` mỗi 15 phút đóng đăng ký khi đầy / đã kết
 * thúc và phát `event.reminder_due` 24h trước giờ bắt đầu → mail + thông báo theo lô.
 */
@Injectable()
export class EventProcessor implements OnApplicationBootstrap {
  private readonly logger = new Logger(EventProcessor.name);

  constructor(
    private readonly relay: OutboxRelayService,
    private readonly workers: WorkerFactory,
    private readonly scheduler: EventSchedulerService,
    private readonly mail: EventMailHandler,
    private readonly notify: NotificationEventsHandler,
  ) {}

  onApplicationBootstrap(): void {
    this.relay.register('event.reminder_due', (p) => this.mail.reminder(p));
    this.relay.register('event.reminder_due', (p) => this.notify.eventReminder(p));
    this.workers.start(
      QUEUES.scheduler,
      {
        eventsSweep: async () => {
          const r = await this.scheduler.sweep();
          if (r.closed || r.reminded) this.logger.log(r, 'Sự kiện: đóng đăng ký + nhắc 24h');
        },
      },
      1,
    );
  }
}
