import { apiErrorSchema, loginResponseSchema } from '@opchub/shared/api';
import {
  EMPTY_STORE_BUILDER,
  STORE_STOCK_COVERS,
  storeDetailSchema,
  type StoreUpsert,
} from '@opchub/shared/api-domains';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { STORAGE } from '@/common/integrations';
import { StoreAutoCreateHandler } from '@/modules/local-business';
import { tokenOf } from '../factories/group.factory';
import { createUser, flushAuthState } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';
import {
  appPath,
  fileBytes,
  type TempStorage,
  tempStorage,
  uploadPng,
} from '../uploads/storage.helper';

const OTP = '123456';
const INTRO = 'Rang xay cà phê Robusta Ea Kar cho quán và văn phòng, giao hàng toàn quốc.';

const BASE: StoreUpsert = {
  name: 'HTX Cà phê Ea Kar',
  slogan: 'Cà phê sạch từ cao nguyên',
  audience: 'organization',
  field: 'Chế biến thực phẩm',
  province: 'Đắk Lắk',
  intro: INTRO,
  coverUrl: STORE_STOCK_COVERS[1] ?? null,
  phone: '0262 3850 111',
  email: '',
  website: 'eakar.vn',
  address: '12 Hùng Vương, Ea Kar',
  ...EMPTY_STORE_BUILDER,
  items: [{ kind: 'product', name: 'Cà phê rang', price: 180000, description: '', imageUrl: null }],
};

/**
 * TIP-V42-710 (D-97, D-114): trình tạo 5 bước — đăng ký TK DN tự có Nháp, media của chính chủ,
 * điều kiện theo bước, "Lưu thay đổi" khi đang hiển thị (S8 B), tệp thực thi đội lốt tài liệu.
 */
describe('Trình tạo gian hàng (TIP-V42-710)', () => {
  let t: TestApp;
  let store: TempStorage;

  beforeAll(async () => {
    store = await tempStorage();
    t = await createTestApp({ overrides: [[STORAGE, store.provider]] });
  });
  beforeEach(() => flushAuthState(t));
  afterAll(async () => {
    await t.prisma.db.store.deleteMany({
      where: { owner: { email: { endsWith: '@test.opchub.vn' } } },
    });
    await t.close();
    await store.dispose();
  });

  async function draftOwner() {
    const u = await createUser(t, { accountType: 'business', fee: 'trial' });
    await t.app
      .get(StoreAutoCreateHandler)
      .onTrialStarted({ userId: u.id, accountType: 'business' });
    return { u, token: await tokenOf(t, u) };
  }
  const save = (token: string, json: StoreUpsert) =>
    t.call('/me/store', { method: 'PUT', token, json });
  const publish = (token: string) => t.call('/me/store/publish', { method: 'POST', token });
  const errorOf = async (r: Response) => apiErrorSchema.parse(await r.json()).error;

  async function upload(token: string, kind: string, contentType: string, body: Uint8Array) {
    const r = await t.call('/uploads/presign', {
      method: 'POST',
      token,
      json: { kind, contentType, size: body.length },
    });
    expect(r.status).toBe(200);
    const { uploadUrl, publicUrl } = (await r.json()) as { uploadUrl: string; publicUrl: string };
    const put = await t.call(appPath(uploadUrl), {
      method: 'PUT',
      body,
      headers: { 'Content-Type': contentType },
    });
    expect(put.status).toBe(200);
    return publicUrl;
  }

  it('CR-16: đăng ký TK Doanh nghiệp → outbox trial_started → gian hàng Nháp tự tạo', async () => {
    const email = `st710-${Date.now().toString(36)}@test.opchub.vn`;
    const reg = await t.call('/auth/register/business', {
      method: 'POST',
      json: {
        representative: 'Nguyễn Văn An',
        position: 'Giám đốc',
        phone: { country: 'vn', number: '' },
        email,
        password: '',
        agreeTerms: true,
      },
    });
    expect(reg.status).toBe(202);
    const ok = await t.call('/auth/otp/verify', { method: 'POST', json: { email, code: OTP } });
    const login = loginResponseSchema.parse(await ok.json());
    const ev = await t.prisma.db.outboxEvent.findFirstOrThrow({
      where: {
        type: 'membership_fee.trial_started',
        payload: { path: ['userId'], equals: login.me.id },
      },
    });
    await t.app
      .get(StoreAutoCreateHandler)
      .onTrialStarted({ userId: login.me.id, accountType: 'business' });
    await t.app
      .get(StoreAutoCreateHandler)
      .onTrialStarted({ userId: login.me.id, accountType: 'business' });
    expect(ev.payload).toMatchObject({ accountType: 'business' });
    const res = await t.call('/me/store', { token: login.accessToken });
    expect(storeDetailSchema.parse(await res.json())).toMatchObject({
      status: 'draft',
      autoCreated: true,
      name: 'Nguyễn Văn An',
      email,
    });
    expect(await t.prisma.db.store.count({ where: { ownerId: login.me.id } })).toBe(1);
  });

  it('D-97: thiếu ảnh bìa → Xuất bản 400 bước 2; Lưu nháp không kiểm; đủ → hiện, hết "tự tạo"', async () => {
    const { token } = await draftOwner();
    const draft = await save(token, { ...BASE, coverUrl: null, phone: '' });
    expect(draft.status).toBe(200);
    const bad = await publish(token);
    expect(bad.status).toBe(400);
    expect(await errorOf(bad)).toMatchObject({
      message: 'Vui lòng chọn hoặc thêm ảnh bìa',
      fields: [{ path: 'step.2' }],
    });
    expect((await save(token, BASE)).status).toBe(200);
    const pub = storeDetailSchema.parse(await (await publish(token)).json());
    expect(pub).toMatchObject({ status: 'published', autoCreated: false, coverUrl: BASE.coverUrl });
  });

  it('D-114 S8: đang hiển thị → "Lưu thay đổi" giữ hiển thị; thiếu hotline → 400 bước 5', async () => {
    const { token } = await draftOwner();
    await save(token, BASE);
    await publish(token);
    const bad = await save(token, { ...BASE, phone: '' });
    expect(bad.status).toBe(400);
    expect(await errorOf(bad)).toMatchObject({
      message: 'Vui lòng nhập hotline',
      fields: [{ path: 'step.5' }],
    });
    const ok = storeDetailSchema.parse(
      await (await save(token, { ...BASE, slogan: 'Slogan mới', phones: ['0905 111 222'] })).json(),
    );
    expect(ok).toMatchObject({
      status: 'published',
      slogan: 'Slogan mới',
      phones: ['0905 111 222'],
    });
  });

  it('media của chính chủ: logo / đội ngũ / chứng nhận / video / tài liệu lưu; URL người khác 400; .exe 422', async () => {
    const { token } = await draftOwner();
    const other = await tokenOf(t, await createUser(t, { accountType: 'business', fee: 'active' }));
    const logo = await uploadPng(t, token, 'store-logo');
    const cert = await uploadPng(t, token, 'store-cert');
    const video = await upload(token, 'store-video', 'video/mp4', fileBytes('video/mp4', 4096));
    const doc = await upload(
      token,
      'store-doc',
      'application/pdf',
      fileBytes('application/pdf', 2048),
    );
    const body: StoreUpsert = {
      ...BASE,
      ward: 'Xã Ea Kar',
      logos: [logo],
      logoUrl: logo,
      vision: 'Dẫn đầu cà phê đặc sản Tây Nguyên',
      certs: [{ name: 'OCOP 4 sao', org: 'UBND tỉnh Đắk Lắk', imageUrl: cert }],
      videos: [{ url: video, title: 'Thu hoạch' }],
      docs: [{ name: 'Ho-so-nang-luc.pdf', ext: '', size: '', url: doc }],
      socials: { ...BASE.socials, fb: 'facebook.com/eakar' },
    };
    const s = storeDetailSchema.parse(await (await save(token, body)).json());
    expect(s).toMatchObject({
      ward: 'Xã Ea Kar',
      logoUrl: logo,
      certs: [{ name: 'OCOP 4 sao', imageUrl: cert }],
      videos: [{ url: video, title: 'Thu hoạch' }],
      docs: [{ name: 'Ho-so-nang-luc.pdf', ext: 'PDF', size: '2 KB', url: doc }],
      socials: { fb: 'facebook.com/eakar' },
    });
    const row = await t.prisma.db.store.findUniqueOrThrow({
      where: { id: s.id },
      select: { mediaUrls: true },
    });
    expect(row.mediaUrls).toEqual(expect.arrayContaining([logo, cert, video, doc]));

    const foreign = await uploadPng(t, other, 'store-logo');
    const steal = await save(token, { ...body, logos: [logo, foreign] });
    expect(steal.status).toBe(400);
    expect((await errorOf(steal)).fields?.[0]?.path).toBe('logos.1');
    expect((await save(token, { ...body, logoUrl: foreign })).status).toBe(400);

    const exe = await upload(
      token,
      'store-doc',
      'application/pdf',
      fileBytes('application/pdf', 512),
    );
    const rej = await save(token, {
      ...body,
      docs: [...body.docs, { name: 'bang-gia.pdf.exe', ext: '', size: '', url: exe }],
    });
    expect(rej.status).toBe(422);
    expect((await errorOf(rej)).code).toBe('FILE_REJECTED');

    // Gỡ chứng nhận → ảnh vào hàng đợi dọn rác cùng transaction
    await save(token, { ...body, certs: [] });
    const key = cert.slice(store.provider.publicUrl('').length);
    expect(await t.prisma.db.storageGc.count({ where: { key } })).toBe(1);
  });

  it('ảnh bìa ngoài 6 ảnh mẫu / ảnh chưa tải → 400; TK Cá nhân 403', async () => {
    const { token } = await draftOwner();
    const bad = await save(token, { ...BASE, coverUrl: 'https://evil.example/cover.jpg' });
    expect(bad.status).toBe(400);
    expect((await errorOf(bad)).fields?.[0]?.path).toBe('coverUrl');
    const per = await tokenOf(t, await createUser(t, { fee: 'active' }));
    expect((await t.call('/me/store', { token: per })).status).toBe(403);
  });
});
