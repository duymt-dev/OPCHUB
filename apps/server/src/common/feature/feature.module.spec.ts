import { Module } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

const flags = vi.hoisted(() => ({ FEATURE_SERVICES: false }));
vi.mock('../config', () => ({ loadEnv: () => flags }));

const { whenFeature } = await import('./feature.module');

@Module({})
class Target {}

describe('whenFeature (D-05)', () => {
  it('cờ tắt → không import module; bật → import; mỗi cờ một class riêng', () => {
    const off = whenFeature('FEATURE_SERVICES', Target);
    flags.FEATURE_SERVICES = true;
    const on = whenFeature('FEATURE_SERVICES', Target);
    expect(off.imports).toEqual([]);
    expect(on.imports).toEqual([Target]);
    expect(off.module).not.toBe(on.module);
  });
});
