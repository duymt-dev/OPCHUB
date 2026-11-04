import { AppError } from '@/common/errors';
export class RegionalValidationError extends AppError {
  override readonly status = 422;
  constructor() {
    super('VALIDATION_ERROR', 'Mức tối thiểu không được vượt năm đầu', [
      { path: 'regionalMin', message: 'Mức tối thiểu không được vượt năm đầu' },
    ]);
  }
}
