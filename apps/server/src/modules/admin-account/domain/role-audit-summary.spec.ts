import { describe, expect, it } from 'vitest';
import { roleAuditSummary } from './role-audit-summary';

describe('TIP-V2-505 bounded role permission audit caption', () => {
  it('preserves short role captions exactly', () => {
    expect(roleAuditSummary(['Editor', 'Teacher'])).toBe('cập nhật phân quyền Editor, Teacher');
  });
  it('accepts exactly 500 characters without truncation', () => {
    const prefix = roleAuditSummary([]);
    expect(roleAuditSummary(['a'.repeat(500 - prefix.length)])).toBe(
      prefix + 'a'.repeat(500 - prefix.length),
    );
  });
  it('bounds large matrices to 500 and retains a visible role count', () => {
    const names = Array.from({ length: 60 }, (_, i) => `A long role name ${i}`);
    const result = roleAuditSummary(names);
    expect(result).toHaveLength(500);
    expect(result).toMatch(/… \(60 vai trò\)$/);
    expect(result).toMatch(/^cập nhật phân quyền /);
  });
  it('does not cut an emoji into an invalid UTF-16 surrogate when bounding the caption', () => {
    const result = roleAuditSummary(['😀'.repeat(400)]);
    expect(result.length).toBeLessThanOrEqual(500);
    expect(() => encodeURIComponent(result)).not.toThrow();
  });
});
