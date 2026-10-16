'use client';

import { useTranslations } from 'next-intl';
import { useMemberCounts } from '../hooks/use-groups';
import { useExportState } from '../hooks/use-export';
import type { AdminGroup } from '../types';
import { FieldPick, GroupPick, Preview, StatusFormat } from './export-sections';
import { Dialog } from './overlay';
import btn from './overlay.module.css';

interface BodyProps {
  groups: AdminGroup[];
  initial: string[];
  onClose: () => void;
}

function DownloadIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12M7 10l5 5 5-5M4 19h16" />
    </svg>
  );
}

function ExportBody({ groups, initial, onClose }: BodyProps) {
  const t = useTranslations('groups.export');
  const s = useExportState(initial, onClose);
  const counts = useMemberCounts(true).data ?? {};
  // Danh sách chọn nhóm theo thứ tự gốc (không theo sắp xếp của lưới)
  const ordered = [...groups].sort((a, b) => a.order - b.order);

  return (
    <Dialog
      open
      title={t('title')}
      closeLabel={t('close')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={btn.btn} onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="button" className={btn.primary} onClick={s.submit}>
            <DownloadIcon />
            {t('download', { count: s.rows })}
          </button>
        </>
      }
    >
      <GroupPick s={s} ordered={ordered} counts={counts} />
      <FieldPick s={s} />
      <StatusFormat s={s} />
      <Preview s={s} />
    </Dialog>
  );
}

/** D-31: hộp xuất — mở từ "Xuất dữ liệu" (mọi nhóm), "Xuất DS" (1 nhóm) hoặc bulk "Xuất CSV" */
export function ExportModal({
  target,
  groups,
  onClose,
}: {
  target: string[] | null;
  groups: AdminGroup[];
  onClose: () => void;
}) {
  if (!target) return null;
  return <ExportBody groups={groups} initial={target} onClose={onClose} />;
}
