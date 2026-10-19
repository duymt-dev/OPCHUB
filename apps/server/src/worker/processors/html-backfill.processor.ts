import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { HtmlBackfillService } from '@/common/html/html-backfill.service';

/**
 * TD-017: làm sạch HTML bẩn đã lưu (NA-27) một lần lúc worker khởi động — không chặn bootstrap.
 * Idempotent: lần sau không còn ô cần đổi thì không ghi gì.
 */
@Injectable()
export class HtmlBackfillProcessor implements OnApplicationBootstrap {
  private readonly logger = new Logger(HtmlBackfillProcessor.name);

  constructor(private readonly backfill: HtmlBackfillService) {}

  onApplicationBootstrap(): void {
    void this.backfill
      .run()
      .catch((err: unknown) => this.logger.error({ err }, 'Làm sạch HTML dữ liệu cũ thất bại'));
  }
}
