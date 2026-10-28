'use client';

import { STORE_LIMITS, type StoreUpsert } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { StoreMedia } from '../../hooks/use-store-media';
import type { DraftPatch } from '../../hooks/use-store-wizard';
import { storeInitials } from '../../model';
import f from './fields.module.css';
import { FileInput } from './media-tiles';
import p from './profile.module.css';
import { StepCerts } from './step-certs';

interface Props {
  draft: StoreUpsert;
  set: DraftPatch;
  media: StoreMedia;
}

const EMPTY = { name: '', role: '', desc: '', photoUrl: null as string | null };

/** Đội ngũ chuyên gia: ảnh 72px tuỳ chọn, Họ và tên * + Chức vụ *, chuyên môn; thẻ 44px có × */
function Team({ draft, set, media }: Props) {
  const t = useTranslations('stores.wizard');
  const toast = useToast();
  const [v, setV] = useState(EMPTY);
  const add = () => {
    if (!v.name.trim() || !v.role.trim()) return toast(t('needTeam'));
    const m = {
      name: v.name.trim(),
      role: v.role.trim(),
      desc: v.desc.trim(),
      photoUrl: v.photoUrl,
    };
    set((d) => ({ team: [...d.team, m].slice(0, STORE_LIMITS.team) }));
    setV(EMPTY);
  };
  return (
    <>
      <span className={f.section}>{t('team')}</span>
      <div className={`${f.box} ${p.teamBox}`}>
        <label
          className={p.photo}
          style={v.photoUrl ? { backgroundImage: `url('${v.photoUrl}')` } : undefined}
        >
          {v.photoUrl ? null : <span>{t.rich('teamPhoto', { br: () => <br /> })}</span>}
          <FileInput
            accept="image/png,image/jpeg,image/webp"
            label={t('teamPhotoLabel')}
            pick={media.team}
            apply={(url) => setV((x) => ({ ...x, photoUrl: url }))}
          />
        </label>
        <div className={p.teamFields}>
          <div className={p.twoCol}>
            <input
              className={f.input}
              value={v.name}
              placeholder={t('teamName')}
              onChange={(e) => setV({ ...v, name: e.target.value })}
            />
            <input
              className={f.input}
              value={v.role}
              placeholder={t('teamRole')}
              onChange={(e) => setV({ ...v, role: e.target.value })}
            />
          </div>
          <input
            className={f.input}
            value={v.desc}
            placeholder={t('teamDesc')}
            onChange={(e) => setV({ ...v, desc: e.target.value })}
          />
          <button type="button" className={f.dashed} onClick={add}>
            {t('addTeam')}
          </button>
        </div>
      </div>
      <div className={p.teamList}>
        {draft.team.map((m, i) => (
          <div key={`${m.name}-${i}`} className={p.member}>
            <span
              className={p.avatar}
              style={m.photoUrl ? { backgroundImage: `url('${m.photoUrl}')` } : undefined}
            >
              {m.photoUrl ? null : storeInitials(m.name)}
            </span>
            <div className={p.memberText}>
              <span className={p.memberName}>{m.name}</span>
              <span className={p.memberRole}>{m.role}</span>
            </div>
            <button
              type="button"
              className={p.memberX}
              title={t('remove')}
              onClick={() => set((d) => ({ team: d.team.filter((_, j) => j !== i) }))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

/** Hồ sơ năng lực & tài liệu: dòng loại / tên / cỡ + "Xóa", ô tải PDF · PPT · DOC (nhiều tệp) */
function Docs({ draft, set, media }: Props) {
  const t = useTranslations('stores.wizard');
  return (
    <>
      <span className={f.section}>{t('docs')}</span>
      <div className={p.docs}>
        {draft.docs.map((d) => (
          <div key={d.url} className={p.doc}>
            <span className={p.docType}>{d.ext}</span>
            <div className={p.docText}>
              <span className={p.docName}>{d.name}</span>
              <span className={p.docSize}>{d.size}</span>
            </div>
            <button
              type="button"
              className={f.del}
              onClick={() => set((x) => ({ docs: x.docs.filter((y) => y.url !== d.url) }))}
            >
              {t('delete')}
            </button>
          </div>
        ))}
        <label className={p.upload}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          <span>{t('addDoc')}</span>
          <FileInput
            accept=".pdf,.ppt,.pptx,.doc,.docx"
            multiple
            label={t('addDoc')}
            pick={media.doc}
            apply={(url, file) =>
              set((x) => ({
                docs: [...x.docs, docOf(url, file)].slice(0, STORE_LIMITS.docs),
              }))
            }
          />
        </label>
      </div>
    </>
  );
}

/** Như prototype `addDoc`: loại = đuôi in hoa, cỡ "x.x MB" (server tính lại khi lưu) */
const docOf = (url: string, file: File) => ({
  url,
  name: file.name.slice(0, 120),
  ext: (file.name.split('.').pop() ?? 'FILE').toUpperCase().slice(0, 8),
  size: `${(file.size / 1048576).toFixed(1)} MB`,
});

/** Bước 3 "Hồ sơ & đội ngũ" (prototype :2061 → 2087) — không bắt buộc */
export function StepProfile(props: Props) {
  const t = useTranslations('stores.wizard');
  return (
    <>
      <span className={f.h}>{t('profileTitle')}</span>
      <span className={f.sub}>{t('profileSub')}</span>
      <Team {...props} />
      <StepCerts {...props} />
      <Docs {...props} />
    </>
  );
}
