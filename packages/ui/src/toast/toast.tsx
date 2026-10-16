'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import styles from './toast.module.css';

const TOAST_MS = 2200;

type ShowToast = (text: string) => void;
const ToastContext = createContext<ShowToast>(() => undefined);

/** Toast đen đáy màn hình, tự ẩn sau 2.2 giây — giống flash() của prototype */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback<ShowToast>((value) => {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setText(''), TOAST_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {text ? (
        <div role="status" className={styles.toast}>
          {text}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  return useContext(ToastContext);
}
