import { describe, expect, it } from 'vitest';
import {
  firstStoreNeed,
  STORE_NEED_MESSAGES,
  STORE_STOCK_COVERS,
  storeStepNeeds,
  storeTeamSchema,
} from './store-builder';
import { canPublishStore, storeUpsertSchema } from './stores';
import { extMatchesMime, magicMatches } from './upload-safety';
import { presignRequestSchema, STORE_VIDEO_MAX_BYTES } from './uploads';

const full = {
  name: 'HTX Cà phê Ea Kar',
  field: 'Nông nghiệp & Nông sản',
  province: 'Đắk Lắk',
  intro: 'x'.repeat(40),
  coverUrl: STORE_STOCK_COVERS[0] ?? null,
  items: [{}],
  phone: '0912345678',
  address: '12 Hùng Vương',
};

describe('trình tạo gian hàng 5 bước (TIP-V42-710, D-97)', () => {
  it('điều kiện theo bước như prototype `need`; bước 3 không bắt buộc', () => {
    const empty = { ...full, name: ' ', field: '', province: '', intro: 'ngắn', coverUrl: null };
    expect(storeStepNeeds({ ...empty, items: [], phone: '', address: '' })).toEqual({
      1: ['name', 'field', 'province'],
      2: ['intro', 'cover'],
      3: [],
      4: ['items'],
      5: ['phone', 'address'],
    });
    expect(firstStoreNeed(full)).toBeNull();
    expect(canPublishStore(full)).toBe(true);
  });

  it('Xuất bản nhảy về bước đầu tiên chưa đủ, câu lỗi đúng prototype', () => {
    expect(firstStoreNeed({ ...full, coverUrl: null, phone: '' })).toEqual({
      step: 2,
      key: 'cover',
    });
    expect(STORE_NEED_MESSAGES.cover).toBe('Vui lòng chọn hoặc thêm ảnh bìa');
    expect(firstStoreNeed({ ...full, intro: 'x'.repeat(39) })?.key).toBe('intro');
    expect(firstStoreNeed({ ...full, items: [] })).toEqual({ step: 4, key: 'items' });
    expect(canPublishStore({ ...full, address: ' ' })).toBe(false);
  });

  it('đội ngũ bắt buộc họ tên + chức vụ; trần media theo S5', () => {
    expect(
      storeTeamSchema.safeParse({ name: 'A', role: '', desc: '', photoUrl: null }).success,
    ).toBe(false);
    const base = {
      name: 'Tên',
      slogan: '',
      audience: 'business',
      field: '',
      province: '',
      intro: '',
      coverUrl: null,
      phone: '',
      email: '',
      website: '',
      address: '',
      items: [],
      ward: '',
      logoUrl: null,
      logos: [],
      covers: [],
      hiddenCovers: [],
      vision: '',
      mission: '',
      gallery: [],
      videos: [],
      team: [],
      certs: [],
      docs: [],
      phones: [],
      emails: [],
      addresses: [],
      socials: { zalo: '', fb: 'facebook.com/x', yt: '', tt: '', li: '' },
    };
    expect(storeUpsertSchema.safeParse(base).success).toBe(true);
    const many = Array.from({ length: 13 }, (_, i) => `https://s/${i}.jpg`);
    expect(storeUpsertSchema.safeParse({ ...base, gallery: many }).success).toBe(false);
    expect(
      storeUpsertSchema.safeParse({ ...base, socials: { ...base.socials, fb: 'khong hop le' } })
        .success,
    ).toBe(false);
    expect(
      storeUpsertSchema.safeParse({
        ...base,
        certs: [{ name: 'OCOP 4 sao', org: '', imageUrl: '' }],
      }).success,
    ).toBe(false);
  });
});

describe('upload video / hồ sơ năng lực gian hàng (D-114 S5)', () => {
  const ok = (v: unknown) => presignRequestSchema.safeParse(v).success;

  it('video ≤ 100 MB, tài liệu PDF / PPT / DOC ≤ 20 MB, kind ảnh mới ≤ 5 MB', () => {
    expect(ok({ kind: 'store-video', contentType: 'video/mp4', size: STORE_VIDEO_MAX_BYTES })).toBe(
      true,
    );
    expect(
      ok({ kind: 'store-video', contentType: 'video/mp4', size: STORE_VIDEO_MAX_BYTES + 1 }),
    ).toBe(false);
    expect(ok({ kind: 'store-video', contentType: 'application/pdf', size: 10 })).toBe(false);
    expect(ok({ kind: 'store-doc', contentType: 'application/pdf', size: 20 * 1024 * 1024 })).toBe(
      true,
    );
    expect(ok({ kind: 'store-doc', contentType: 'application/zip', size: 10 })).toBe(false);
    expect(ok({ kind: 'store-doc', contentType: 'text/csv', size: 10 })).toBe(false);
    expect(ok({ kind: 'store-logo', contentType: 'image/png', size: 5 * 1024 * 1024 })).toBe(true);
    expect(ok({ kind: 'store-cert', contentType: 'video/mp4', size: 10 })).toBe(false);
  });

  it('chữ ký MP4 (`ftyp`), WebM (EBML); đuôi khớp MIME', () => {
    const mp4 = new Uint8Array([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
    expect(magicMatches('video/mp4', mp4)).toBe(true);
    expect(magicMatches('video/webm', new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0]))).toBe(true);
    expect(magicMatches('video/mp4', new Uint8Array([0x4d, 0x5a, 0, 0, 0, 0, 0, 0]))).toBe(false);
    expect(extMatchesMime('gioi-thieu.mov', 'video/quicktime')).toBe(true);
    expect(extMatchesMime('gioi-thieu.pdf', 'video/mp4')).toBe(false);
  });
});
