'use client';

import { STORE_STEPS, type StoreDetail, type StoreStep } from '@opchub/shared/api-domains';
import { useTranslations } from 'next-intl';
import { useStoreMedia } from '../../hooks/use-store-media';
import { type StoreWizard as Wz, useStoreWizard } from '../../hooks/use-store-wizard';
import { WizardPreview } from './preview';
import { StepContact } from './step-contact';
import { StepInfo } from './step-info';
import { StepItems } from './step-items';
import { StepMedia } from './step-media';
import { StepProfile } from './step-profile';
import w from './wizard.module.css';

interface Props {
  store: StoreDetail;
  /** Vào từ "Chỉnh sửa gian hàng" (prototype `isEd`) */
  edit: boolean;
  /** Bước mở đầu (nút "Quản lý" ở dashboard → bước 4) */
  initialStep?: StoreStep;
  onExit: () => void;
}

/** Thanh 5 bước: ✓ khi xong, bấm để nhảy (chặn khi bước trước chưa đủ — prototype `go`) */
function StepBar({ wz }: { wz: Wz }) {
  const t = useTranslations('stores.wizard');
  return (
    <div className={w.steps}>
      {STORE_STEPS.map((n) => {
        const done = n < wz.step && wz.needs[n].length === 0;
        return (
          <button
            key={n}
            type="button"
            className={w.step}
            data-on={n === wz.step || done ? '1' : '0'}
            data-cur={n === wz.step ? '1' : '0'}
            aria-current={n === wz.step ? 'step' : undefined}
            onClick={() => wz.go(n)}
          >
            <span className={w.num}>{done ? '✓' : n}</span>
            <span className={w.stepText}>
              <span className={w.stepRow}>
                <span className={w.stepName}>{t(`steps.${n}`)}</span>
                {n < 5 ? <span className={w.line} data-done={n < wz.step ? '1' : '0'} /> : null}
              </span>
              <span className={w.stepSub}>{t(`stepSubs.${n}`)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Footer({ wz, uploading }: { wz: Wz; uploading: boolean }) {
  const t = useTranslations('stores.wizard');
  const busy = wz.busy || uploading;
  return (
    <div className={w.foot}>
      <div>
        {wz.step > 1 ? (
          <button type="button" className={w.btn} onClick={wz.back}>
            {t('back')}
          </button>
        ) : null}
      </div>
      <div className={w.footEnd}>
        <button type="button" className={w.btn} disabled={busy} onClick={wz.saveDraft}>
          {t(wz.live ? 'saveChanges' : 'saveDraft')}
        </button>
        {wz.step < 5 ? (
          <button
            type="button"
            className={w.primary}
            onClick={() => wz.go((wz.step + 1) as StoreStep)}
          >
            {t('next')}
          </button>
        ) : (
          <button type="button" className={w.primary} disabled={busy} onClick={wz.submit}>
            {t(wz.edit ? 'saveChanges' : 'publish')}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * D-97 trình tạo / sửa gian hàng 5 bước (prototype "Portal · Tạo gian hàng", index.html :1996 → 2163):
 * tiêu đề + "Bước N/5" + Thoát, thanh bước, form theo bước + xem trước dính bên phải, chân Quay lại ·
 * Lưu nháp · Tiếp tục / Xuất bản. Server lưu toàn bộ một lần (PUT /me/store).
 */
export function StoreWizard({ store, edit, initialStep, onExit }: Props) {
  const t = useTranslations('stores.wizard');
  const wz = useStoreWizard(store, edit, onExit, initialStep);
  const media = useStoreMedia();
  const props = { draft: wz.draft, set: wz.set, media };
  return (
    <div className={w.wrap} data-screen="stores-wizard">
      {store.status === 'hidden' ? (
        <div className={`${w.banner} ${w.bannerHidden}`}>{t('hiddenBanner')}</div>
      ) : null}
      <div className={w.head}>
        <div className={w.headTop}>
          <div className={w.headText}>
            <span className={w.title}>{t(edit ? 'titleEdit' : 'titleCreate')}</span>
            <span className={w.desc}>{t('desc')}</span>
          </div>
          <div className={w.headEnd}>
            <span className={w.stepT}>{t('stepOf', { n: wz.step })}</span>
            <button type="button" className={`${w.btn} ${w.exit}`} onClick={onExit}>
              {t('exit')}
            </button>
          </div>
        </div>
        <StepBar wz={wz} />
      </div>
      <div className={w.cols}>
        <div className={w.form}>
          <div className={w.formBody}>
            {wz.step === 1 ? <StepInfo draft={wz.draft} set={wz.set} /> : null}
            {wz.step === 2 ? <StepMedia {...props} /> : null}
            {wz.step === 3 ? <StepProfile {...props} /> : null}
            {wz.step === 4 ? <StepItems draft={wz.draft} set={wz.set} /> : null}
            {wz.step === 5 ? <StepContact draft={wz.draft} set={wz.set} /> : null}
          </div>
          <Footer wz={wz} uploading={media.uploading} />
        </div>
        <WizardPreview draft={wz.draft} />
      </div>
    </div>
  );
}
