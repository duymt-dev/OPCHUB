import { beforeEach, describe, expect, it } from 'vitest';
import { myRegionSchema } from '../../api-domains';
import { mockLogin } from '../index';
import { resetMockDb } from './store';
import { mockMyRegion } from './my-region';

describe('TIP-V46-804 regional mock contract', () => {
  beforeEach(() => resetMockDb());
  it.each(['bao.tran@solobooks.vn', 'hai.lm@mediasoft.vn', 'ha.pt@mediasoft.vn'])(
    'director demo login %s',
    (email) => {
      const login = mockLogin(email, 'User@2026');
      expect(login.ok).toBe(true);
      if (!login.ok) throw new Error('Missing demo login');
      const data = myRegionSchema.parse(mockMyRegion(login.me.id));
      expect(data.state).toBe('director');
      if (data.state === 'director') {
        expect(data.years).toHaveLength(4);
        expect(data.kpi.share - data.kpi.paid).toBe(data.kpi.due);
      }
    },
  );
  it('ordinary member cannot read regional bank or totals', () => {
    expect(mockMyRegion('m1')).toEqual({ state: 'none' });
  });
});
