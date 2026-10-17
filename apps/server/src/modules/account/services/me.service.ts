import { Inject, Injectable } from '@nestjs/common';
import type { Me } from '@opchub/shared/api';
import { unauthorized } from '@/common/errors';
import { toMe } from '../domain/me.mapper';
import { FEE_READER, type FeeReader } from '../ports';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class MeService {
  constructor(
    private readonly users: UserRepository,
    @Inject(FEE_READER) private readonly fees: FeeReader,
  ) {}

  async me(userId: string): Promise<Me> {
    const [user, fee] = await Promise.all([
      this.users.findSession(userId),
      this.fees.feeOf(userId),
    ]);
    if (!user) throw unauthorized();
    return toMe(user, fee);
  }
}
