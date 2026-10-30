import type { DirectorRegion } from '@opchub/shared/api-domains';

/** D-120: permanent slot state is derived from the nullable incumbent, not a removable card. */
export const canAppointDirector = (
  incumbentId: string | null,
  userId: string,
  assignments: readonly { region: DirectorRegion; userId: string | null }[],
) => incumbentId === null && !assignments.some((slot) => slot.userId === userId);
export const canRevokeDirector = (incumbentId: string | null) => incumbentId !== null;
