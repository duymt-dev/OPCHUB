import { describe, expect, it } from 'vitest';
import { personalize, replaceMailVars } from './personalize';

const v = {
  fullName: 'Nguyễn <An>',
  email: 'an@x.vn',
  group: 'OPC Hà Nội & Bắc Ninh',
  loginUrl: 'https://opchub.community/login',
};

describe('replaceMailVars (NA-27)', () => {
  it('REQ-227 thay 4 biến, giá trị escape, biến lạ giữ nguyên', () => {
    const html =
      '<p>Chào {{ten}} – {{email}} – {{nhom}} {{khac}}</p><a href="{{link_dang_nhap}}">Vào</a>';
    expect(replaceMailVars(html, v)).toBe(
      '<p>Chào Nguyễn &lt;An&gt; – an@x.vn – OPC Hà Nội &amp; Bắc Ninh {{khac}}</p>' +
        '<a href="https://opchub.community/login">Vào</a>',
    );
  });

  it('REQ-227 nhóm rỗng → chuỗi rỗng; lời chào escape tên', () => {
    const out = personalize('<p>{{nhom}}|</p>', { ...v, group: '' });
    expect(out).toContain('<p>|</p>');
    expect(out).toContain('Xin chào Nguyễn &lt;An&gt;,');
  });
});
