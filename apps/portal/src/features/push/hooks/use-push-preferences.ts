'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchPushConfig,
  fetchPushPreferences,
  pushConfigKey,
  pushPreferencesKey,
  savePushPreferences,
} from '../push-api';

export function usePushConfig() {
  return useQuery({ queryKey: pushConfigKey, queryFn: fetchPushConfig });
}
export function usePushPreferences() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: pushPreferencesKey, queryFn: fetchPushPreferences });
  const save = useMutation({
    mutationFn: savePushPreferences,
    onSuccess: (data) => client.setQueryData(pushPreferencesKey, data),
  });
  return { query, save };
}
