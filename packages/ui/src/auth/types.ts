export interface AuthStat {
  value: string;
  label: string;
}

export interface AuthQuote {
  text: string;
  name: string;
  role: string;
  img: string;
}

export interface AuthHeroCopy {
  logoAlt: string;
  onlineSuffix: string;
  eyebrow: string;
  headlineLead: string;
  headlineAccent: string;
  sub: string;
  newMembersCount: string;
  newMembersLabel: string;
  stats: AuthStat[];
  presentIn: string;
  copyright: string;
}

export interface AuthHeroProps {
  logoSrc: string;
  online: string;
  copy: AuthHeroCopy;
  quote: AuthQuote;
  images: { main: string; side: string; avatars: string[] };
  flags: { code: string; src: string }[];
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
  terms: string;
  privacy: string;
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
  demoAccounts: DemoAccountItem[];
  /** Trả về thông báo lỗi để hiện dưới form, hoặc undefined khi thành công */
  onSubmit: (values: LoginValues) => Promise<string | undefined>;
  onRegister?: () => void;
  onForgot?: () => void;
  onSso?: (id: string) => void;
}
