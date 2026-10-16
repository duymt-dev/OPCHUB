import { describe, expect, it } from 'vitest';
import {
  agoKey,
  emptyForm,
  formToSave,
  money,
  repoName,
  repoUrlWarn,
  validateInterest,
  validateSubmit,
  vnDate,
} from './model';
import type { ProjectFormState } from './types';

const filled = (patch: Partial<ProjectFormState> = {}): ProjectFormState => ({
  ...emptyForm('Nguyễn Văn An'),
  name: 'Dự án thử',
  category: 'Fintech',
  summary: 'Một câu giới thiệu',
  testUrl: 'https://demo.thu.app',
  ...patch,
});

describe('money (MONEY của prototype)', () => {
  it('VND: tỷ / triệu / số', () => {
    expect(money(2_000_000_000)).toBe('2 tỷ ₫');
    expect(money(1_500_000_000)).toBe('1,5 tỷ ₫');
    expect(money(100_000_000)).toBe('100 triệu ₫');
    expect(money(500_000)).toBe('500.000 ₫');
  });
  it('USD: $K / $M', () => {
    expect(money(300_000, 'USD')).toBe('$300K');
    expect(money(1_500_000, 'USD')).toBe('$1.5M');
    expect(money(900, 'USD')).toBe('$900');
  });
});

describe('ngày, thời gian, repo', () => {
  it('vnDate hiển thị theo giờ Việt Nam', () => {
    expect(vnDate('2026-10-15T18:00:00.000Z')).toBe('16/10/2026');
  });
  it('agoKey chia phút / giờ / ngày', () => {
    const now = Date.parse('2026-10-16T02:00:00.000Z');
    expect(agoKey('2026-10-16T01:59:30.000Z', now)).toEqual({ key: 'now', n: 0 });
    expect(agoKey('2026-10-16T01:30:00.000Z', now)).toEqual({ key: 'minutes', n: 30 });
    expect(agoKey('2026-10-15T23:00:00.000Z', now)).toEqual({ key: 'hours', n: 3 });
    expect(agoKey('2026-10-13T02:00:00.000Z', now)).toEqual({ key: 'days', n: 3 });
  });
  it('repoName bỏ host GitHub/GitLab', () => {
    expect(repoName('https://github.com/solobooks/web')).toBe('solobooks/web');
    expect(repoName('https://gitlab.com/a/b')).toBe('a/b');
  });
});

describe('validateSubmit (Gửi đăng dự án)', () => {
  it('báo trường thiếu theo thứ tự prototype', () => {
    expect(validateSubmit(filled({ name: ' ' }))).toBe('needName');
    expect(validateSubmit(filled({ category: '' }))).toBe('needCategory');
    expect(validateSubmit(filled({ summary: '' }))).toBe('needSummary');
    expect(validateSubmit(filled({ testUrl: 'demo' }))).toBe('badTestUrl');
  });
  it('gọi vốn: cần số vốn và cổ phần 0–100%', () => {
    expect(validateSubmit(filled({ fundOn: true }))).toBe('needFundAmount');
    expect(validateSubmit(filled({ fundOn: true, fundAmount: '1000', fundEquity: '120' }))).toBe(
      'badEquity',
    );
    expect(
      validateSubmit(filled({ fundOn: true, fundAmount: '1000', fundEquity: '10' })),
    ).toBeNull();
  });
  it('repo phải đúng định dạng nhà cung cấp', () => {
    const bad = filled({ repoProvider: 'github', repoUrl: 'https://gitlab.com/a/b' });
    expect(validateSubmit(bad)).toBe('badRepoGithub');
    expect(repoUrlWarn(bad)).toBe(true);
    const ok = filled({ repoProvider: 'gitlab', repoUrl: 'https://gitlab.com/a/b' });
    expect(validateSubmit(ok)).toBeNull();
    expect(repoUrlWarn(ok)).toBe(false);
  });
});

describe('formToSave', () => {
  it('cắt khoảng trắng, tách tag, bỏ thành viên trống, gắn cờ submit', () => {
    const f = filled({
      name: '  Dự án  ',
      tags: 'AI, SaaS, , B2B',
      team: [
        { name: 'An', role: 'CEO', avatarUrl: null, isOwner: true },
        { name: ' ', role: '', avatarUrl: null, isOwner: false },
      ],
    });
    const body = formToSave(f, true);
    expect(body.name).toBe('Dự án');
    expect(body.tags).toEqual(['AI', 'SaaS', 'B2B']);
    expect(body.team).toHaveLength(1);
    expect(body.repo).toBeNull();
    expect(body.funding).toBeNull();
    expect(body.submit).toBe(true);
  });
  it('gọi vốn: chuyển chuỗi sang số nguyên', () => {
    const body = formToSave(
      filled({ fundOn: true, fundAmount: '2000000000', fundEquity: '10', fundMin: '' }),
      false,
    );
    expect(body.funding).toMatchObject({ amount: 2_000_000_000, equityPercent: 10, minTicket: 0 });
    expect(body.submit).toBe(false);
  });
});

describe('validateInterest (BR-09)', () => {
  const base = {
    name: 'Nguyễn Văn An',
    phone: '0912345678',
    kind: 'individual' as const,
    org: '',
    amount: '100000000',
    min: 100_000_000,
  };
  it('hợp lệ', () => expect(validateInterest(base)).toBeNull());
  it('báo lỗi từng trường', () => {
    expect(validateInterest({ ...base, name: '' })).toBe('needName');
    expect(validateInterest({ ...base, phone: '12' })).toBe('badPhone');
    expect(validateInterest({ ...base, kind: 'fund' })).toBe('needFund');
    expect(validateInterest({ ...base, kind: 'business' })).toBe('needBiz');
    expect(validateInterest({ ...base, amount: '' })).toBe('needAmount');
    expect(validateInterest({ ...base, amount: '1000' })).toBe('belowMin');
  });
});
