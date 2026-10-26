import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { QUEUES } from '@opchub/shared/queues';
import { OutboxRelayService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { WorkerFactory } from '@/common/queue';
import { OnboardingRemindService, OnboardingService } from '@/modules/onboarding';

/**
 * V4-611 (D-85, D-88): sự kiện của các bước khởi đầu → tính lại `onboarding_progress` (bộ lọc Admin);
 * Admin nhắc → thông báo + email; sweep 03:10 bù phí hết hạn / tin ở phòng không mặc định.
 */
@Injectable()
export class OnboardingProcessor implements OnApplicationBootstrap {
  private readonly logger = new Logger(OnboardingProcessor.name);

  constructor(
    private readonly relay: OutboxRelayService,
    private readonly workers: WorkerFactory,
    private readonly prisma: PrismaService,
    private readonly onboarding: OnboardingService,
    private readonly remind: OnboardingRemindService,
  ) {}

  onApplicationBootstrap(): void {
    const touch = (userId: string) => this.onboarding.refresh([userId]);
    this.relay.register('onboarding.touched', (p) => touch(p.userId));
    this.relay.register('membership_fee.confirmed', (p) => touch(p.userId));
    this.relay.register('membership_fee.changed', (p) => touch(p.userId));
    this.relay.register('group.joined', (p) => touch(p.userId));
    this.relay.register('event.registered', (p) => touch(p.userId));
    this.relay.register('store.published', (p) => touch(p.ownerId));
    this.relay.register('chat.member_sent', (p) => this.onMessage(p.messageId));
    this.relay.register('onboarding.reminded', (p) => this.remind.deliver(p));
    this.workers.start(
      QUEUES.scheduler,
      {
        onboardingSweep: async () => {
          const n = await this.onboarding.sweep();
          this.logger.log({ members: n }, 'Khởi đầu: tính lại tiến độ');
        },
      },
      1,
    );
    void this.onboarding
      .backfillIfEmpty()
      .catch((e: unknown) => this.logger.error(e, 'Khởi đầu: backfill lỗi'));
  }

  private async onMessage(messageId: string): Promise<void> {
    const m = await this.prisma.db.message.findUnique({
      where: { id: messageId },
      select: { senderId: true },
    });
    if (m?.senderId) await this.onboarding.refresh([m.senderId]);
  }
}
