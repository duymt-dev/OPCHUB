import { render, screen } from '@testing-library/react';
import { PayQr, qrCaption } from './pay-qr';

const CAP = qrCaption(
  { accountName: 'Công ty cổ phần Tập đoàn Media Soft', accountNo: '1203132809' },
  'Số tiền: 15.000.000 VND',
);

beforeAll(() => {
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

describe('PayQr (D-96, UI-PAY-02)', () => {
  it('có chuỗi EMVCo → vẽ SVG trong khung cố định, không ảnh ngoài', () => {
    const { container } = render(
      <PayQr
        value="00020101021238"
        size={200}
        label="QR"
        loadingText="Đang tải mã QR…"
        caption={CAP}
      />,
    );
    const frame = screen.getByTestId('pay-qr');
    expect(frame.style.width).toBe('200px');
    expect(frame.style.height).toBe('200px');
    const svg = screen.getByRole('img', { name: 'QR' }).querySelector('svg');
    expect(svg).not.toBeNull();
    // Mẫu VietQR: mức sửa lỗi H + logo chữ V khoét giữa mã
    expect(svg?.querySelector('image')?.getAttribute('href')).toMatch(/^data:image\/svg\+xml/);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('Đang tải mã QR…')).toBeTruthy();
  });

  it('chân thẻ VietQR: tên TK in hoa không dấu, STK, số tiền', () => {
    expect(CAP.accountName).toBe('CONG TY CO PHAN TAP DOAN MEDIA SOFT');
    render(<PayQr value="000201" size={200} label="QR" loadingText="…" caption={CAP} />);
    expect(screen.getByText('1203132809')).toBeTruthy();
    expect(screen.getByText('Số tiền: 15.000.000 VND')).toBeTruthy();
  });

  it('chuỗi trống → ảnh QR tĩnh dự phòng, không alt', () => {
    const { container } = render(
      <PayQr value="" size={220} label="QR" loadingText="Đang tải mã QR…" caption={CAP} />,
    );
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/vcb-qr.png');
    expect(img?.getAttribute('alt')).toBe('');
  });
});
