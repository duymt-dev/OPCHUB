'use client';

import { useToast } from '@opchub/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { exportGroupMembers, fetchGroupMembers, groupKeys } from '../api';
import { exportCell, exportFile, exportName, type CellLabels } from '../model';
import {
  DEFAULT_EXPORT_FIELDS,
  EXPORT_FIELDS,
  type ExportField,
  type ExportFormat,
  type ExportStatus,
} from '../types';
import { useErrorToast } from './use-groups';

const PREVIEW_ROWS = 6;

function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

/** Trạng thái + dữ liệu hộp "Xuất danh sách thành viên nhóm" (gx* của prototype) */
export function useExportState(initial: string[], onDone: () => void) {
  const t = useTranslations('groups.export');
  const tt = useTranslations('groups.toast');
  const toast = useToast();
  const onError = useErrorToast();
  const [sel, setSel] = useState<string[]>(initial);
  const [fields, setFields] = useState<ExportField[]>(DEFAULT_EXPORT_FIELDS);
  const [status, setStatus] = useState<ExportStatus>('all');
  const [format, setFormat] = useState<ExportFormat>('csv');

  const members = useQuery({
    queryKey: groupKeys.members(sel, status),
    queryFn: () => fetchGroupMembers(sel, status),
    enabled: sel.length > 0,
    placeholderData: (prev) => prev,
  });
  const rows = useMemo(() => (sel.length ? (members.data?.items ?? []) : []), [members.data, sel]);
  const cols = EXPORT_FIELDS.filter((f) => fields.includes(f));
  const labels = Object.fromEntries(
    (['business', 'personal', 'owner', 'lecturer', 'member', 'active', 'locked'] as const).map(
      (k) => [k, t(`cell.${k}`)],
    ),
  ) as CellLabels;
  const head = cols.map((c) => t(`field.${c}`));
  const table = rows.map((r) => cols.map((c) => exportCell(r, c, labels) || '—'));

  const job = useMutation({ mutationFn: exportGroupMembers, onError });
  const submit = () => {
    if (!sel.length) return toast(t('errGroups'));
    if (!cols.length) return toast(t('errFields'));
    if (!rows.length) return toast(t('errEmpty'));
    // Ghi audit qua API trước, rồi tạo file ở trình duyệt như prototype
    job.mutate(
      { groupIds: sel, fields: cols, status, format },
      {
        onSuccess: () => {
          const name = `${exportName(new Date())}.${format}`;
          download(exportFile(head, table, format), name);
          toast(tt('exported', { count: rows.length, file: name }));
          onDone();
        },
      },
    );
  };

  return {
    sel,
    setSel,
    fields,
    toggleField: (f: ExportField) =>
      setFields((x) => (x.includes(f) ? x.filter((y) => y !== f) : [...x, f])),
    status,
    setStatus,
    format,
    setFormat,
    rows: rows.length,
    head,
    preview: table.slice(0, PREVIEW_ROWS),
    more: rows.length > PREVIEW_ROWS,
    submit,
  };
}
