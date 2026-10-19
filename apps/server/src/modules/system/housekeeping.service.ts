import { Injectable, Logger } from '@nestjs/common';
import { RefreshTokenRepository } from '@/modules/account';
import { AdminRefreshTokenRepository } from '@/modules/admin-account';
import { PersonaMessageService } from '@/modules/chat';
import { ExportService } from '@/modules/export';
import { MediaGcService } from '@/modules/uploads';

/** Token hết hạn / thu hồi giữ thêm 7 ngày (tra cứu sự cố) rồi xoá */
const TOKEN_KEEP_MS = 7 * 86_400_000;

export type HousekeepingStep = 'tokens' | 'adminTokens' | 'exports' | 'simulated' | 'media';
export type HousekeepingReport = Partial<Record<HousekeepingStep, number>>;

/**
 * NA-13 — job 02:00 VN. Điều phối, mỗi domain tự dọn bảng của mình; mỗi bước độc lập (lỗi một bước
 * ghi log, chạy tiếp, cuối cùng ném để BullMQ giữ job failed). KHÔNG bao giờ đụng `audit_logs`
 * (BR-13, ≥ 12 tháng, trigger chặn UPDATE/DELETE). Chạy lại idempotent.
 */
@Injectable()
export class HousekeepingService {
  private readonly logger = new Logger(HousekeepingService.name);

  constructor(
    private readonly tokens: RefreshTokenRepository,
    private readonly adminTokens: AdminRefreshTokenRepository,
    private readonly exports: ExportService,
    private readonly personas: PersonaMessageService,
    private readonly media: MediaGcService,
  ) {}

  async run(now = new Date()): Promise<HousekeepingReport> {
    const before = new Date(now.getTime() - TOKEN_KEEP_MS);
    const steps: [HousekeepingStep, () => Promise<number>][] = [
      ['tokens', () => this.tokens.purgeExpired(before)],
      ['adminTokens', () => this.adminTokens.purgeExpired(before)],
      ['exports', () => this.exports.purgeExpired(now)],
      ['simulated', () => this.personas.pruneSimulated()],
      ['media', () => this.media.sweep(now)],
    ];
    const report: HousekeepingReport = {};
    const failed: HousekeepingStep[] = [];
    for (const [name, step] of steps) {
      try {
        report[name] = await step();
      } catch (err) {
        failed.push(name);
        this.logger.error({ err, step: name }, 'Bước dọn dữ liệu lỗi');
      }
    }
    this.logger.log({ report }, 'Dọn dữ liệu 02:00 xong');
    if (failed.length) throw new Error(`Housekeeping lỗi: ${failed.join(', ')}`);
    return report;
  }
}
