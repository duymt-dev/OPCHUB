'use client';

import { DatePicker } from 'antd';
import type { TimeRangePickerProps } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '../icons';
import styles from './date-range-picker.module.css';

const { RangePicker } = DatePicker;

export type DateRangeValue = [Dayjs | null, Dayjs | null];

export interface DateRangePickerProps {
  value?: DateRangeValue | null;
  defaultValue?: DateRangeValue;
  onChange?: (dates: DateRangeValue | null, dateStrings: [string, string]) => void;
  format?: string;
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  presets?: TimeRangePickerProps['presets'];
  placeholder?: [string, string];
  prefix?: ReactNode;
  /** Must be registered by the app; scoped to instances, never changes dayjs.locale globally. */
  dateLocale?: string;
}

const DEFAULT_PRESETS: NonNullable<TimeRangePickerProps['presets']> = [
  { label: 'Hôm nay', value: [dayjs().startOf('day'), dayjs().endOf('day')] },
  { label: '7 ngày qua', value: [dayjs().subtract(6, 'day').startOf('day'), dayjs().endOf('day')] },
  {
    label: '30 ngày qua',
    value: [dayjs().subtract(29, 'day').startOf('day'), dayjs().endOf('day')],
  },
  { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
  {
    label: 'Tháng trước',
    value: [
      dayjs().subtract(1, 'month').startOf('month'),
      dayjs().subtract(1, 'month').endOf('month'),
    ],
  },
];

const DEFAULT_RANGE: [Dayjs, Dayjs] = [dayjs('2026-10-01'), dayjs('2026-10-15')];

/**
 * Bộ chọn khoảng ngày (Date Range Picker) giao diện chuẩn prototype (cao 40px, bo 6px, icon lịch & mũi tên).
 * Click để mở popup chọn ngày, có sẵn các preset nhanh tiếng Việt.
 */
export function DateRangePicker({
  value,
  defaultValue = DEFAULT_RANGE,
  onChange,
  format = 'DD/MM/YYYY',
  allowClear = false,
  disabled = false,
  className,
  style,
  presets = DEFAULT_PRESETS,
  placeholder,
  prefix,
  dateLocale,
}: DateRangePickerProps) {
  const localize = (range: DateRangeValue): DateRangeValue =>
    dateLocale
      ? [range[0]?.locale(dateLocale) ?? null, range[1]?.locale(dateLocale) ?? null]
      : range;
  const localizedDefault = localize(defaultValue);
  return (
    <RangePicker
      className={`${styles.dateRangePicker} ${className ?? ''}`}
      defaultValue={localizedDefault}
      format={format}
      separator="–"
      allowClear={allowClear}
      disabled={disabled}
      presets={presets}
      prefix={prefix ?? <Icon name="calendar" size={15} stroke="rgba(0,0,0,0.65)" />}
      suffixIcon={<Icon name="chevronDown" size={14} stroke="rgba(0,0,0,0.45)" />}
      {...(style ? { style } : {})}
      {...(value !== undefined ? { value: value ? localize(value) : null } : {})}
      {...(onChange ? { onChange } : {})}
      {...(placeholder ? { placeholder } : {})}
    />
  );
}
