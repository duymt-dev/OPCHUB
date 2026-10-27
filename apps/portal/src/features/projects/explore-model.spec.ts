import type { ProjectCard } from '@opchub/shared/api-domains';
import { describe, expect, it } from 'vitest';
import {
  applySide,
  badgeOf,
  categoryCover,
  categoryIcon,
  ownerInitial,
  sideCounts,
  toggle,
  topProvinces,
  type SideFilter,
} from './explore-model';

const card = (over: Partial<ProjectCard>): ProjectCard =>
  ({
    id: 'p',
    name: 'X',
    category: 'Thủy sản',
    audience: 'personal',
    stage: 'idea',
    needs: ['customers'],
    province: 'Hà Nội',
    ...over,
  }) as ProjectCard;

const NONE: SideFilter = { cat: 'all', who: 'all', provs: [], devs: [], needs: [] };

const items = [
  card({ id: 'a', audience: 'student', province: 'Hà Nội', stage: 'mvp', needs: ['investors'] }),
  card({ id: 'b', audience: 'business', province: 'Cà Mau', stage: 'growth', needs: ['pilot'] }),
  card({
    id: 'c',
    audience: 'student',
    province: 'Hà Nội',
    stage: 'idea',
    needs: ['pilot', 'experts'],
  }),
];

describe('D-89 Khám phá Dự án v4 — bộ lọc trái (prototype projPage)', () => {
  it('đối tượng một giá trị; tỉnh / giai đoạn / nhu cầu nhiều giá trị (OR trong nhóm, AND giữa nhóm)', () => {
    expect(applySide(items, { ...NONE, who: 'student' }).map((p) => p.id)).toEqual(['a', 'c']);
    expect(applySide(items, { ...NONE, provs: ['Cà Mau', 'Hà Nội'] })).toHaveLength(3);
    expect(applySide(items, { ...NONE, devs: ['mvp', 'growth'] }).map((p) => p.id)).toEqual([
      'a',
      'b',
    ]);
    expect(
      applySide(items, { ...NONE, needs: ['pilot'], who: 'student' }).map((p) => p.id),
    ).toEqual(['c']);
    expect(applySide(items, { ...NONE, cat: 'Khác' })).toHaveLength(0);
  });

  it('đếm: tỉnh xếp nhiều dự án trước; nhu cầu đếm mọi nhu cầu của dự án; đối tượng đếm trên toàn bộ', () => {
    const c = sideCounts(items.slice(0, 2), items);
    expect(c.provs).toEqual([
      ['Hà Nội', 1],
      ['Cà Mau', 1],
    ]);
    expect(c.who.get('student')).toBe(2);
    expect(sideCounts(items, items).needs.get('pilot')).toBe(2);
    expect(topProvinces(items)).toEqual(['Hà Nội', 'Cà Mau']);
  });

  it('huy hiệu: 2 thẻ đầu "Nổi bật" khi chưa lọc; còn lại nhu cầu đầu tiên', () => {
    expect(badgeOf(items[0] as ProjectCard, 1, true)).toEqual({ kind: 'hot' });
    expect(badgeOf(items[0] as ProjectCard, 2, true)).toEqual({ kind: 'need', need: 'investors' });
    expect(badgeOf(items[1] as ProjectCard, 0, false)).toEqual({ kind: 'need', need: 'pilot' });
    expect(badgeOf(card({ needs: [] }), 5, false)).toBeNull();
  });

  it('chữ avatar = chữ đầu của từ cuối; ảnh / icon theo nhóm ngành, rơi về mặc định', () => {
    expect(ownerInitial('Nhóm THPT Chu Văn An')).toBe('A');
    expect(ownerInitial('Cơ khí Nông nghiệp Ea Kar')).toBe('K');
    expect(categoryCover('Thủy sản')).toContain('1559737558-2f5a35f4523b');
    expect(categoryCover('Lạ')).toContain('1556761175-5973dc0f32e7');
    expect(categoryIcon('Lạ')).toBe('M5 12h.01M12 12h.01M19 12h.01');
    expect(toggle(['a'], 'a')).toEqual([]);
    expect(toggle(['a'], 'b')).toEqual(['a', 'b']);
  });
});
