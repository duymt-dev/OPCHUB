/**
 * Mock theo domain (SRS §13, trừ /auth và /biz/lookup) — dùng chung MSW Portal + Admin.
 * Import qua `@opchub/shared/mock-domains`.
 */
export * from './admin';
export * from './community';
export * from './content';
export * from './extras';
export * from './ops-admin';
export * from './ops-community';
export * from './ops-content';
export * from './store';
export * from './util';
export * from './chat-messages';
export * from './chat-ops';
export * from './chat-seed';
export * from './chat-store';
export * from './dashboard';
export * from './inbox';
export * from './public-stats';
export * from './membership-flow';
export * from './event-notify';
export * from './profile';
export * from './project-store';
export * from './project-v4-seed';
export * from './ops-project-portal';
export * from './ops-project-social';
export * from './admin-members';
export * from './bot-ops';
export {
  drainMockKeywordHits,
  pendingMockKeywordHits,
  processMockKeywordHit,
  enqueueMockKeywordHit,
} from './moderation-jobs';
export * from './fees-admin';
export * from './group-admin';
export * from './investors-admin';
export * from './investor-bridge';
export * from './service-bridge';
export * from './fundraising';
export * from './stores';
export * from './stores-bridge';
export * from './needs-store';
export * from './needs';
export * from './onboarding';
export * from './onboarding-auto';
export * from './chat-topics';
export * from './services-admin';
export * from './project-admin';
export * from './project-revision';
export * from './event-admin';
export * from './settings-log';
export * from './admin-rbac';
export * from './settings-config';
export * from './price-config';
export * from './marketing';
export * from './overview';
export * from './reports';
export * from './unsubscribe';
export * from './affiliate';
export * from './affiliate-demo';
export { seedManualMockBotScenario } from './bot-demo-scenario';
export * from './affiliate-admin/read';
export * from './affiliate-admin/write';
export * from './affiliate-admin/payout';
export * from './affiliate-admin/csv';
export * from './affiliate-persistence/schema';
export * from './affiliate-persistence/snapshot';
export * from './affiliate-persistence/webhooks';
export {
  drainMockModerationWarnings,
  pendingMockModerationWarnings,
} from './moderation-warning-jobs';
export * from './member-sessions';
export { mockMemberLockReason } from './member-lifecycle';
export {
  mockLockedUntil,
  mockModerationSettings,
  mockViolationCount,
  saveMockModerationSettings,
  sweepMockExpiredLocks,
} from './moderation-violations';
export { drainMockGroupOwnerLocks, pendingMockGroupOwnerLocks } from './group-lock-jobs';
export {
  beginMockRegistration,
  pendingMockRegistration,
  resendMockRegistration,
  activateMockRegistration,
} from './registration/commands';
export { registeredMockEmailTaken } from './registration/state';
export { registeredMockSession } from './registration/session';
export {
  mockDeclarationAccount,
  mockDeclarationDraft,
  mockNeedsDeclaration,
  saveMockDeclaration,
} from './registration/declaration';
export { captureCommunitySnapshot } from './community-persistence/snapshot';
export * from './fee-history';
export { mockBotSchedule, patchMockBotSchedule } from './bot-schedule';

export * from './bot-conversation-types';

export * from './bot-bulk/create';
export * from './bot-bulk/state';
export * from './bot-bulk/worker';
export * from './bot-bulk/selection';
export * from './bot-bulk/save';
