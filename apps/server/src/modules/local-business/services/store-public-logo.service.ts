import { Inject, Injectable } from '@nestjs/common';
import type { StorageProvider } from '@opchub/integrations';
import { STORAGE } from '@/common/integrations';
import { storageKeyOf, isPrivateKey } from '@/modules/uploads';
import { notFound } from '@/common/errors';
import { StorePublicRepository } from '../repositories/store-public.repository';

@Injectable()
export class StorePublicLogoService {
  constructor(
    private readonly stores: StorePublicRepository,
    @Inject(STORAGE) private readonly storage: StorageProvider,
  ) {}
  async logo(slug: string) {
    const row = await this.stores.publicLogo(slug, new Date());
    if (!row) throw notFound('Store is unavailable');
    const key = storageKeyOf(row.logoUrl, this.storage.publicUrl(''));
    if (!key || isPrivateKey(key)) return null;
    const load = async () => {
      const head = await this.storage.head(key);
      if (
        !head ||
        head.size > 2_000_000 ||
        !['image/png', 'image/jpeg', 'image/webp'].includes(head.contentType ?? '')
      )
        return null;
      const bytes = await this.storage.readPrefix(key, head.size);
      return bytes?.length === head.size ? { bytes, type: head.contentType } : null;
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        load(),
        new Promise<null>((resolve) => {
          timer = setTimeout(() => resolve(null), 3000);
        }),
      ]).catch(() => null);
    } finally {
      clearTimeout(timer);
    }
  }
}
