import { describe, expect, it } from 'vitest';
import { REGION_LABEL_DIRECTOR, REGION_LABEL_SHORT } from './region-labels';

describe('D-139 region copy is unchanged', () => {
  it('keeps short labels for reports and province groups', () => {
    expect(REGION_LABEL_SHORT).toEqual({
      north: 'Miền Bắc',
      central: 'Miền Trung',
      south: 'Miền Nam',
    });
  });
  it('keeps the full central director label', () => {
    expect(REGION_LABEL_DIRECTOR).toEqual({
      north: 'Miền Bắc',
      central: 'Miền Trung & Tây Nguyên',
      south: 'Miền Nam',
    });
  });
});
