'use client';

import type { SmtpSettings } from '@opchub/shared/api-domains';
import { useToast } from '@opchub/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { fetchSmtp, saveSmtp, settingsKeys, testSmtp, verifySmtp, type SmtpSave } from '../api';
import { isEmail, positiveInt } from '../model';
import { useSettingsMutation } from './use-settings-mutation';

export type Enc = SmtpSettings['encryption'];
export type SmtpCheck = 'idle' | 'ok' | 'err';

/** Ô nhập của form (chuỗi) — key không bao giờ đọc về từ server */
export interface SmtpForm {
  host: string;
  port: string;
  encryption: Enc;
  username: string;
  key: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  dailyLimit: string;
  enabled: boolean;
  test: string;
}

/** Mặc định Brevo (prototype D) — "Khôi phục mặc định" */
export const SMTP_DEFAULT: SmtpForm = {
  host: 'smtp-relay.brevo.com',
  port: '587',
  encryption: 'tls',
  username: '',
  key: '',
  fromName: 'OPC Hub',
  fromEmail: 'no-reply@opchub.community',
  replyTo: 'support@opchub.community',
  dailyLimit: '300',
  enabled: true,
  test: '',
};

const ENC_PORT: Record<Enc, string> = { ssl: '465', tls: '587', none: '25' };

const fromServer = (s: SmtpSettings): SmtpForm => ({
  ...SMTP_DEFAULT,
  host: s.host,
  port: String(s.port),
  encryption: s.encryption,
  username: s.username,
  fromName: s.fromName,
  fromEmail: s.fromEmail,
  replyTo: s.replyTo,
  dailyLimit: String(s.dailyLimit),
  enabled: s.enabled,
});

/** Kiểm tra form rồi dựng thân `PUT /admin/smtp`; trả khoá thông báo lỗi nếu sai */
function toPayload(f: SmtpForm): SmtpSave | 'badFrom' | 'badReply' | 'badNumber' {
  if (!isEmail(f.fromEmail)) return 'badFrom';
  if (!isEmail(f.replyTo)) return 'badReply';
  const port = positiveInt(f.port);
  const dailyLimit = positiveInt(f.dailyLimit);
  if (!port || !dailyLimit) return 'badNumber';
  const key = f.key.trim();
  return {
    host: f.host.trim(),
    port,
    encryption: f.encryption,
    username: f.username.trim(),
    fromName: f.fromName.trim(),
    fromEmail: f.fromEmail.trim(),
    replyTo: f.replyTo.trim(),
    dailyLimit,
    enabled: f.enabled,
    ...(key ? { key } : {}),
  };
}

/** D-71 / D-72 SMTP Brevo: kiểm tra kết nối (lỗi / OK), gửi thử, lưu cấu hình (key không trả về) */
export function useSmtp() {
  const t = useTranslations('settings.smtp');
  const toast = useToast();
  const q = useQuery({ queryKey: settingsKeys.smtp, queryFn: fetchSmtp });
  const [draft, setDraft] = useState<SmtpForm | null>(null);
  const [check, setCheck] = useState<SmtpCheck>('idle');
  const [showKey, setShowKey] = useState(false);
  const form = draft ?? (q.data ? fromServer(q.data) : null);
  const hasKey = q.data?.hasKey ?? false;

  const verify = useSettingsMutation({ key: settingsKeys.smtp, fn: verifySmtp });
  const save = useSettingsMutation({ key: settingsKeys.smtp, fn: saveSmtp, write: true });
  const test = useSettingsMutation({ key: settingsKeys.smtp, fn: testSmtp });

  const set = (patch: Partial<SmtpForm>, keepCheck = false) => {
    if (!form) return;
    setDraft({ ...form, ...patch });
    if (!keepCheck) setCheck('idle');
  };

  return {
    form,
    hasKey,
    check,
    showKey,
    toggleKey: () => setShowKey((v) => !v),
    set,
    setEnc: (e: Enc) => set({ encryption: e, port: ENC_PORT[e] }),
    reset: () => {
      setDraft(SMTP_DEFAULT);
      setCheck('idle');
    },
    verify: () => {
      if (!form) return;
      const port = positiveInt(form.port);
      if (!form.username.trim() || (!form.key.trim() && !hasKey) || !port) {
        setCheck('err');
        return toast(t('needCreds'));
      }
      const key = form.key.trim();
      verify.mutate(
        {
          host: form.host.trim(),
          port,
          encryption: form.encryption,
          username: form.username.trim(),
          ...(key ? { key } : {}),
        },
        {
          onSuccess: (r) => {
            setCheck(r.ok ? 'ok' : 'err');
            toast(r.ok ? t('connected') : r.message);
          },
        },
      );
    },
    sendTest: () => {
      if (!form) return;
      if (check !== 'ok') return toast(t('checkFirst'));
      if (!isEmail(form.test)) return toast(t('badTest'));
      test.mutate(form.test.trim(), { onSuccess: (r) => toast(r.message) });
    },
    save: () => {
      if (!form) return;
      const r = toPayload(form);
      if (typeof r === 'string') return toast(t(r));
      save.mutate(r, {
        onSuccess: () => {
          setDraft(null);
          toast(t('saved'));
        },
      });
    },
  };
}
