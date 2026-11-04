import { Form } from 'antd';
import type { RegionalPolicy } from '@opchub/shared';

export function usePolicyPreview(): RegionalPolicy | null {
  const regionalFirstYear: unknown = Form.useWatch('regionalFirstYear');
  const regionalStep: unknown = Form.useWatch('regionalStep');
  const regionalMin: unknown = Form.useWatch('regionalMin');
  if (
    typeof regionalFirstYear !== 'number' ||
    typeof regionalStep !== 'number' ||
    typeof regionalMin !== 'number'
  )
    return null;
  if (
    ![regionalFirstYear, regionalStep, regionalMin].every(
      (v) => Number.isInteger(v) && v >= 0 && v <= 100,
    ) ||
    regionalFirstYear < 1 ||
    regionalMin > regionalFirstYear
  )
    return null;
  return { regionalFirstYear, regionalStep, regionalMin };
}
