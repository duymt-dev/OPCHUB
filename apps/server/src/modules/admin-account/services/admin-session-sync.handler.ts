import { Injectable } from '@nestjs/common';
import type { OutboxPayload } from '@opchub/shared/outbox';
import { AuthStateService } from '@/common/auth';
import { AdminUserRepository } from '../repositories/admin-user.repository';

/** Durable retry reads current DB state, not a stale version embedded in an old event. */
@Injectable()
export class AdminSessionSyncHandler {
  constructor(
    private readonly users: AdminUserRepository,
    private readonly state: AuthStateService,
  ) {}

  async sync(payload: OutboxPayload<'admin.session_changed'>): Promise<void> {
    const row = await this.users.findSession(payload.adminId);
    if (row) await this.state.setPermVersionAtLeast(row.id, row.permVersion, 'admin');
  }
}
