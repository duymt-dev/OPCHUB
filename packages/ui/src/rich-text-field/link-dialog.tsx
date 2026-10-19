'use client';

import { Button, Input } from 'antd';
import { useId, useState } from 'react';
import { FieldError } from '../form-errors';
import { Modal } from '../modal';

/** Chỉ nhận liên kết http(s) (tiptap cũng chỉ bật 2 giao thức này) */
export const LINK_URL_RE = /^https?:\/\/\S+$/i;

export interface LinkDialogProps {
  open: boolean;
  /** href hiện tại khi vùng chọn đang là liên kết → điền sẵn + nút "Gỡ liên kết" */
  initial: string | null;
  onInsert: (url: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

/**
 * BUG-043: hộp nhập liên kết thay hộp nhập mặc định của trình duyệt — Modal 420px của `packages/ui`.
 * Enter = Chèn (form submit), Esc / Huỷ = đóng; URL sai → chữ lỗi tại ô.
 */
export function LinkDialog({ open, initial, onInsert, onRemove, onClose }: LinkDialogProps) {
  const id = useId();
  return (
    <Modal
      open={open}
      title="Chèn liên kết"
      size="small"
      onClose={onClose}
      footer={
        <>
          {initial ? (
            <Button danger onClick={onRemove}>
              Gỡ liên kết
            </Button>
          ) : null}
          <Button onClick={onClose}>Huỷ</Button>
          <Button type="primary" htmlType="submit" form={`${id}-form`}>
            Chèn
          </Button>
        </>
      }
    >
      {/* key: mỗi lần mở dựng lại ô với giá trị ban đầu (không setState trong effect) */}
      {open ? <LinkForm key={initial ?? ''} id={id} initial={initial} onInsert={onInsert} /> : null}
    </Modal>
  );
}

function LinkForm({
  id,
  initial,
  onInsert,
}: {
  id: string;
  initial: string | null;
  onInsert: (url: string) => void;
}) {
  const [url, setUrl] = useState(initial ?? '');
  const [error, setError] = useState<string | undefined>();
  const errId = `${id}-err`;
  return (
    <form
      id={`${id}-form`}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const v = url.trim();
        if (LINK_URL_RE.test(v)) onInsert(v);
        else setError('Đường dẫn phải bắt đầu bằng http:// hoặc https://');
      }}
    >
      <label htmlFor={`${id}-url`} style={{ display: 'block', marginBottom: 6 }}>
        Đường dẫn
      </label>
      <Input
        id={`${id}-url`}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- hộp nhập 1 ô: focus ngay ô URL
        autoFocus
        value={url}
        placeholder="https://..."
        status={error ? 'error' : ''}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        onChange={(e) => {
          setUrl(e.target.value);
          if (error) setError(undefined);
        }}
      />
      <FieldError id={errId} text={error} alert />
    </form>
  );
}
