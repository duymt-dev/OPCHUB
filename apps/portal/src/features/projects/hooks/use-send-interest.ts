'use client';

import type { CreateInterestPortal, ProjectDetail } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { projectKeys, sendInterest } from '../api';
import { useErrorToast } from './use-project-actions';

/**
 * Gửi quan tâm đầu tư với Idempotency-Key (SRS §13.1). Một khoá cho một lần mở form:
 * bấm lại / gửi lại do mạng chập chờn vẫn cùng khoá nên server không tạo bản ghi trùng.
 */
export function useSendInterest(p: ProjectDetail, onDone: () => void) {
  const t = useTranslations('projects.invest');
  const toast = useToast();
  const qc = useQueryClient();
  const onError = useErrorToast();
  const [key] = useState(() => crypto.randomUUID());
  return useMutation({
    mutationFn: (body: CreateInterestPortal) => sendInterest(p.id, body, key),
    onSuccess: () => {
      toast(t('sentToast', { name: p.ownerName }));
      void qc.invalidateQueries({ queryKey: projectKeys.detail(p.id) });
      void qc.invalidateQueries({ queryKey: projectKeys.threads() });
      onDone();
    },
    onError,
  });
}
