import { describe, expect, it, vi, beforeEach } from 'vitest';
import requestConfig from './request';
import { messages } from './messages';
import { logger } from '@/lib/logger';

const mocks = vi.hoisted(() => ({ cookie: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: () => (mocks.cookie === undefined ? undefined : { value: mocks.cookie }),
    }),
}));
vi.mock('next-intl/server', () => ({ getRequestConfig: (create: unknown) => create }));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.cookie = undefined;
});
const config = () => requestConfig({ requestLocale: Promise.resolve(undefined) });

describe('D-141 AC824-01/04 request-scoped messages, no authOverrides', () => {
  it.each([undefined, 'xx', '../../en', '__proto__', 'constructor'])(
    'fails closed for cookie %s',
    async (cookie) => {
      mocks.cookie = cookie;
      const result = await config();
      expect(result.locale).toBe('vi');
      expect(result.timeZone).toBe('Asia/Ho_Chi_Minh');
      expect(result.messages).toBe(messages);
    },
  );

  it('loads the actual English auth, profile, overview and metadata catalogs, not a few login overrides', async () => {
    mocks.cookie = 'en-SG';
    const result = await config();
    expect(result.locale).toBe('en-SG');
    expect(result.messages).toMatchObject({
      auth: {
        login: { submit: 'Sign in' },
        twoFactor: { title: 'Set up two-factor authentication' },
      },
      common: { adminProfile: { title: 'My profile' } },
      overview: { title: 'Overview' },
      meta: { profile: 'My profile' },
      settings: {
        general: { heading: 'Platform details' },
        roles: { heading: 'Roles & Permissions' },
        mail: { heading: 'Welcome email' },
        log: { heading: 'Administrator activity log' },
        price: { heading: 'Pricing configuration' },
        ai: { heading: 'AI providers' },
      },
    });
    expect(messages.auth.login.submit).toBe('Đăng nhập');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('D-141 AC824-07 loads full Filipino catalogs and all six settings parts without fallback', async () => {
    mocks.cookie = 'fil';
    const result = await config();
    expect(result.locale).toBe('fil');
    expect(logger.warn).not.toHaveBeenCalled();
    expect(result.messages).toMatchObject({
      auth: { login: { submit: 'Mag-sign in' } },
      common: { adminProfile: { title: 'Personal na profile' } },
      overview: { title: 'Pangkalahatang-ideya' },
      reports: { title: 'Mga Ulat' },
      settings: {
        general: { heading: 'Mga detalye ng platform' },
        roles: { heading: 'Mga Tungkulin at Pahintulot' },
        mail: { heading: 'Welcome email' },
        log: { heading: 'Talaan ng aktibidad ng administrador' },
        price: { heading: 'Konfigurasyon ng pagpepresyo' },
        ai: { heading: 'Mga AI provider' },
      },
    });
    expect(messages.auth.login.submit).toBe('Đăng nhập');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it.each(['ms', 'ms-BN'])(
    'D-141 AC824-07 loads actual Malay catalogs for %s without losing alias identity',
    async (locale) => {
      mocks.cookie = locale;
      const result = await config();
      expect(result.locale).toBe(locale);
      expect(result.messages).toMatchObject({
        auth: { login: { submit: 'Log masuk' } },
        common: { adminProfile: { title: 'Profil peribadi' } },
        overview: { title: 'Gambaran keseluruhan' },
        reports: { title: 'Laporan' },
        settings: {
          general: { heading: 'Maklumat platform' },
          roles: { heading: 'Peranan & Kebenaran' },
          mail: { heading: 'E-mel sambutan' },
          log: { heading: 'Log aktiviti pentadbir' },
          price: { heading: 'Konfigurasi harga' },
          ai: { heading: 'Penyedia AI' },
        },
      });
      expect(messages.auth.login.submit).toBe('Đăng nhập');
      expect(logger.warn).not.toHaveBeenCalled();
    },
  );

  it('D-141 AC824-07 loads actual Indonesian domains and all six settings parts without fallback', async () => {
    mocks.cookie = 'id';
    const result = await config();
    expect(result.locale).toBe('id');
    expect(result.messages).toMatchObject({
      auth: { login: { submit: 'Masuk' } },
      common: { adminProfile: { title: 'Profil pribadi' } },
      overview: { title: 'Ringkasan' },
      reports: { title: 'Laporan' },
      settings: {
        general: { heading: 'Informasi platform' },
        roles: { heading: 'Peran & Izin' },
        mail: { heading: 'Email sambutan' },
        log: { heading: 'Log aktivitas administrator' },
        price: { heading: 'Konfigurasi harga' },
        ai: { heading: 'Penyedia AI' },
      },
    });
    expect(messages.auth.login.submit).toBe('Đăng nhập');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('D-141 AC824-07 loads actual Thai domains and all six settings parts without fallback', async () => {
    mocks.cookie = 'th';
    const result = await config();
    expect(result.locale).toBe('th');
    expect(result.messages).toMatchObject({
      auth: { login: { submit: 'เข้าสู่ระบบ' } },
      common: { adminProfile: { title: 'โปรไฟล์ส่วนตัว' } },
      overview: { title: 'ภาพรวม' },
      reports: { title: 'รายงาน' },
      settings: {
        general: { heading: 'ข้อมูลแพลตฟอร์ม' },
        roles: { heading: 'บทบาทและสิทธิ์' },
        mail: { heading: 'อีเมลต้อนรับ' },
        log: { heading: 'บันทึกกิจกรรมผู้ดูแล' },
        price: { heading: 'ตั้งค่าราคา' },
        ai: { heading: 'ผู้ให้บริการ AI' },
      },
    });
    expect(messages.auth.login.submit).toBe('Đăng nhập');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('D-141 AC824-07 loads actual Chinese domains and all six settings parts without changing source', async () => {
    const read = async (bundle: string, file: string): Promise<unknown> =>
      import(`../../messages/${bundle}/${file}.json`);
    expect(await read('zh', 'auth')).toMatchObject({ default: { login: { submit: '登录' } } });
    mocks.cookie = 'zh';
    const result = await config();
    expect(result.locale).toBe('zh');
    expect(result.messages).toMatchObject({
      auth: { login: { submit: '登录' } },
      common: { adminProfile: { title: '个人资料' } },
      overview: { title: '概览' },
      reports: { title: '报表' },
      settings: {
        general: { heading: '平台信息' },
        roles: { heading: '角色与权限' },
        mail: { heading: '欢迎邮件' },
        log: { heading: '管理员操作日志' },
        price: { heading: '价格设置' },
        ai: { heading: 'AI 提供商' },
      },
    });
    expect(messages.auth.login.submit).toBe('Đăng nhập');
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
