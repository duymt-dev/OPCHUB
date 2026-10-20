import type { Prisma } from '@opchub/db';
import { BOT_CONTROL_KEY } from '@/modules/bot/services/bot-control-fence.service';
import { AppSettingsService } from '@/modules/settings';
import type { TestApp } from '../setup/test-app';

/** Emergency stop is global: restore pre-existing test threads in one bulk statement. */
export class EmergencyFixture {
  private baseline: { id: string; status: string; nextAt: Date | null; updatedAt: Date }[] = [];
  private control: Prisma.InputJsonValue | null = null;
  private outboxStart = 0n;
  constructor(private readonly t: TestApp) {}

  async start() {
    this.baseline = await this.t.prisma.db.botThread.findMany({
      where: { status: { in: ['scheduled', 'running'] } },
      select: { id: true, status: true, nextAt: true, updatedAt: true },
    });
    const row = await this.t.prisma.db.appSetting.findUnique({ where: { key: BOT_CONTROL_KEY } });
    this.control = row?.value as Prisma.InputJsonValue | null;
    const event = await this.t.prisma.db.outboxEvent.findFirst({ orderBy: { id: 'desc' } });
    this.outboxStart = event?.id ?? 0n;
  }

  async close() {
    await this.t.prisma.db.$executeRaw`
      UPDATE bot_threads t SET status = b.status::bot_thread_status, next_at = b.next_at, updated_at = b.updated_at
      FROM jsonb_to_recordset(${JSON.stringify(
        this.baseline.map((r) => ({
          id: r.id,
          status: r.status,
          next_at: r.nextAt,
          updated_at: r.updatedAt,
        })),
      )}::jsonb) AS b(id text, status text, next_at timestamptz, updated_at timestamptz)
      WHERE t.id = b.id`;
    if (this.control) {
      await this.t.prisma.db.appSetting.upsert({
        where: { key: BOT_CONTROL_KEY },
        create: { key: BOT_CONTROL_KEY, value: this.control },
        update: { value: this.control },
      });
    } else await this.t.prisma.db.appSetting.deleteMany({ where: { key: BOT_CONTROL_KEY } });
    await this.t.prisma.db.outboxEvent.deleteMany({
      where: { type: 'bot.emergency_stopped', id: { gt: this.outboxStart } },
    });
    await this.t.app.get(AppSettingsService).invalidate('bot');
  }
}
