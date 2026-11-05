import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthHero } from './auth-hero';
import type { AuthHeroCopy } from './types';

afterEach(cleanup);
describe('REQ-630 AuthHero v4.6', () => {
  it('renders two headline parts and four distinct titles with descriptions', () => {
    const copy: AuthHeroCopy = {
      eyebrow: 'CỘNG ĐỒNG DOANH NGHIỆP MỘT NGƯỜI',
      headlineLead: 'Kết nối năng lực địa phương',
      headlineAccent: 'Liên kết chuỗi cung ứng, mở rộng thị trường',
      sub: 'Description',
      values: ['learn', 'people', 'supply', 'globe'].map((icon, i) => ({
        icon: icon as AuthHeroCopy['values'][number]['icon'],
        title: `Title ${i}`,
        desc: `Detail ${i}`,
      })),
    };
    const { container } = render(<AuthHero copy={copy} />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe(copy.headlineLead + copy.headlineAccent);
    expect(heading.querySelector('br')).not.toBeNull();
    expect(heading.querySelector('span')?.textContent).toBe(copy.headlineAccent);
    expect(container.textContent).not.toContain('QUỐC TẾ');
    for (const value of copy.values) {
      expect(screen.getByText(value.title)).toBeTruthy();
      expect(screen.getByText(value.desc)).toBeTruthy();
    }
  });
});
