'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Upload } from 'antd';
import type { UploadProps } from 'antd';
import type { ReactNode } from 'react';

export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp';
export const IMAGE_MAX_MB = 5;

export interface UploadImageProps {
  value?: string | undefined;
  label: string;
  tooLargeMessage: string;
  /** Tải file lên (presigned URL) rồi trả về URL công khai */
  upload: (file: File) => Promise<string>;
  onChange: (url: string) => void;
  onError: (message: string) => void;
  /** Nút chọn tự vẽ (VD avatar tròn + icon máy ảnh); bỏ trống = ô picture-card */
  trigger?: ReactNode;
}

/** Ô chọn 1 ảnh: kiểm định dạng + dung lượng ở client, việc tải lên do app truyền vào */
export function UploadImage(props: UploadImageProps) {
  const { value, label, tooLargeMessage, upload, onChange, onError, trigger } = props;

  const customRequest: UploadProps['customRequest'] = ({ file, onSuccess, onError: fail }) => {
    upload(file as File)
      .then((url) => {
        onChange(url);
        onSuccess?.(url);
      })
      .catch((e: unknown) => {
        const err = e instanceof Error ? e : new Error(String(e));
        onError(err.message);
        fail?.(err);
      });
  };

  return (
    <Upload
      {...(trigger ? {} : { listType: 'picture-card' as const })}
      accept={IMAGE_ACCEPT}
      maxCount={1}
      showUploadList={false}
      beforeUpload={(file) => {
        const ok = file.size / 1024 / 1024 <= IMAGE_MAX_MB;
        if (!ok) onError(tooLargeMessage);
        return ok || Upload.LIST_IGNORE;
      }}
      customRequest={customRequest}
    >
      {trigger ??
        (value ? (
          <img
            src={value}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
          />
        ) : (
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <PlusOutlined />
            <span style={{ fontSize: 12 }}>{label}</span>
          </span>
        ))}
    </Upload>
  );
}
