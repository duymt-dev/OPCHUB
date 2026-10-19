import type { GroupItem } from '@opchub/shared/api-domains';
import { formatDate, groupLookup, pageCheckState, splitGroups, toggleAll } from './model';

const group = (id: string, name: string): GroupItem => ({
  id,
  name,
  province: '',
  region: '',
  memberCount: 0,
  weeklyActive: 0,
  description: '',
  joinMode: 'open',
  myStatus: null,
  coverUrl: null,
  avatars: [],
});

describe('members model', () => {
  it('tone nhóm theo thứ tự, gộp +N', () => {
    const lookup = groupLookup([group('c1', 'A'), group('c2', 'B'), group('c3', 'C')]);
    expect(lookup.chipOf('c2')).toMatchObject({ name: 'B', fg: '#FF4D4F' });
    const s = splitGroups(['c1', 'c2', 'c3', 'x'], lookup);
    expect(s.chips.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(s.more).toBe(1);
  });

  it('ngày theo giờ Việt Nam', () => {
    expect(formatDate('2026-03-01T17:00:00.000Z')).toBe('02/03/2026');
  });

  it('chọn tất cả trên trang', () => {
    const ids = ['a', 'b'];
    expect(pageCheckState(new Set(), ids)).toBe('none');
    expect(pageCheckState(new Set(['a']), ids)).toBe('some');
    const all = toggleAll(new Set(['a', 'z']), ids);
    expect([...all].sort()).toEqual(['a', 'b', 'z']);
    expect([...toggleAll(all, ids)]).toEqual(['z']);
  });
});
