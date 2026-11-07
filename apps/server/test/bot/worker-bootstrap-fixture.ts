import { BotProcessor } from '@/worker/processors/bot.processor';
import { BotPublicationProcessor } from '@/worker/processors/bot-publication.processor';
import { ModerationProcessor } from '@/worker/processors/moderation.processor';
import type { TestApp } from '../setup/test-app';

// Nest must not start real consumers before this fixture clears its test Redis.
// Only bootstrap timing is deferred; every handler and worker remains production code.
class FixtureBotProcessor extends BotProcessor {
  override onApplicationBootstrap(): void {
    /* Started after fixture reset. */
  }
}
class FixturePublicationProcessor extends BotPublicationProcessor {
  override onApplicationBootstrap(): void {
    /* Started after fixture reset. */
  }
}
class FixtureModerationProcessor extends ModerationProcessor {
  override onApplicationBootstrap(): void {
    /* Started after fixture reset. */
  }
}
export const workerFixtureProviders = [
  { provide: BotProcessor, useClass: FixtureBotProcessor },
  { provide: BotPublicationProcessor, useClass: FixturePublicationProcessor },
  { provide: ModerationProcessor, useClass: FixtureModerationProcessor },
];

export function startFixtureWorkers(t: TestApp): void {
  BotProcessor.prototype.onApplicationBootstrap.call(t.app.get(BotProcessor));
  BotPublicationProcessor.prototype.onApplicationBootstrap.call(t.app.get(BotPublicationProcessor));
  ModerationProcessor.prototype.onApplicationBootstrap.call(t.app.get(ModerationProcessor));
}
