'use client';
import type { StorePublicConfig, StorePublicPatch } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { StorePublicSave } from '../types';
export function usePublicPageDraft(data: StorePublicConfig, save: StorePublicSave) {
  const t = useTranslations('stores.publicPage');
  const toast = useToast();
  const [title, setTitle] = useState(data.title);
  const [desc, setDesc] = useState(data.desc);
  const [index, setIndex] = useState(data.seoIndex);
  const [busy, setBusy] = useState(false);
  const saved = useRef({ title: data.title, desc: data.desc });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hidden = data.status === 'hidden';

  const commit = useCallback(
    async (nextTitle: string, nextDesc: string) => {
      clearTimeout(timer.current);
      const input: StorePublicPatch = {};
      if (saved.current.title !== nextTitle) input.title = nextTitle;
      if (saved.current.desc !== nextDesc) input.desc = nextDesc;
      if (!Object.keys(input).length || hidden) return;
      const previous = saved.current;
      saved.current = { title: nextTitle, desc: nextDesc };
      try {
        await save(input);
      } catch {
        saved.current = previous;
        toast(t('saveError'));
      }
    },
    [hidden, save, toast, t],
  );

  useEffect(() => {
    timer.current = setTimeout(() => {
      void commit(title, desc);
    }, 800);
    return () => clearTimeout(timer.current);
  }, [title, desc, commit]);

  const toggle = async (value: boolean) => {
    setIndex(value);
    setBusy(true);
    try {
      await save({ seoIndex: value });
    } catch {
      setIndex(!value);
      toast(t('saveError'));
    } finally {
      setBusy(false);
    }
  };

  return { title, desc, index, busy, hidden, setTitle, setDesc, commit, toggle };
}
