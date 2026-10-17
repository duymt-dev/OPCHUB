import { Injectable, Logger } from '@nestjs/common';
import {
  isOutboxEventType,
  parseOutboxPayload,
  type OutboxEventType,
  type OutboxPayload,
} from '@opchub/shared/outbox';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxRepository } from './outbox.repository';

export type OutboxHandler<T extends OutboxEventType> = (payload: OutboxPayload<T>) => Promise<void>;

/** Cảnh báo khi một sự kiện lỗi quá nhiều lần (Sentry ở B65) */
const ALERT_ATTEMPTS = 20;
const BATCH = 100;

/**
 * Relay outbox → BullMQ / Redis pub-sub. Chạy trong process worker (mỗi giây).
 * Mỗi lô: khoá `FOR UPDATE SKIP LOCKED`, gọi handler theo `type`, đánh dấu đã gửi / tăng `attempts`.
 */
@Injectable()
export class OutboxRelayService {
  private readonly logger = new Logger(OutboxRelayService.name);
  private readonly handlers = new Map<OutboxEventType, (p: unknown) => Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: OutboxRepository,
  ) {}

  /**
   * Đăng ký handler cho một loại sự kiện. Handler phải IDEMPOTENT: relay có thể gọi lại
   * cùng sự kiện nếu process chết giữa lúc gọi handler và lúc commit `dispatched_at`.
   */
  register<T extends OutboxEventType>(type: T, handler: OutboxHandler<T>): void {
    this.handlers.set(type, (raw) => handler(parseOutboxPayload(type, raw)));
  }

  /** Xử lý một lô; trả số sự kiện đã gửi */
  async relayOnce(): Promise<number> {
    return this.prisma.db.$transaction(async (tx) => {
      const events = await this.repo.lockPending(tx, BATCH);
      const ok: bigint[] = [];
      for (const e of events) {
        // Tuần tự theo id để giữ thứ tự sự kiện; mỗi handler chỉ đẩy queue/pub-sub (nhanh)
        const failed = await this.dispatch(e.type, e.payload);
        if (failed === null) ok.push(e.id);
        else {
          await this.repo.markFailed(tx, [e.id], failed);
          if (e.attempts + 1 >= ALERT_ATTEMPTS) {
            this.logger.error({ id: String(e.id), type: e.type }, 'Sự kiện outbox lỗi liên tục');
          }
        }
      }
      await this.repo.markDispatched(tx, ok);
      return ok.length;
    });
  }

  /** null = thành công, chuỗi = thông điệp lỗi */
  private async dispatch(type: string, payload: unknown): Promise<string | null> {
    const handler = isOutboxEventType(type) ? this.handlers.get(type) : undefined;
    if (!handler) {
      // Không để nghẽn hàng đợi vì loại chưa có consumer
      this.logger.warn({ type }, 'Sự kiện outbox chưa có handler — bỏ qua');
      return null;
    }
    try {
      await handler(payload);
      return null;
    } catch (err) {
      this.logger.warn({ err, type }, 'Handler outbox lỗi, sẽ thử lại');
      return err instanceof Error ? err.message : 'unknown';
    }
  }
}
