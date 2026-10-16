import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { BulkBar } from './bulk-bar';
import { Drawer } from './drawer';
import { FilterChips } from './filter-chips';
import { Modal } from './modal';
import { Pagination, clampPage, pageNumbers } from './pagination';
import { Tabs } from './tabs';

beforeAll(() => {
  // antd đọc matchMedia (responsive observer); jsdom không có sẵn
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
});

describe('pageNumbers', () => {
  it('≤ 7 trang hiện đủ', () => {
    expect(pageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('nhiều trang: đầu, cuối, hiện tại ±1 và dấu …', () => {
    expect(pageNumbers(5, 12)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 12]);
    expect(pageNumbers(1, 12)).toEqual([1, 2, 'ellipsis', 12]);
  });

  it('kẹp trang vượt tổng', () => {
    expect(clampPage(9, 25, 10)).toEqual({ pages: 3, page: 3 });
    expect(clampPage(1, 0, 10)).toEqual({ pages: 1, page: 1 });
  });
});

describe('Pagination', () => {
  it('ẩn khi tổng 0', () => {
    const { container } = render(<Pagination page={1} size={10} total={0} onChange={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('hiển thị khoảng, trang hiện tại và chuyển trang', () => {
    const onChange = vi.fn();
    render(
      <Pagination page={2} size={10} total={45} onChange={onChange} labels={{ unit: 'nhóm' }} />,
    );
    expect(screen.getByText('Hiển thị 11–20 / 45 nhóm')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Trang 2' }).getAttribute('aria-current')).toBe(
      'page',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('khóa nút trước ở trang 1 và đổi cỡ trang', () => {
    const onSize = vi.fn();
    render(
      <Pagination
        page={1}
        size={12}
        total={30}
        onChange={() => {}}
        onSizeChange={onSize}
        sizeOptions={[6, 12, 24]}
      />,
    );
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Trang trước' }).disabled).toBe(
      true,
    );
    const select = screen.getByRole('combobox', { name: 'Số dòng mỗi trang' });
    expect(screen.getByRole('option', { name: '24 / trang' })).toBeTruthy();
    fireEvent.change(select, { target: { value: '24' } });
    expect(onSize).toHaveBeenCalledWith(24);
  });
});

function TabsHarness() {
  const [key, setKey] = useState<'info' | 'act' | 'sec'>('info');
  return (
    <Tabs
      ariaLabel="Hồ sơ"
      activeKey={key}
      onChange={setKey}
      items={[
        { key: 'info', label: 'Thông tin cá nhân' },
        { key: 'act', label: 'Nhóm & hoạt động', count: 3 },
        { key: 'sec', label: 'Bảo mật' },
      ]}
    />
  );
}

describe('Tabs', () => {
  it('đánh dấu tab đang chọn và đổi bằng click', () => {
    render(<TabsHarness />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: 'Bảo mật' }));
    expect(screen.getByRole('tab', { name: 'Bảo mật' }).getAttribute('aria-selected')).toBe('true');
  });

  it('phím mũi tên chuyển tab và giữ roving tabindex', () => {
    render(<TabsHarness />);
    const first = screen.getByRole('tab', { name: 'Thông tin cá nhân' });
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowLeft' });
    const last = screen.getByRole('tab', { name: 'Bảo mật' });
    expect(last.getAttribute('aria-selected')).toBe('true');
    expect(last.tabIndex).toBe(0);
    expect(first.tabIndex).toBe(-1);
    expect(document.activeElement).toBe(last);
  });

  it('variant admin ẩn số đếm 0', () => {
    render(
      <Tabs
        ariaLabel="Nhóm"
        variant="admin"
        activeKey="list"
        onChange={() => {}}
        items={[
          { key: 'list', label: 'Danh sách nhóm', count: 0 },
          { key: 'mod', label: 'Kiểm duyệt', count: 4 },
        ]}
      />,
    );
    expect(screen.queryByText('0')).toBeNull();
    expect(screen.getByText('4')).toBeTruthy();
  });
});

describe('FilterChips', () => {
  const items = [
    { key: 'all', label: 'Tất cả', count: 10 },
    { key: 'tech', label: 'Công nghệ', count: 4, dotColor: '#1677FF' },
    { key: 'food', label: 'F&B', count: 0 },
  ];

  it('chọn đơn: radiogroup, aria-checked, phím mũi tên', () => {
    const onChange = vi.fn();
    render(<FilterChips ariaLabel="Lĩnh vực" items={items} value="all" onChange={onChange} />);
    expect(screen.getByRole('radiogroup', { name: 'Lĩnh vực' })).toBeTruthy();
    const all = screen.getByRole('radio', { name: /Tất cả/ });
    expect(all.getAttribute('aria-checked')).toBe('true');
    fireEvent.keyDown(all, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('tech');
  });

  it('chọn nhiều: aria-pressed và bật/tắt', () => {
    const onChange = vi.fn();
    render(
      <FilterChips
        multiple
        ariaLabel="Bộ lọc"
        items={items}
        value={['tech']}
        onChange={onChange}
      />,
    );
    const tech = screen.getByRole('button', { name: /Công nghệ/ });
    expect(tech.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(tech);
    expect(onChange).toHaveBeenCalledWith([]);
    fireEvent.click(screen.getByRole('button', { name: /F&B/ }));
    expect(onChange).toHaveBeenLastCalledWith(['tech', 'food']);
  });
});

describe('BulkBar', () => {
  it('ẩn khi chưa chọn', () => {
    const { container } = render(<BulkBar count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('hiện số đã chọn và bỏ chọn', () => {
    const onClear = vi.fn();
    render(
      <BulkBar
        count={3}
        unit="thành viên"
        onClear={onClear}
        actions={<button type="button">Gửi nhắc</button>}
      />,
    );
    expect(screen.getByRole('region', { name: 'Thao tác hàng loạt' })).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText(/thành viên/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Gửi nhắc' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ chọn' }));
    expect(onClear).toHaveBeenCalled();
  });
});

describe('Drawer', () => {
  it('render tiêu đề, extra, footer và nút đóng có nhãn', () => {
    const onClose = vi.fn();
    render(
      <Drawer
        open
        title="Hồ sơ đăng ký"
        extra={<span>Chờ duyệt</span>}
        footer={<button type="button">Duyệt</button>}
        onClose={onClose}
      >
        <p>Nội dung</p>
      </Drawer>,
    );
    expect(screen.getByText('Hồ sơ đăng ký')).toBeTruthy();
    expect(screen.getByText('Chờ duyệt')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Duyệt' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Modal', () => {
  it('đóng bằng nút × có nhãn', () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Gán vào nhóm" onClose={onClose}>
        <p>Chọn nhóm</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Gán vào nhóm')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('dismissible=false không có nút đóng', () => {
    render(
      <Modal open title="Bắt buộc" dismissible={false} onClose={() => {}}>
        <p>Thanh toán</p>
      </Modal>,
    );
    expect(screen.queryByRole('button', { name: 'Đóng' })).toBeNull();
  });
});
