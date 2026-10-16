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
