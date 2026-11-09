import { myRegionAffiliatePageSchema } from '@opchub/shared/api-domains';
import { api, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { env } from '@/lib/env';
import { refreshSession } from '@/lib/session';

export const fetchRegionAffiliates = (cursor?: string) =>
  api(`/me/gdv/affiliates?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, {
    schema: myRegionAffiliatePageSchema,
  });

/** CSV is a binary response, so it cannot use the JSON-only API parser. */
export async function downloadRegionAffiliates() {
  const send = () => {
    const token = useAuthStore.getState().accessToken;
    return fetch(`${env.NEXT_PUBLIC_API_URL}/me/gdv/affiliates.csv`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  };
  let response = await send();
  if (response.status === 401 && (await refreshSession())) response = await send();
  if (!response.ok) throw new ApiError('INTERNAL', response.status, 'Không thể tải CSV');
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = 'regional-affiliates.csv';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
