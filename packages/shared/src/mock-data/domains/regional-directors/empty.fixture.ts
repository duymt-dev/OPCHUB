import { mockDb } from '../store';
import { mockDirectorState } from './state';

/** Test precondition: an installation with no incumbents, not the default v4.6 demo. */
export function arrangeEmptyDirectors(): void {
  const state = mockDirectorState();
  for (const previous of state.previousFees) {
    const fee = mockDb().fees.find((row) => row.userId === previous.userId);
    if (!fee) throw new Error('Missing original fee fixture');
    fee.status = previous.status;
    fee.validUntil = previous.validUntil;
  }
  state.previousFees = [];
  for (const slot of state.config.slots) {
    slot.incumbent = null;
    slot.bank = null;
    slot.version = 1;
  }
  state.history = [];
  state.mail = [];
  state.mailJobs = [];
}
