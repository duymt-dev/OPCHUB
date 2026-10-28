import { beforeEach, expect, it } from 'vitest';
import { PRICE_DEFAULTS } from '../../../fixtures/price-defaults';
import { auditLog, recordAudit } from '../audit-store';
import {
  captureCommunitySnapshot,
  restoreCommunitySnapshot,
} from '../community-persistence/snapshot';
import { readMockAdminPrices, readMockPrices, saveMockPrices } from '../price-config';
import { listSettingsLog, logSetting } from '../settings-log';
import { resetMockDb } from '../store';
import { capturePricingSnapshot, restorePricingSnapshot } from './snapshot';

beforeEach(resetMockDb);

function changePrice() {
  const current = readMockAdminPrices();
  const result = saveMockPrices({ ...current, per: { ...current.per, y: 1_560_000 } });
  if (!result.ok) throw new Error(result.message);
  logSetting('admin', 'pricing.update', 'price_config', 'Cập nhật bảng giá', 'pricing', {
    before: result.data.before,
    after: { per: result.data.saved.per, biz: result.data.saved.biz, fund: result.data.saved.fund },
  });
  return result.data.saved;
}

it('E2E-12 REQ-603 restores actual prices/version/audit in a fresh cross-domain runtime', () => {
  const saved = changePrice();
  const snapshot = JSON.parse(JSON.stringify(captureCommunitySnapshot())) as unknown;
  const before = capturePricingSnapshot();
  resetMockDb();
  expect(readMockPrices()).toEqual(PRICE_DEFAULTS);
  restoreCommunitySnapshot(snapshot);
  expect(readMockAdminPrices()).toEqual(saved);
  expect(capturePricingSnapshot()).toEqual(before);
  expect(listSettingsLog().filter((row) => row.tag === 'pricing')).toHaveLength(1);
  expect(auditLog().filter((row) => row.action === 'pricing.update')).toHaveLength(1);
  restoreCommunitySnapshot(snapshot);
  expect(capturePricingSnapshot()).toEqual(before);
  expect(saveMockPrices({ ...saved, version: saved.version - 1 }).ok).toBe(false);
});

it('E2E-12 invalid persisted pricing rejects the complete composition before mutation', () => {
  changePrice();
  const before = captureCommunitySnapshot();
  const bad = {
    ...before,
    pricing: { ...capturePricingSnapshot(), config: { ...readMockAdminPrices(), version: 0 } },
  };
  expect(() => restoreCommunitySnapshot(bad)).toThrow();
  expect(captureCommunitySnapshot()).toEqual(before);
  expect(() =>
    restorePricingSnapshot({ ...capturePricingSnapshot(), accessToken: 'invalid' }),
  ).toThrow();
  expect(captureCommunitySnapshot()).toEqual(before);
});

it('E2E-12 restoring a legacy composition resets pricing without erasing other domain history', () => {
  const legacy = captureCommunitySnapshot();
  delete legacy.pricing;
  changePrice();
  recordAudit('admin', 'member.lock', 'm1', 'Unrelated action');
  const unrelated = auditLog().find((row) => row.action === 'member.lock');
  restoreCommunitySnapshot(legacy);
  expect(readMockPrices()).toEqual(PRICE_DEFAULTS);
  expect(readMockAdminPrices().version).toBe(1);
  expect(capturePricingSnapshot().audit).toEqual([]);
  expect(auditLog()).toContainEqual(unrelated);
});
