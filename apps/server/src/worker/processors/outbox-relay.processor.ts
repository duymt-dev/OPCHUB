import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { OutboxRelayService } from '@/common/outbox';

const INTERVAL_MS = 1_000;

/**
 * Vòng relay outbox mỗi giây (queues-workers.md › outbox). Không chồng lần chạy;
 * hết lô đầy thì chạy tiếp ngay để xả backlog. Nhiều worker chạy song song an toàn (SKIP LOCKED).
 */
@Injectable()
export class OutboxRelayProcessor implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(OutboxRelayProcessor.name);
  private timer: NodeJS.Timeout | undefined;
  private running: Promise<void> | undefined;
  private stopped = false;

  constructor(private readonly relay: OutboxRelayService) {}

  onApplicationBootstrap(): void {
    this.schedule(0);
  }

  async onApplicationShutdown(): Promise<void> {
    this.stopped = true;
    clearTimeout(this.timer);
    await this.running;
  }

  private schedule(delay: number): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      this.running = this.tick();
    }, delay);
  }

  private async tick(): Promise<void> {
    let sent = 0;
    try {
      sent = await this.relay.relayOnce();
    } catch (err) {
      this.logger.error({ err }, 'Relay outbox lỗi');
    }
    this.schedule(sent > 0 ? 0 : INTERVAL_MS);
  }
}
