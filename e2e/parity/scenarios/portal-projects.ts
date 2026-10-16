import { choose, inCard, nav, press, tap, tapLast, tapTitle, type, waitText } from '../steps';
import type { Scenario, StepCtx } from '../types';

/** Portal P-55 → P-78: Dự án OPC */

const SEARCH = 'Tìm dự án theo tên, mô tả hoặc chủ dự án...';
const toProjects = async (c: StepCtx) => {
  await nav(c, 'Dự án OPC');
  await waitText(c, '★ DỰ ÁN NỔI BẬT TUẦN');
};
const openProject = async (c: StepCtx, name: string) => {
  await toProjects(c);
  await tapLast(c, name);
  await waitText(c, 'Giới thiệu dự án');
};
const toMine = async (c: StepCtx) => {
  await toProjects(c);
  await tap(c, 'Dự án của tôi');
  await waitText(c, 'Chỉnh sửa');
};
const openForm = async (c: StepCtx) => {
  await toProjects(c);
  await tap(c, /Đăng dự án của bạn/);
  await waitText(c, 'Đăng dự án mới');
};
const projectTab = async (c: StepCtx, tab: string) => {
  await openProject(c, 'SoloBooks');
  await tap(c, tab);
};
const openInvest = async (c: StepCtx) => {
  await openProject(c, 'SoloBooks');
  await tapLast(c, 'Quan tâm đầu tư');
  await waitText(c, 'Quan tâm đầu tư · SoloBooks');
};

export const PORTAL_PROJECTS: Scenario[] = [
  { id: 'P-55', name: 'Dự án · khám phá', start: 'user', fullPage: true, steps: toProjects },
  {
    id: 'P-56',
    name: 'Dự án · dạng bảng',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await toProjects(c);
      await tapTitle(c, 'Dạng bảng');
    },
  },
  {
    id: 'P-57',
    name: 'Dự án · lọc giai đoạn + sắp xếp',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await toProjects(c);
      await choose(c, 'MVP');
      await choose(c, 'Nhiều theo dõi');
    },
  },
  {
    id: 'P-58',
    name: 'Dự án · trống',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await toProjects(c);
      await type(c, SEARCH, 'zzzz');
      await waitText(c, 'Không tìm thấy dự án phù hợp');
    },
  },
  {
    id: 'P-59',
    name: 'Dự án · theo dõi',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await toProjects(c);
      await tapTitle(c, 'Dạng bảng');
      await tap(c, '+ Theo dõi');
    },
  },
  { id: 'P-60', name: 'Dự án của tôi', start: 'user', fullPage: true, steps: toMine },
  {
    id: 'P-61',
    name: 'Dự án của tôi · trống',
    start: 'user',
    unreachable:
      'TK demo duy nhất của prototype sở hữu p10 (OPC Hub Mobile); không có user nào chưa có dự án.',
  },
  {
    id: 'P-62',
    name: 'Chi tiết dự án · Tổng quan',
    start: 'user',
    fullPage: true,
    steps: (c) => openProject(c, 'SoloBooks'),
  },
  {
    id: 'P-63',
    name: 'Chi tiết dự án · Cập nhật',
    start: 'user',
    fullPage: true,
    steps: (c) => projectTab(c, 'Cập nhật'),
  },
  {
    id: 'P-64',
    name: 'Chi tiết dự án · Đội ngũ',
    start: 'user',
    fullPage: true,
    steps: (c) => projectTab(c, 'Đội ngũ'),
  },
  {
    id: 'P-65',
    name: 'Chi tiết dự án · Góp ý',
    start: 'user',
    fullPage: true,
    steps: (c) => projectTab(c, 'Góp ý (3)'),
  },
  {
    id: 'P-66',
    name: 'Góp ý · ô trả lời',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await projectTab(c, 'Góp ý (3)');
      await tap(c, 'Trả lời');
      await c.page.getByPlaceholder('Viết trả lời...').filter({ visible: true }).first().waitFor();
    },
  },
  {
    id: 'P-67',
    name: 'Góp ý · trống',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await openProject(c, 'BrandKit Mini');
      await tap(c, 'Góp ý (0)');
      await waitText(c, 'Chưa có góp ý nào. Hãy là người đầu tiên!');
    },
  },
  {
    id: 'P-68',
    name: 'Dự án · repo riêng tư, đã xin quyền',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await openProject(c, 'LeadPilot');
      await tap(c, 'Yêu cầu quyền truy cập');
      await waitText(c, '✓ Đã gửi yêu cầu truy cập');
    },
  },
  {
    id: 'P-69',
    name: 'Dự án · khối gọi vốn',
    start: 'user',
    fullPage: true,
    note: 'Cùng màn với P-62 (SoloBooks bật gọi vốn)',
    steps: async (c) => {
      await openProject(c, 'SoloBooks');
      await waitText(c, 'Gọi vốn đầu tư');
    },
  },
  { id: 'P-70', name: 'Modal quan tâm đầu tư', start: 'user', steps: openInvest },
  {
    id: 'P-71',
    name: 'Đã gửi quan tâm đầu tư',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await openInvest(c);
      await type(c, '+84 912 345 678', '0912345678');
      await type(c, 'Tối thiểu 100 triệu ₫', '100000000');
      await press(c, 'Gửi quan tâm');
      await waitText(c, /✓ Đã gửi quan tâm/);
    },
  },
  {
    id: 'P-72',
    name: 'Chủ dự án · nhà đầu tư quan tâm',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await toMine(c);
      await tapLast(c, 'OPC Hub Mobile');
      await waitText(c, 'Nhà đầu tư quan tâm (2)');
    },
  },
  { id: 'P-73', name: 'Form đăng dự án', start: 'user', steps: openForm },
  {
    id: 'P-74',
    name: 'Form dự án · báo thiếu tên',
    start: 'user',
    steps: async (c) => {
      await openForm(c);
      await press(c, 'Gửi đăng dự án');
      await waitText(c, 'Vui lòng nhập tên dự án');
    },
  },
  {
    id: 'P-75',
    name: 'Form dự án · mở gọi vốn',
    start: 'user',
    steps: async (c) => {
      await openForm(c);
      await tap(c, 'Dự án đang tìm kiếm đầu tư');
      await c.page.getByPlaceholder('2000000000').filter({ visible: true }).first().waitFor();
    },
  },
  {
    id: 'P-76',
    name: 'Form dự án · chỉnh sửa',
    start: 'user',
    steps: async (c) => {
      await toMine(c);
      await tap(c, 'Chỉnh sửa');
      await waitText(c, 'Chỉnh sửa dự án');
    },
  },
  {
    id: 'P-77',
    name: 'Dự án · đã lưu nháp',
    start: 'user',
    fullPage: true,
    steps: async (c) => {
      await openForm(c);
      await type(c, 'VD: SoloBooks – Kế toán cho OPC', 'Dự án thử');
      await press(c, 'Lưu nháp');
      await waitText(c, 'Đã lưu bản nháp');
    },
  },
  {
    id: 'P-78',
    name: 'Modal chia sẻ dự án',
    start: 'user',
    steps: async (c) => {
      await toMine(c);
      await inCard(c, 'OPC Hub Mobile', 'Chia sẻ');
      await waitText(c, 'Sao chép link');
    },
  },
];
