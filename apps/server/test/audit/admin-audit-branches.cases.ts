import type { TestApp } from '../setup/test-app';

export interface AuditBranchContext {
  t: TestApp;
  targetId: string;
  targetEmail: string;
}
export interface AuditDenialCase {
  domain: string;
  controller: string;
  method: 'POST' | 'PATCH' | 'PUT';
  path: (context: AuditBranchContext) => string;
  body: unknown;
  state: (context: AuditBranchContext) => Promise<unknown>;
}

/** One real Admin write boundary per manifest domain; no Prisma/service mocks. */
export const auditDenialCases: readonly AuditDenialCase[] = [
  {
    domain: 'account',
    controller: 'AdminUsersController',
    method: 'PATCH',
    path: (c) => `/admin/users/${c.targetId}/status`,
    body: { status: 'locked', reason: 'A12 denied' },
    state: (c) =>
      c.t.prisma.db.user.findUnique({
        where: { id: c.targetId },
        select: { status: true, updatedAt: true },
      }),
  },
  {
    domain: 'admin-account',
    controller: 'AdminRolesController',
    method: 'POST',
    path: () => '/admin/admin-roles',
    body: { name: 'A12 denied role', permissions: [] },
    state: (c) => c.t.prisma.db.adminRole.count(),
  },
  {
    domain: 'affiliate',
    controller: 'AdminAffiliatePolicyController',
    method: 'PUT',
    path: () => '/admin/affiliate/policy',
    body: { defaultRate: 30, cookieDays: 30, fundraisingRate: 10, terms: 'A12 denied' },
    state: (c) =>
      c.t.prisma.db.affiliatePolicy.findUnique({
        where: { id: 1 },
        select: { defaultRate: true, updatedAt: true },
      }),
  },
  {
    domain: 'bot',
    controller: 'BotController',
    method: 'POST',
    path: () => '/admin/personas',
    body: { name: 'A12 denied persona' },
    state: (c) => c.t.prisma.db.persona.count(),
  },
  {
    domain: 'community',
    controller: 'AdminGroupsController',
    method: 'POST',
    path: () => '/admin/groups',
    body: { name: 'A12 denied group' },
    state: (c) => c.t.prisma.db.group.count(),
  },
  {
    domain: 'event',
    controller: 'AdminEventsController',
    method: 'POST',
    path: () => '/admin/events',
    body: { title: 'A12 denied event' },
    state: (c) => c.t.prisma.db.event.count(),
  },
  {
    domain: 'investor',
    controller: 'AdminInvestorsController',
    method: 'POST',
    path: () => '/admin/investors/export',
    body: { format: 'csv' },
    state: (c) => c.t.prisma.db.exportJob.count(),
  },
  {
    domain: 'llm-config',
    controller: 'AiSettingsController',
    method: 'PUT',
    path: () => '/admin/settings/ai',
    body: {},
    state: (c) =>
      c.t.prisma.db.llmProvider.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, enabled: true, model: true, updatedAt: true },
      }),
  },
  {
    domain: 'local-business',
    controller: 'AdminStoreController',
    method: 'POST',
    path: () => '/admin/stores/hide',
    body: { ids: ['A12 denied'] },
    state: (c) =>
      c.t.prisma.db.store.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, status: true, updatedAt: true },
      }),
  },
  {
    domain: 'mail',
    controller: 'AdminMailController',
    method: 'PUT',
    path: () => '/admin/smtp',
    body: { host: 'a12.example.test' },
    state: (c) =>
      c.t.prisma.db.smtpConfig.findUnique({
        where: { id: 1 },
        select: { host: true, enabled: true, updatedAt: true },
      }),
  },
  {
    domain: 'marketing',
    controller: 'CampaignsController',
    method: 'POST',
    path: () => '/admin/campaigns',
    body: { name: 'A12 denied campaign' },
    state: (c) => c.t.prisma.db.campaign.count(),
  },
  {
    domain: 'membership-fee',
    controller: 'AdminFeesController',
    method: 'POST',
    path: () => '/admin/fees/collect',
    body: {},
    state: (c) =>
      c.t.prisma.db.membershipFee.findUnique({
        where: { userId: c.targetId },
        select: { status: true, amount: true, validUntil: true, paidAt: true },
      }),
  },
  {
    domain: 'moderation',
    controller: 'AdminModerationController',
    method: 'POST',
    path: () => '/admin/moderation/keywords',
    body: { word: 'A12 denied keyword' },
    state: (c) => c.t.prisma.db.moderationKeyword.count(),
  },
  {
    domain: 'onboarding',
    controller: 'AdminOnboardingController',
    method: 'POST',
    path: (c) => `/admin/users/${c.targetId}/onboarding-remind`,
    body: {},
    state: (c) => c.t.prisma.db.mailLog.count({ where: { to: c.targetEmail } }),
  },
  {
    domain: 'pricing',
    controller: 'AdminPriceConfigController',
    method: 'PUT',
    path: () => '/admin/price-config',
    body: {},
    state: (c) =>
      c.t.prisma.db.priceConfig.findUnique({
        where: { id: 1 },
        select: { version: true, updatedAt: true },
      }),
  },
  {
    domain: 'project',
    controller: 'AdminProjectsController',
    method: 'PUT',
    path: () => '/admin/projects/featured',
    body: { ids: [] },
    state: (c) =>
      c.t.prisma.db.project.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, status: true, updatedAt: true },
      }),
  },
  {
    domain: 'regional-director',
    controller: 'AdminRegionalDirectorsController',
    method: 'PATCH',
    path: () => '/admin/gdv/north',
    body: { provinces: [] },
    state: (c) =>
      c.t.prisma.db.regionalDirector.findUnique({
        where: { region: 'north' },
        select: { userId: true, appointedAt: true, updatedAt: true },
      }),
  },
  {
    domain: 'reporting',
    controller: 'ReportsController',
    method: 'POST',
    path: () => '/admin/reports/export',
    body: { format: 'csv' },
    state: (c) => c.t.prisma.db.exportJob.count(),
  },
  {
    domain: 'service',
    controller: 'AdminServiceRequestsController',
    method: 'POST',
    path: () => '/admin/services',
    body: { name: 'A12 denied service' },
    state: (c) => c.t.prisma.db.service.count(),
  },
  {
    domain: 'settings',
    controller: 'SettingsController',
    method: 'PATCH',
    path: () => '/admin/settings/general',
    body: { title: 'A12 denied setting' },
    state: (c) =>
      c.t.prisma.db.appSetting.findUnique({
        where: { key: 'general' },
        select: { value: true, updatedAt: true },
      }),
  },
];
