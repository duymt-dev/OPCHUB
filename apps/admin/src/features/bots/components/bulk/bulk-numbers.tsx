import { Form, InputNumber } from 'antd';
import { useTranslations } from 'next-intl';
import s from './bulk.module.css';

const fields = [
  { name: 'perTopic', min: 1, max: 5 },
  { name: 'turns', min: 2, max: 8 },
  { name: 'delayMinutes', min: 1, max: 60 },
] as const;
export function BulkNumbers() {
  const t = useTranslations('bots.bulk');
  return (
    <div className={s.numbers}>
      {fields.map(({ name, min, max }) => (
        <div key={name}>
          <Form.Item name={name} label={t(name)}>
            <InputNumber min={min} max={max} precision={0} />
          </Form.Item>
          <div className={s.hint}>{t(`${name}Hint`)}</div>
        </div>
      ))}
    </div>
  );
}
