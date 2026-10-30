import rawI18n from './prototype-i18n.json' with { type: 'json' };
import rawSeed from './prototype-seed.json' with { type: 'json' };
import { buildIndustryGroups } from './industry-groups';
import type { PrototypeSeed } from './types';
import { directorDemoMembers, directorDemoAccounts } from './regional-directors';

export type * from './types';
export { mailTemplates } from './mail-templates';
export { PRICE_DEFAULTS } from './price-defaults';

/** Toàn bộ seed của prototype (docs/spec/index.html), dùng cho MSW và seed DB sau này */
export const seed = rawSeed as unknown as PrototypeSeed;

/** Chuỗi giao diện gốc của prototype, theo mã ngôn ngữ */
export const prototypeI18n = rawI18n as Record<string, Record<string, string>>;

export const provinces = seed.PROVINCES;
export const categories = seed.CAT_SEED;
export const registrationRoles = seed.REG_ROLES;
export const members = [...seed.MEMBERS, ...directorDemoMembers];
export const communities = seed.COMMS;
/** D-89: 56 nhóm ngành con của 34 nhóm tỉnh */
export const industryGroups = buildIndustryGroups(seed.COMMS, seed.IND);
export const events = seed.EVENTS;
export const projects = seed.PROJECTS;
export const ssoProviders = seed.SSO;
export const demoAccounts = [
  ...seed.ACCOUNTS,
  ...directorDemoAccounts(seed.ACCOUNTS.find((a) => a.role === 'user')?.pwd ?? ''),
];
export * from './regional-directors';
export const services = seed.SVC_SEED;
export const tones = seed.TONES;
export const languages = seed.LANGS;
export const welcomeTemplate = seed.WELCOME_TPL;

/** Vùng của một tỉnh/thành, giống hàm REGION() của prototype */
export function regionOf(province: string): string {
  return provinces.find(([name]) => name === province)?.[1] ?? 'Khác';
}
export * from './auth-hero';
export * from './register';
export * from './locale';
export * from './affiliate';
export * from './affiliate-payout';
export * from './stores-seed';
export * from './needs-seed';
export type { IndustryGroupSeed } from './industry-groups';
export * from './stores-seed-media';
