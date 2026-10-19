import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { AppSettingsService } from '@/modules/settings';
import { MediaBackfillService } from '@/modules/uploads';

/**
 * TD-014: chuyển ảnh data URL cũ sang storage một lần lúc worker khởi động — không chặn bootstrap.
 * Idempotent: lần sau không còn `LIKE 'data:%'` thì không ghi gì.
 */
@Injectable()
export class MediaBackfillProcessor implements OnApplicationBootstrap {
  private readonly logger = new Logger(MediaBackfillProcessor.name);

  constructor(
    private readonly backfill: MediaBackfillService,
    private readonly settings: AppSettingsService,
  ) {}

  onApplicationBootstrap(): void {
    void this.runOnce().catch((err: unknown) =>
      this.logger.error({ err }, 'Chuyển ảnh data URL sang storage thất bại'),
    );
  }

  async runOnce(): Promise<void> {
    const stats = await this.backfill.run();
    if (stats.logoChanged) await this.settings.invalidate('general');
  }
}
