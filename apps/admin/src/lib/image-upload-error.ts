/** Browser/compression/storage failures only. Presign API errors must retain their own identity. */
export class LocalImageUploadError extends Error {
  constructor(
    readonly code: 'imageType' | 'imageUpload',
    options?: ErrorOptions,
  ) {
    super('Local image upload failure', options);
    this.name = 'LocalImageUploadError';
  }
}
