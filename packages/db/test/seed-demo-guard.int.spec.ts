import { describe, expect, it } from 'vitest';
import { assertDemoDatabase } from '../seed/demo/guard';

describe('TIP-V46-812 isolated demo target guard', () => {
  it.each([
    'opchub_dev',
    'opchub_test',
    'opchub_v46_801_dev',
    'opchub_v46_801_test',
    'opchub_v46_812_dev',
  ])('accepts the explicitly authorized database %s', (name) => {
    expect(assertDemoDatabase(`postgresql://user:password@localhost:5432/${name}`)).toBe(name);
  });

  it.each(['opchub_prod', 'opchub_v46_812_test', 'opchub_v46_812_dev_backup'])(
    'refuses an unauthorized database %s without leaking credentials',
    (name) => {
      const url = `postgresql://user:secret-password@localhost:5432/${name}`;
      expect(() => assertDemoDatabase(url)).toThrow(name);
      expect(() => assertDemoDatabase(url)).not.toThrow('secret-password');
    },
  );
});
