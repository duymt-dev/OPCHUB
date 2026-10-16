'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  botKeys,
  fetchActivity,
  fetchGroups,
  fetchPersonas,
  fetchScripts,
  fetchSettings,
  fetchThreads,
} from '../api';
import type { GroupRef } from '../types';

/** Dữ liệu đọc của màn Bot tương tác — mỗi nguồn một query key hẹp (data-state.md) */
export function useBotData() {
  const personas = useQuery({ queryKey: botKeys.personas(), queryFn: fetchPersonas });
  const scripts = useQuery({ queryKey: botKeys.scripts(), queryFn: fetchScripts });
  const threads = useQuery({ queryKey: botKeys.threads(), queryFn: fetchThreads });
  const settings = useQuery({ queryKey: botKeys.settings(), queryFn: fetchSettings });
  const activity = useQuery({ queryKey: botKeys.activity(), queryFn: fetchActivity });
  const groupsQ = useQuery({ queryKey: botKeys.groups(), queryFn: fetchGroups });

  const groups = useMemo<GroupRef[]>(
    () => (groupsQ.data?.items ?? []).map((g) => ({ id: g.id, name: g.name })),
    [groupsQ.data],
  );
  const groupName = useMemo(() => {
    const m = new Map(groups.map((g) => [g.id, g.name]));
    return (id: string) => m.get(id) ?? id;
  }, [groups]);

  const queries = [personas, scripts, threads, settings, activity, groupsQ];
  return {
    personas: personas.data?.items ?? [],
    scripts: scripts.data?.items ?? [],
    threads: threads.data?.items ?? [],
    settings: settings.data,
    activity: activity.data,
    groups,
    groupName,
    loading: queries.some((q) => q.isPending),
    error: queries.some((q) => q.isError),
    refetch: () => queries.forEach((q) => void q.refetch()),
    /** Mốc "bây giờ" để tính "x phút trước" ổn định theo lần tải */
    now: Math.max(threads.dataUpdatedAt, activity.dataUpdatedAt),
  };
}
