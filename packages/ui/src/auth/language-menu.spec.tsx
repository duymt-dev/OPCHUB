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
  { code: 'th', country: 'Thái Lan', native: 'ภาษาไทย', flagSrc: 'https://flagcdn.com/w80/th.png' },
];

describe('LanguageMenu', () => {
  it('nút mở hiện cờ của ngôn ngữ đang chọn thay quả địa cầu', () => {
    render(<LanguageMenu title="Chọn" current="th" options={options} onSelect={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: 'ภาษาไทย' });
    expect(trigger.querySelector('img')?.getAttribute('src')).toBe(
      'https://flagcdn.com/w80/th.png',
    );
    // chỉ còn mũi tên mở, không còn quả địa cầu
    expect(trigger.querySelectorAll('svg')).toHaveLength(1);
  });

  it('thanh trên cùng (topbar): hiện cờ của ngôn ngữ đang chọn thay quả địa cầu', () => {
    render(
      <LanguageMenu
        title="Chọn"
        current="th"
        options={options}
        onSelect={vi.fn()}
        variant="topbar"
      />,
    );
    const trigger = screen.getByRole('button', { name: 'ภาษาไทย' });
    expect(trigger.querySelector('img')?.getAttribute('src')).toBe(
      'https://flagcdn.com/w80/th.png',
    );
    // chỉ còn mũi tên mở, không còn quả địa cầu
    expect(trigger.querySelectorAll('svg')).toHaveLength(1);
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
    fireEvent.click(screen.getByRole('button', { name: 'Tiếng Việt' }));
    fireEvent.click(screen.getByRole('option', { name: /Thái Lan/ }));
    expect(onSelect).toHaveBeenCalledWith('th');
  });
});
