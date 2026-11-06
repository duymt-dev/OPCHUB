'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth-store';
import { fetchStorePublic, patchStorePublic, storeKeys } from '../api';

export function useStorePublic() {
  const user = useAuthStore((s) => s.me?.id);
  const client = useQueryClient();
  const key = storeKeys.publicConfig(user);
  const query = useQuery({
    queryKey: key,
    queryFn: fetchStorePublic,
    enabled: !!user,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: patchStorePublic,
    // Switch and text updates must commit in the same order the owner made them.
    scope: { id: `store-public:${user}` },
    onSuccess: (data) => {
      client.setQueryData(key, data);
    },
  });
  return { ...query, save: mutation.mutateAsync };
}
