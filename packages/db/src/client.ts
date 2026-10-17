import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client';

export interface CreateClientOptions {
  /** Kích thước pool pg của process (PgBouncer phía sau giữ kết nối thật) */
  max?: number;
}

/** Một PrismaClient mỗi process (prisma-migrations.md › Kết nối) */
export function createPrismaClient(url: string, opts: CreateClientOptions = {}): PrismaClient {
  const adapter = new PrismaPg({ connectionString: url, max: opts.max ?? 10 });
  return new PrismaClient({ adapter });
}

export type DbClient = PrismaClient;
/** Client trong `$transaction(async (tx) => …)` */
export type DbTx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];
