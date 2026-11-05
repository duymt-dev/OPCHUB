/** Cột trái màn Auth v4 (chữ trắng trên ảnh nền) */
export interface AuthHeroCopy {
  eyebrow: string;
  /** Dòng 1 tiêu đề */
  headlineLead: string;
  /** Dòng 2: toàn bộ là phần nhấn màu */
  headlineAccent: string;
  sub: string;
  /** 4 giá trị: tiêu đề và mô tả */
  values: { icon: 'learn' | 'people' | 'supply' | 'globe'; title: string; desc: string }[];
}

export interface AuthHeroProps {
  copy: AuthHeroCopy;
}

/** Chân trang Auth v4: cờ + khẩu hiệu (trái), bản quyền + liên kết (phải) */
export interface AuthFooterProps {
  flags: { code: string; src: string }[];
  tagline: string;
  copyright: string;
  terms: string;
  privacy: string;
}

export interface DemoAccountItem {
  label: string;
  email: string;
  password: string;
  tag: string;
  tone: 'blue' | 'violet';
}

export interface SsoItem {
  id: string;
  name: string;
}

export interface LoginLabels {
  title: string;
  sub: string;
  tabLogin: string;
  tabRegister: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  show: string;
  hide: string;
  remember: string;
  forgot: string;
  submit: string;
  orContinue: string;
  /** "Chưa có tài khoản?" + "Đăng ký tham gia" */
  noAccount: string;
  registerLink: string;
  demoTitle: string;
}

export interface LoginValues {
  identifier: string;
  password: string;
  remember: boolean;
}

export interface LoginPanelProps {
  labels: LoginLabels;
  sso: SsoItem[];
  /** Đang tải danh sách SSO: giữ chỗ một nút để bố cục không dịch khi nút hiện ra */
  ssoPending?: boolean;
  /** Trống = ẩn hộp tài khoản dùng thử (D-35: production tắt) */
  demoAccounts: DemoAccountItem[];
  /** Thông báo đặt từ ngoài (VD: khóa đăng nhập), hiện như lỗi */
  notice?: string | undefined;
  /** Trả về thông báo lỗi để hiện dưới form, hoặc undefined khi thành công */
  onSubmit: (values: LoginValues) => Promise<string | undefined>;
  onRegister?: () => void;
  onForgot?: () => void;
  onSso?: (id: string) => void;
}
