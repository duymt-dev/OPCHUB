import { demoAccounts } from '@opchub/shared/fixtures';
import { seedProjectDemoFees } from './project-fees';
import { UNPAID_DEMO } from '@opchub/shared/mock-data';
import { argon2id, hash } from 'argon2';
import type { DbClient } from '../../src/client';
import { seedRequired } from '../required';
import { type DemoHashes, seedFees, seedUsers } from './account';
import { seedAdmins } from './admin';
import { seedAffiliates } from './affiliate';
import { seedAffiliateScenario } from './affiliate-scenario';
import { seedBots } from './bot';
import { seedBotHistory } from './bot-history';
import { seedMessages, seedReadCursors, seedReports } from './chat';
import { seedGroupMembers, seedGroups, seedTopicRooms } from './community';
import { seedEvents } from './event';
import { seedInvestors } from './investor';
import { seedMarketing } from './marketing';
import { seedProjects } from './project';
import { seedStatsDaily } from './reporting';
import { resetDemoData } from './reset';
import { seedDemoDirectors } from './regional-directors';
import { seedDemoRevenueBaseline } from './revenue-baseline';
import { seedServices } from './service';
import { seedNeeds } from './needs';
import { seedStores } from './stores';
import { seedAuditLog, seedNotifications, seedSettings } from './settings';

/** Mật khẩu demo lấy từ ACCOUNTS của prototype (dữ liệu công khai, không phải secret) */
function demoPasswords(): { member: string; admin: string } {
  const member = demoAccounts.find((a) => a.role === 'user')?.pwd;
  const admin = demoAccounts.find((a) => a.role === 'admin')?.pwd;
  if (!member || !admin || member !== UNPAID_DEMO.pwd) {
    throw new Error('Seed demo: thiếu / lệch mật khẩu demo trong prototype ACCOUNTS');
  }
  return { member, admin };
}

async function hashes(): Promise<DemoHashes> {
  const p = demoPasswords();
  const [member, admin] = await Promise.all([
    hash(p.member, { type: argon2id }),
    hash(p.admin, { type: argon2id }),
  ]);
  return { member, admin };
}

/**
 * Seed demo (TIP-B62): chạy seed bắt buộc rồi, trong MỘT transaction, xoá dữ liệu nghiệp vụ
 * (reset.ts) và nạp lại đúng dữ liệu MSW (`createMockDb()` + store mở rộng) — idempotent.
 */
export async function seedDemo(
  db: DbClient,
  options: {
    affiliate?: boolean;
    affiliatePaused?: boolean;
    affiliatePayout?: boolean;
    botManual?: boolean;
    botHistory?: boolean;
    stores?: boolean;
    projects?: boolean;
  } = {},
): Promise<void> {
  // TK `admin` có thể chưa có → seed bắt buộc tạo bằng mật khẩu demo (sau đó account.ts ghi lại hash)
  await seedRequired(db, demoPasswords().admin);
  const h = await hashes();
  await db.$transaction(
    async (tx) => {
      await resetDemoData(tx);
      await seedGroups(tx);
      await seedSettings(tx, options.botManual);
      await seedUsers(tx, h);
      await seedAdmins(tx, h.admin);
      await seedFees(tx);
      await seedAffiliates(tx);
      if (options.affiliate || options.affiliatePaused || options.affiliatePayout)
        await seedAffiliateScenario(tx, {
          paused: options.affiliatePaused ?? false,
          payout: options.affiliatePayout ?? false,
        });
      await seedTopicRooms(tx);
      await seedGroupMembers(tx);
      await seedDemoDirectors(tx);
      await seedBots(tx);
      const msgs = await seedMessages(tx);
      if (options.botHistory) await seedBotHistory(tx);
      await seedReadCursors(tx, msgs);
      await seedReports(tx);
      await seedEvents(tx);
      await seedProjects(tx);
      if (options.projects) await seedProjectDemoFees(tx);
      await seedInvestors(tx);
      await seedStores(tx, options.stores ?? false);
      await seedNeeds(tx, options.stores ?? false);
      await seedServices(tx);
      await seedMarketing(tx);
      await seedNotifications(tx);
      await seedAuditLog(tx);
      await seedStatsDaily(tx);
      await seedDemoRevenueBaseline(tx);
    },
    { timeout: 120_000, maxWait: 30_000 },
  );
}
