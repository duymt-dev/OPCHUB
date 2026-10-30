import { ADMIN_PERMISSIONS } from '@opchub/shared';

/** P17 appends the new director permission after store permissions in the prototype.
 * Preserve the additional reporting permission and all grants; this is presentation only.
 */
function matrixPermissions() {
  const director = ADMIN_PERMISSIONS.find((p) => p.key === 'affiliate.gdv');
  if (!director) return ADMIN_PERMISSIONS;
  const remaining = ADMIN_PERMISSIONS.filter((p) => p.key !== 'affiliate.gdv');
  const reports = remaining.findIndex((p) => p.key === 'reports.view');
  const at = reports < 0 ? remaining.length : reports;
  return [...remaining.slice(0, at), director, ...remaining.slice(at)];
}

export const ROLE_MATRIX_PERMISSIONS = matrixPermissions();
