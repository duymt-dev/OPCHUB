import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { phoneCountries } from '@opchub/shared/fixtures';
import { GROUP_EXPORT_FIELDS } from '@opchub/shared/api-domains';
import { ExportService } from '@/modules/export';
import type {
  GroupAdminUpsert,
  GroupDetail,
  GroupMemberRow,
  GroupMembersExport,
} from '@opchub/shared/api-domains';
import { randomUUID } from 'node:crypto';
import { AuditService } from '@/common/audit';
import { AppError, conflict, notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { DEFAULT_ROOMS, roomSlug, toGroupDetail } from '../domain/group.mapper';
import { regionOfProvince } from '../domain/region';
import { ImageRefService } from '../../uploads';
import {
  GroupAdminRepository,
  type GroupMemberExportRow,
  type GroupWrite,
  type NewRoom,
} from '../repositories/group-admin.repository';

export interface Actor {
  id: string;
  ip: string | null;
}

type GroupField = (typeof GROUP_EXPORT_FIELDS)[number];
const isGroupField = (f: string): f is GroupField =>
  (GROUP_EXPORT_FIELDS as readonly string[]).includes(f);

const countryName = (cc: string | null) =>
  phoneCountries.find((c) => c.id === cc)?.name ?? cc ?? 'Việt Nam';

function toMemberRow(r: GroupMemberExportRow): GroupMemberRow {
  return {
    groupId: r.group_id,
    groupName: r.group_name,
    userId: r.user_id,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone ?? '',
    accountType: r.account_type === 'business' ? 'business' : 'personal',
    company: r.company ?? '',
    taxCode: r.tax_code ?? '',
    groupRole: r.group_role,
    country: countryName(r.biz_country ?? r.user_country),
    joinedAt: r.joined_at.toISOString(),
    status: r.status,
  };
}

/** Admin "Nhóm cộng đồng" (D-23 → D-35): CRUD nhóm, phòng mặc định, chủ nhóm/điều phối viên, xuất thành viên */
@Injectable()
export class GroupAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: GroupAdminRepository,
    private readonly audit: AuditService,
    private readonly exports: ExportService,
    private readonly images: ImageRefService,
  ) {}

  async detail(id: string): Promise<GroupDetail> {
    const d = await this.repo.detail(id);
    if (!d) throw notFound('Không tìm thấy nhóm');
    const owner = d.staff.find((s) => s.groupRole === 'owner');
    return toGroupDetail({
      group: d.group,
      rules: d.group.rules,
      ownerId: owner?.userId ?? '',
      moderatorIds: d.staff.filter((s) => s.groupRole === 'moderator').map((s) => s.userId),
      rooms: d.rooms,
    });
  }

  /** Kiểm tên/tỉnh + ảnh bìa (NA-26) — NGOÀI transaction (luật 9) */
  private async validate(
    actor: Actor,
    input: GroupAdminUpsert,
    id: string | null,
  ): Promise<GroupWrite> {
    const region = regionOfProvince(input.province);
    if (!region) {
      const message = 'Tỉnh/thành không hợp lệ';
      throw new AppError('VALIDATION_ERROR', message, [{ path: 'province', message }]);
    }
    const clash = await this.repo.clash(input.name, input.province, id);
    if (clash.name) throw conflict('Tên nhóm đã tồn tại');
    if (clash.province) throw conflict(`Đã có nhóm cho ${input.province}`);
    return {
      name: input.name,
      province: input.province,
      region,
      description: input.description,
      joinMode: input.joinMode,
      rules: input.rules,
      coverUrl: await this.images.resolve({
        userId: actor.id,
        kind: 'group-cover',
        url: input.coverUrl,
        current: id ? ((await this.repo.coverOf(id)) ?? null) : null,
        path: 'coverUrl',
      }),
    };
  }

  /** Phòng cần thêm: mặc định chưa có + phòng tự đặt tên chưa trùng tên */
  private roomsToAdd(input: GroupAdminUpsert, taken: Set<string>): NewRoom[] {
    const out: NewRoom[] = [];
    for (const key of new Set(['general' as const, ...input.roomKeys])) {
      if (taken.has(key)) continue;
      taken.add(key);
      out.push({ slug: key, ...DEFAULT_ROOMS[key], isDefault: key === 'general' });
    }
    for (const r of input.extraRooms) {
      // Form gửi lại phòng đã có khi sửa → bỏ qua (so theo slug gốc của tên)
      if (taken.has(roomSlug(r.name, new Set()))) continue;
      const slug = roomSlug(r.name, taken);
      taken.add(slug);
      out.push({ slug, name: r.name, description: r.description, isDefault: false });
    }
    return out;
  }

  private async applyStaff(tx: DbTx, groupId: string, input: GroupAdminUpsert, actor: Actor) {
    const ownerId = input.ownerId ?? actor.id;
    const mods = [...new Set(input.moderatorIds)].filter((m) => m !== ownerId);
    const added = await this.repo.setStaff(tx, groupId, ownerId, mods);
    await this.repo.bumpMemberCount(tx, groupId, added);
  }

  async create(actor: Actor, input: GroupAdminUpsert): Promise<GroupDetail> {
    const data = await this.validate(actor, input, null);
    const id = randomUUID();
    await this.prisma.db.$transaction(async (tx) => {
      await this.repo.create(tx, id, id, data);
      await this.repo.addRooms(tx, id, actor.id, this.roomsToAdd(input, new Set()));
      await this.applyStaff(tx, id, input, actor);
      await this.log(tx, actor, 'group.create', id, `Tạo nhóm ${data.name}`);
    });
    return this.detail(id);
  }

  /**
   * Sửa nhóm: trường cơ bản + nội quy/ảnh bìa; phòng mặc định/tự đặt chỉ THÊM (phòng có tin nhắn
   * không xoá từ form — Q-B20-2); chủ nhóm/điều phối viên đặt lại theo form.
   */
  async update(actor: Actor, id: string, input: GroupAdminUpsert): Promise<GroupDetail> {
    const data = await this.validate(actor, input, id);
    const taken = await this.repo.roomSlugs(id);
    await this.prisma.db.$transaction(async (tx) => {
      if (!(await this.repo.update(tx, id, data))) throw notFound('Không tìm thấy nhóm');
      await this.repo.addRooms(tx, id, actor.id, this.roomsToAdd(input, taken));
      await this.applyStaff(tx, id, input, actor);
      await this.log(tx, actor, 'group.update', id, `Cập nhật nhóm ${data.name}`);
    });
    return this.detail(id);
  }

  async remove(actor: Actor, id: string): Promise<{ id: string }> {
    await this.prisma.db.$transaction(async (tx) => {
      const name = await this.repo.softDelete(tx, id);
      if (!name) throw notFound('Không tìm thấy nhóm');
      await this.log(tx, actor, 'group.delete', id, `Xoá nhóm ${name}`);
    });
    return { id };
  }

  memberCounts(): Promise<Record<string, number>> {
    return this.repo.memberCounts();
  }

  async members(groupIds: string[], status: 'all' | 'active' | 'locked') {
    const rows = await this.repo.membersOf(groupIds, status === 'all' ? null : status);
    return rows.map(toMemberRow);
  }

  /** Job xuất (B43): đếm dòng cho hộp thoại + export_jobs + outbox + audit cùng transaction */
  async export(actor: Actor, body: GroupMembersExport) {
    const rows = await this.repo.countMembersOf(
      body.groupIds,
      body.status === 'all' ? null : body.status,
    );
    const jobId = await this.prisma.db.$transaction(async (tx) => {
      const id = await this.exports.request(tx, actor.id, {
        kind: 'group_members',
        groupIds: body.groupIds,
        status: body.status,
        fields: body.fields.filter(isGroupField),
      });
      await this.log(
        tx,
        actor,
        'group.members.export',
        id,
        `xuất ${rows} thành viên nhóm · ${body.format} · ${body.fields.join(',')}`.slice(0, 500),
      );
      return id;
    });
    return { jobId, status: 'queued' as const, rows };
  }

  private log(tx: DbTx, actor: Actor, action: string, entityId: string, summary: string) {
    return this.audit.log(tx, {
      actorId: actor.id,
      action,
      entity: 'group',
      entityId,
      tag: 'content',
      summary,
      ip: actor.ip,
    });
  }
}
