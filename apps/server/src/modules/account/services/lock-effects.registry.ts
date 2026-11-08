import { Injectable } from '@nestjs/common';
import type { LockEffects } from '../ports';

/**
 * `LOCK_EFFECTS_PORT` dạng nhiều provider (như `ProfileStatsRegistry`): community… gọi `register`
 * ở `onModuleInit`. Gọi tuần tự theo thứ tự đăng ký; một provider ném → cả lô ném để relay thử lại.
 */
@Injectable()
export class LockEffectsRegistry {
  private readonly effects: LockEffects[] = [];

  register(effect: LockEffects): void {
    this.effects.push(effect);
  }

  get size(): number {
    return this.effects.length;
  }

  async locked(userIds: readonly string[]): Promise<void> {
    for (const e of this.effects) await e.onLocked(userIds);
  }

  async unlocked(userIds: readonly string[]): Promise<void> {
    for (const e of this.effects) await e.onUnlocked(userIds);
  }

  async deleted(userIds: readonly string[]): Promise<void> {
    for (const effect of this.effects) await effect.onDeleted?.(userIds);
  }
}
