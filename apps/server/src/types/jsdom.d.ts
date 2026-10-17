/** jsdom không kèm khai báo kiểu — chỉ khai phần server dùng (window cho DOMPurify) */
declare module 'jsdom' {
  export class JSDOM {
    constructor(html?: string);
    readonly window: object;
  }
}
