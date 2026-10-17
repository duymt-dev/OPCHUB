export interface MailAttachment {
  filename: string;
  /** URL công khai hoặc nội dung */
  path?: string;
  content?: string;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: { name: string; email: string };
  replyTo?: string;
  attachments?: MailAttachment[];
}

/** Chỉ gọi từ worker `mail` (adapters.md) */
export interface MailProvider {
  readonly name: string;
  send(msg: MailMessage): Promise<{ messageId: string }>;
  /** Kiểm kết nối (màn Cài đặt SMTP) */
  verify(): Promise<void>;
}

export interface SmtpConfig {
  host: string;
  port: number;
  encryption: 'tls' | 'ssl' | 'none';
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
}
