import { useState } from 'react';
import type { FormEvent } from 'react';
import type { LoginPanelProps } from './types';

/** State + submit của form đăng nhập; lỗi trả về từ onSubmit hiện dưới form */
export function useLoginForm(onSubmit: LoginPanelProps['onSubmit']) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    setPending(true);
    try {
      setError(await onSubmit({ identifier, password, remember }));
    } finally {
      setPending(false);
    }
  };

  return {
    state: { identifier, password, remember, showPwd, error, pending },
    setIdentifier,
    setPassword,
    setRemember,
    setShowPwd,
    setError,
    submit,
  };
}
