import { render, screen } from '@testing-library/react';
import { sanitizeHtml } from './safe-html/safe-html';
import { StatusTag } from './status-tag/status-tag';
import { initials, UserAvatar } from './user-avatar';

describe('initials', () => {
  it('lấy chữ đầu của 2 từ cuối', () => {
    expect(initials('Nguyễn Văn An')).toBe('VA');
    expect(initials('An')).toBe('A');
  });
});

describe('UserAvatar', () => {
  it('ưu tiên text ghi đè', () => {
    render(<UserAvatar name="Quản trị hệ thống" text="QT" />);
    expect(screen.getByText('QT')).toBeTruthy();
  });

  it('dùng ảnh đại diện mặc định tự host khi chưa có ảnh', () => {
    const { container } = render(<UserAvatar name="Trần Duy Mai" />);
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe('/images/avatar-default.svg');
  });

  it('hỗ trợ fallback initials khi yêu cầu', () => {
    render(<UserAvatar name="Trần Duy Mai" fallback="initials" />);
    expect(screen.getByText('DM')).toBeTruthy();
  });
});

describe('sanitizeHtml', () => {
  it('bỏ script và thuộc tính sự kiện', () => {
    const out = sanitizeHtml('<p onclick="x()">Hi<script>alert(1)</script></p>');
    expect(out).toBe('<p>Hi</p>');
  });
});

describe('StatusTag', () => {
  it('render nội dung', () => {
    render(<StatusTag tone="green">Đã duyệt</StatusTag>);
    expect(screen.getByText('Đã duyệt')).toBeTruthy();
  });
});
