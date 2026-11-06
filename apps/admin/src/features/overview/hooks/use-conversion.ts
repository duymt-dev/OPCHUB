'use client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useToast } from '@opchub/ui';
import { ApiError } from '@/lib/api-client';
import { fetchConversion, exportConversion } from '../data';

export function useConversion() {
  const toast = useToast(),
    t = useTranslations('overview.conversion');
  const query = useQuery({
    queryKey: ['admin-overview', 'conversion'],
    queryFn: fetchConversion,
    staleTime: 60_000,
  });
  const csv = useMutation({
    mutationFn: exportConversion,
    onSuccess: (file) => {
      const url = URL.createObjectURL(new Blob([file.csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast(t('exported'));
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : t('failed')),
  });
  return { query, csv };
}
