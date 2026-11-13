import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageMenu } from './language-menu';

const options = [
  {
    code: 'vi',
    country: 'Việt Nam',
    native: 'Tiếng Việt',
    flagSrc: 'https://flagcdn.com/w80/vn.png',
  },
  { code: 'en', country: 'Anh', native: 'English', flagSrc: 'https://flagcdn.com/w80/gb.png' },
  {
    code: 'en-SG',
    country: 'Singapore',
    native: 'English',
    flagSrc: 'https://flagcdn.com/w80/sg.png',
  },
  { code: 'th', country: 'Thái Lan', native: 'ภาษาไทย', flagSrc: 'https://flagcdn.com/w80/th.png' },
];

describe('LanguageMenu (D-133, D-142 AC825-02)', () => {
  it('nút mở (auth) hiện cờ và tên quốc gia đang chọn thay quả địa cầu', () => {
    render(<LanguageMenu title="Chọn" current="th" options={options} onSelect={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: 'Thái Lan' });
    expect(trigger.querySelector('img')?.getAttribute('src')).toBe(
      'https://flagcdn.com/w80/th.png',
    );
    // chỉ còn mũi tên mở, không còn quả địa cầu
    expect(trigger.querySelectorAll('svg')).toHaveLength(1);
  });

  it('thanh trên cùng (topbar): phân biệt Anh vs Singapore theo tên nước trên nút, popup giữ cả tên nước và tên ngôn ngữ', () => {
    const { rerender } = render(
      <LanguageMenu
        title="Chọn"
        current="en-SG"
        options={options}
        onSelect={vi.fn()}
        variant="topbar"
      />,
    );
    const sgTrigger = screen.getByRole('button', { name: 'Singapore' });
    expect(sgTrigger.querySelector('img')?.getAttribute('src')).toBe(
      'https://flagcdn.com/w80/sg.png',
    );
    expect(sgTrigger.querySelectorAll('svg')).toHaveLength(1);

    fireEvent.click(sgTrigger);
    const ukOption = screen.getByRole('option', { name: /Anh/ });
    expect(ukOption.textContent).toContain('Anh');
    expect(ukOption.textContent).toContain('English');

    rerender(
      <LanguageMenu
        title="Chọn"
        current="en"
        options={options}
        onSelect={vi.fn()}
        variant="topbar"
      />,
    );
    expect(screen.getByRole('button', { name: 'Anh' })).toBeTruthy();
  });

  it('khi không có cờ thì hiện quả địa cầu dự phòng', () => {
    render(
      <LanguageMenu title="Chọn" current="xx" options={[]} onSelect={vi.fn()} variant="topbar" />,
    );
    const trigger = screen.getByRole('button');
    expect(trigger.querySelector('img')).toBeNull();
    // quả địa cầu + mũi tên mở
    expect(trigger.querySelectorAll('svg')).toHaveLength(2);
  });

  it('chọn ngôn ngữ khác gọi onSelect', () => {
    const onSelect = vi.fn();
    render(<LanguageMenu title="Chọn" current="vi" options={options} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Việt Nam' }));
    fireEvent.click(screen.getByRole('option', { name: /Thái Lan/ }));
    expect(onSelect).toHaveBeenCalledWith('th');
  });
});
