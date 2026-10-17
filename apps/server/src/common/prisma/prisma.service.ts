import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { createPrismaClient, type DbClient } from '@opchub/db';
import { ENV, type Env } from '../config';

/** Một PrismaClient mỗi process; `db` dùng trong repository, `$transaction` trong service */
@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly db: DbClient;

  constructor(@Inject(ENV) env: Env) {
    this.db = createPrismaClient(env.DATABASE_URL, { max: env.DB_POOL_MAX });
  }

  async onModuleDestroy(): Promise<void> {
    await this.db.$disconnect();
  }
}
