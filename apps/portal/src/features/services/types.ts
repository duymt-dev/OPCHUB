/** Form "Đăng ký tư vấn dịch vụ" — biến thể Cá nhân / Doanh nghiệp, Tổ chức */
export type RequesterKind = 'per' | 'biz';

export interface ConsultForm {
  svc: string;
  kind: RequesterKind;
  name: string;
  phone: string;
  email: string;
  /* Cá nhân */
  job: string;
  field: string;
  bizSt: string;
  /* Doanh nghiệp / tổ chức */
  org: string;
  orgType: string;
  tax: string;
  size: string;
  web: string;
  pos: string;
  /* Chung */
  addr: string;
  when: string;
  budget: string;
  /** HTML của ô mô tả */
  note: string;
}

export type ConsultField = keyof ConsultForm;
