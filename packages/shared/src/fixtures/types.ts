/** Kiểu dữ liệu seed lấy nguyên từ prototype docs/spec/index.html */

export type ToneKey = 'blue' | 'rose' | 'green' | 'amber' | 'violet';
export interface Tone {
  bg: string;
  bd: string;
  fg: string;
}

export type ProvinceRow = [name: string, region: string];

export interface CategorySeed {
  id: string;
  name: string;
  color: string;
  scope: ('project' | 'biz')[];
  on: boolean;
}

export interface RegistrationRoleSeed {
  id: string;
  label: string;
  hint: string;
  suggest: string[];
}

export interface MemberSeed {
  id: string;
  type: 'biz' | 'per';
  name: string;
  email: string;
  cc: string;
  phone: string;
  role: string;
  date: string;
  groups: string[];
  verify?: string;
  persona?: string;
  org?: string;
  company?: string;
  tax?: string;
  field?: string;
  size?: string;
  bizCountry?: string;
  position?: string;
  [extra: string]: unknown;
}

export interface CommunitySeed {
  id: string;
  name: string;
  province: string;
  tag: string;
  members: number;
  weekly: number;
  desc: string;
}

export interface EventSeed {
  id: string;
  dow: string;
  dnum: string;
  day: string;
  time: string;
  title: string;
  place: string;
  mode: 'Online' | 'Offline';
  seats: number;
  reg: number;
  desc: string;
  [extra: string]: unknown;
}

export interface ProjectTeamMember {
  name: string;
  role: string;
  ph: string | null;
  owner?: boolean;
}

export interface ProjectSeed {
  id: string;
  name: string;
  cat: string;
  owner: string;
  comm: string;
  date: string;
  short: string;
  tone: ToneKey;
  status: string;
  stage?: string;
  team?: ProjectTeamMember[];
  [extra: string]: unknown;
}

export interface SsoSeed {
  id: string;
  name: string;
  mono: string;
  color: string;
  [extra: string]: unknown;
}

export interface DemoAccount {
  email: string;
  pwd: string;
  role: 'user' | 'admin';
  label: string;
  meId?: string;
  name?: string;
}

export interface ServiceSeed {
  id: string;
  n: string;
  m: string;
  d: string;
  on: number;
}

export interface LanguageSeed {
  code: string;
  dict: string;
  cc: string;
  flag: string;
  country: string;
  native: string;
}

export interface WelcomeTemplateSeed {
  subject: string;
  intro: string;
  [extra: string]: unknown;
}

/** Bảng seed đầy đủ; khóa trùng tên hằng số trong prototype */
export interface PrototypeSeed {
  PROVINCES: ProvinceRow[];
  CAT_SEED: CategorySeed[];
  REG_ROLES: RegistrationRoleSeed[];
  MEMBERS: MemberSeed[];
  COMMS: CommunitySeed[];
  EVENTS: EventSeed[];
  PROJECTS: ProjectSeed[];
  SSO: SsoSeed[];
  ACCOUNTS: DemoAccount[];
  SVC_SEED: ServiceSeed[];
  TONES: Record<ToneKey, Tone>;
  LANGS: LanguageSeed[];
  WELCOME_TPL: WelcomeTemplateSeed;
  [table: string]: unknown;
}
