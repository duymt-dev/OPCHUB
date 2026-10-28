'use client';

import type { StoreDetail } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { storeInitials } from '../model';
import { CardIcon } from './card-icon';
import styles from './detail.module.css';
import p from './detail-profile.module.css';

const VISION_ICON = 'M12 2l9 5v10l-9 5-9-5V7zM12 22V12M21 7l-9 5-9-5';
const TEAM_ICON =
  'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8';
const CERT_ICON = 'M4 4h16v12H4zM8 20l4-3 4 3M8 9h8M8 12h5';
const MISSION_ICON = 'M12 22a10 10 0 100-20 10 10 0 000 20zM8 12l3 3 5-6';
const CERT_FALLBACK = 'M12 15a5 5 0 100-10 5 5 0 000 10zM8.5 13.5L7 22l5-3 5 3-1.5-8.5';

/** "Tầm nhìn & Sứ mệnh" (prototype index.html :2341 → 2345) — chỉ hiện khi có ít nhất 1 trong 2 */
export function DetailVisionMission({ s }: { s: StoreDetail }) {
  const t = useTranslations('stores.detail');
  if (!s.vision.trim() && !s.mission.trim()) return null;
  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <CardIcon d={VISION_ICON} />
        <span>{t('profile.visionMission')}</span>
      </div>
      <div className={p.vmGrid}>
        {s.vision.trim() ? (
          <div className={`${p.vmBox} ${p.vmVision}`}>
            <span className={`${p.vmIcon} ${p.vmIconVision}`}>
              <CardIcon d={VISION_ICON} />
            </span>
            <div className={p.vmText}>
              <b>{t('profile.vision')}</b>
              <span>{s.vision}</span>
            </div>
          </div>
        ) : null}
        {s.mission.trim() ? (
          <div className={`${p.vmBox} ${p.vmMission}`}>
            <span className={`${p.vmIcon} ${p.vmIconMission}`}>
              <CardIcon d={MISSION_ICON} />
            </span>
            <div className={p.vmText}>
              <b>{t('profile.mission')}</b>
              <span>{s.mission}</span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** "Đội ngũ chuyên gia" (prototype :2347 → 2349) — hàng cuộn ngang, ảnh thật hoặc chữ viết tắt */
export function DetailTeam({ s }: { s: StoreDetail }) {
  const t = useTranslations('stores.detail');
  if (s.team.length === 0) return null;
  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <CardIcon d={TEAM_ICON} />
        <span>{t('profile.team')}</span>
      </div>
      <div className={p.row}>
        {s.team.map((m, i) => (
          <div key={`${m.name}-${i}`} className={p.member}>
            <div
              className={p.memberPhoto}
              style={m.photoUrl ? { backgroundImage: `url('${m.photoUrl}')` } : undefined}
            >
              {m.photoUrl ? null : storeInitials(m.name)}
            </div>
            <div className={p.memberText}>
              <b>{m.name}</b>
              <span className={p.memberRole}>{m.role}</span>
              {m.desc ? <span className={p.memberDesc}>{m.desc}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** "Giấy chứng nhận" (prototype :2350 → 2351) — ảnh 4:3 thật, trống → biểu tượng + tên */
export function DetailCerts({ s }: { s: StoreDetail }) {
  const t = useTranslations('stores.detail');
  if (s.certs.length === 0) return null;
  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <CardIcon d={CERT_ICON} />
        <span>{t('profile.certs')}</span>
      </div>
      <div className={p.row}>
        {s.certs.map((c, i) => (
          <div key={`${c.imageUrl}-${i}`} className={p.cert}>
            <div className={p.certImg}>
              {c.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- ảnh chứng nhận storage động
                <img src={c.imageUrl} alt="" />
              ) : (
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1677FF"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={CERT_FALLBACK} />
                </svg>
              )}
            </div>
            <span className={p.certName}>{c.name}</span>
            <span className={p.certOrg}>{c.org}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
