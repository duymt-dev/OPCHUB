/** AF-R02: an unpaid member must be able to see the locked Affiliate preview. */
export const requiresPaymentOverlay = (mandatory: boolean, pathname: string) =>
  mandatory && pathname !== '/affiliate';
