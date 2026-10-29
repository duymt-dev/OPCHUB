import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from './generated/client';

export interface CreateClientOptions {
  /** Kích thước pool pg của process (PgBouncer phía sau giữ kết nối thật) */
  max?: number;
  /** Opt-in diagnostics; never log query parameters by default. */
  onQuery?: (event: Prisma.QueryEvent) => void;
}

/** Một PrismaClient mỗi process (prisma-migrations.md › Kết nối) */
export function createPrismaClient(url: string, opts: CreateClientOptions = {}): PrismaClient {
  // @prisma/adapter-pg đọc timestamptz dạng chữ rồi THAY offset bằng +00:00 → phiên phải ở UTC,
  // nếu không mọi mốc thời gian lệch theo TimeZone của server Postgres (luật 9, Q-B66-1)
  const adapter = new PrismaPg({
    connectionString: url,
    max: opts.max ?? 10,
    options: '-c TimeZone=UTC',
  });
  const client = new PrismaClient({
    adapter,
    log: opts.onQuery ? [{ emit: 'event', level: 'query' }] : [],
  });
  if (opts.onQuery) client.$on('query', opts.onQuery);
  return client;
}

export type DbClient = PrismaClient;
/** Client trong `$transaction(async (tx) => …)` */
export type DbTx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];
