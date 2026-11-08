import { Injectable } from '@nestjs/common';
import { StorePublicService } from './store-public.service';

/** Repeat delivery only repeats DEL/version increment; no public history/KPI mutation. */
@Injectable()
export class StorePublicInvalidationHandler {
  constructor(private readonly stores: StorePublicService) {}
  changed(payload: { userId: string }) {
    return this.stores.invalidateOwner([payload.userId]);
  }
  batch(userIds: readonly string[]) {
    return this.stores.invalidateOwner(userIds);
  }
}
