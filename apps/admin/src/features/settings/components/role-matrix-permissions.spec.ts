import { ADMIN_PERMISSIONS } from '@opchub/shared';
import { ROLE_MATRIX_PERMISSIONS } from './role-matrix-permissions';

it('REQ-616 P17 appends director management after store permissions without hiding any permission', () => {
  const keys = ROLE_MATRIX_PERMISSIONS.map((p) => p.key);
  expect(keys).toHaveLength(ADMIN_PERMISSIONS.length);
  expect(new Set(keys)).toEqual(new Set(ADMIN_PERMISSIONS.map((p) => p.key)));
  expect(keys.indexOf('affiliate.gdv')).toBe(keys.indexOf('stores.action') + 1);
  expect(keys.indexOf('reports.view')).toBe(keys.indexOf('affiliate.gdv') + 1);
  expect(keys.filter((key) => key !== 'affiliate.gdv')).toEqual(
    ADMIN_PERMISSIONS.map((p) => p.key).filter((key) => key !== 'affiliate.gdv'),
  );
});
