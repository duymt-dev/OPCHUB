import { Injectable, type OnModuleInit } from '@nestjs/common';
import { LockEffectsRegistry, type LockEffects } from '@/modules/account';
import { RegionalDirectorService } from './regional-director.service';

/** Only indefinite locks and deletions revoke; unlocking never appoints again. */
@Injectable()
export class RegionalLockEffects implements LockEffects, OnModuleInit {
  constructor(
    private readonly directors: RegionalDirectorService,
    private readonly registry: LockEffectsRegistry,
  ) {}
  onModuleInit() {
    this.registry.register(this);
  }
  async onLocked(ids: readonly string[]) {
    await this.directors.revokeBySystem(ids, 'locked');
  }
  async onDeleted(ids: readonly string[]) {
    await this.directors.revokeBySystem(ids, 'deleted');
  }
  onUnlocked(): Promise<void> {
    return Promise.resolve();
  }
}
