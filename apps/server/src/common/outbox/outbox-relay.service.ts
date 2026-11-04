import { Injectable, Logger } from '@nestjs/common';
import {
  outboxEvents,
  parseOutboxPayload,
  type OutboxEventType,
  type OutboxPayload,
} from '@opchub/shared/outbox';
import { backoffSec } from './backoff';
import { OutboxRepository, type PendingEvent } from './outbox.repository';

export type OutboxHandler<T extends OutboxEventType> = (payload: OutboxPayload<T>) => Promise<void>;

/** Cảnh báo khi một sự kiện lỗi quá nhiều lần (Sentry ở B65) */
const ALERT_ATTEMPTS = 20;
const BATCH = 100;
/** Lease khi nhận lô; handler chạy lâu hơn thì relay khác có thể nhận lại → handler phải idempotent */
const LEASE_SEC = 60;

/**
 * Relay outbox → BullMQ / Redis pub-sub. Chạy trong process worker (mỗi giây).
 * Mỗi lô: nhận bằng lease (câu lệnh autocommit), gọi handler NGOÀI transaction theo thứ tự id,
 * đánh dấu đã gửi cả lô bằng một câu; lỗi → backoff. Loại chưa có handler giữ nguyên chờ replay.
 */
@Injectable()
export class OutboxRelayService {
  private readonly logger = new Logger(OutboxRelayService.name);
  private readonly handlers = new Map<
    OutboxEventType,
    ((p: unknown, id: string) => Promise<void>)[]
  >();
  private reported = false;

  constructor(private readonly repo: OutboxRepository) {}

  /**
   * Đăng ký handler cho một loại sự kiện. Handler phải IDEMPOTENT: relay có thể gọi lại
   * cùng sự kiện nếu process chết trước khi đánh dấu, hoặc handler chạy quá lease 60 giây.
   */
  register<T extends OutboxEventType>(type: T, handler: OutboxHandler<T>): void {
    // Nhiều consumer cho cùng loại (vd phí → Redis + thông báo); chạy tuần tự theo thứ tự đăng ký
    const list = this.handlers.get(type) ?? [];
    list.push((raw) => handler(parseOutboxPayload(type, raw)));
    this.handlers.set(type, list);
  }

  /** Bỏ mọi handler của một loại (test dựng lại consumer) */
  unregister(type: OutboxEventType): void {
    this.handlers.delete(type);
  }

  /** Consumers with durable side effects key their deduplication to the persisted outbox ID. */
  registerWithId<T extends OutboxEventType>(
    type: T,
    handler: (payload: OutboxPayload<T>, id: string) => Promise<void>,
  ): void {
    const list = this.handlers.get(type) ?? [];
    list.push((raw, id) => handler(parseOutboxPayload(type, raw), id));
    this.handlers.set(type, list);
  }

  /** Loại sự kiện đã có ít nhất một handler trong process này */
  registeredTypes(): OutboxEventType[] {
    return [...this.handlers.keys()];
  }

  /** Ghi lỗi một lần mỗi process cho loại khai báo trong `events.ts` mà chưa có consumer (M1) */
  reportUnconsumed(): OutboxEventType[] {
    const known = new Set(this.registeredTypes());
    const missing = (Object.keys(outboxEvents) as OutboxEventType[]).filter((t) => !known.has(t));
    if (missing.length && !this.reported) {
      this.logger.error(
        { types: missing },
        'Loại sự kiện outbox chưa có consumer — giữ chờ replay',
      );
    }
    this.reported = true;
    return missing;
  }

  /** Xử lý một lô; trả số sự kiện đã gửi */
  async relayOnce(): Promise<number> {
    const events = await this.repo.claim(this.registeredTypes(), BATCH, LEASE_SEC);
    const ok: bigint[] = [];
    for (const e of events) {
      // Tuần tự theo id để giữ thứ tự sự kiện; mỗi handler chỉ đẩy queue/pub-sub (nhanh)
      const error = await this.dispatch(e);
      if (error === null) ok.push(e.id);
      else await this.fail(e, error);
    }
    await this.repo.markDispatched(ok);
    return ok.length;
  }

  private async fail(e: PendingEvent, error: string): Promise<void> {
    await this.repo.markFailed(e.id, error, backoffSec(e.attempts + 1));
    if (e.attempts + 1 >= ALERT_ATTEMPTS) {
      this.logger.error({ id: String(e.id), type: e.type }, 'Sự kiện outbox lỗi liên tục');
    }
  }

  /** null = thành công, chuỗi = thông điệp lỗi */
  private async dispatch(e: PendingEvent): Promise<string | null> {
    const list = this.handlers.get(e.type as OutboxEventType) ?? [];
    try {
      for (const handler of list) await handler(e.payload, String(e.id));
      return null;
    } catch (err) {
      this.logger.warn({ err, type: e.type }, 'Handler outbox lỗi, sẽ thử lại');
      return err instanceof Error ? err.message : 'unknown';
    }
  }
}
