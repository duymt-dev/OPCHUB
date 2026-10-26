import { describe, expect, it } from 'vitest';
import { missingLabels, onboardingColor, onboardingPct } from './onboarding-model';

const o = (done: number) => ({ done, missing: [], reminded: false });

/** V4-611 cột "Khởi đầu": màu thanh theo prototype `obCol`, % và nhãn "Còn thiếu" */
describe('onboarding model (admin members)', () => {
  it('màu: 8/8 xanh lá, ≥ 4 xanh dương, còn lại vàng; độ rộng %', () => {
    expect(onboardingColor(o(8))).toBe('#52C41A');
    expect(onboardingColor(o(4))).toBe('#1677FF');
    expect(onboardingColor(o(3))).toBe('#FAAD14');
    expect(onboardingPct(o(6))).toBe('75%');
  });

  it('nhãn ngắn: DN "Gian hàng" / "Nhu cầu", Cá nhân "Dự án OPC" / "Khám phá"', () => {
    expect(missingLabels(['prof', 'st', 'nd', 'aff'])).toBe('Hồ sơ, Gian hàng, Nhu cầu, Affiliate');
    expect(missingLabels(['pj', 'ex'])).toBe('Dự án OPC, Khám phá');
  });
});
