/** D-139: preserve the two context-specific labels; never shorten director copy. */
export const REGION_LABEL_SHORT = {
  north: 'Miền Bắc',
  central: 'Miền Trung',
  south: 'Miền Nam',
} as const;

export const REGION_LABEL_DIRECTOR = {
  ...REGION_LABEL_SHORT,
  central: 'Miền Trung & Tây Nguyên',
} as const;
