/** Keep injected turns newer than current demo roots, at Vietnam noon rather
 * than the inactive 01:00–02:00 control window. Never pin a calendar year. */
export function dashboardThreadClock(reference = new Date()): Date {
  return new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate() + 1, 5),
  );
}
