import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { QUEUES } from '@opchub/shared/queues';
import { WorkerFactory } from '@/common/queue';
import { AccountLockService } from '@/modules/account';

/** Job `scheduler.moderationUnlock` (V4-612, §26.6): mỗi 5 phút mở khoá TK hết hạn khoá */
@Injectable()
export class AccountLockProcessor implements OnApplicationBootstrap {
  private readonly logger = new Logger(AccountLockProcessor.name);

  constructor(
    private readonly workers: WorkerFactory,
    private readonly locks: AccountLockService,
  ) {}

  onApplicationBootstrap(): void {
    this.workers.start(
      QUEUES.scheduler,
      {
        moderationUnlock: async () => {
          const n = await this.locks.sweepExpired();
          if (n) this.logger.log({ unlocked: n }, 'Kiểm duyệt: tự mở khoá hết hạn');
        },
      },
      1,
    );
  }
}
