import { Inject, Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { fundAmountOf, transferContentOf } from '@opchub/shared';
import { ENV, type Env } from '@/common/config';
import { bankTransferOf } from '@/common/integrations';
import { OutboxService } from '@/common/outbox';
import { MemberDirectory } from '@/modules/account';
import { PriceConfigService } from '@/modules/pricing';
import {
  MailService,
  MailQrToken,
  fundraisingMail,
  type FundraisingMailKind,
} from '@/modules/mail';
import type { FundraisingRepository } from '../repositories/fundraising.repository';
import { FundraisingRenewalRepository } from '../repositories/fundraising-renewal.repository';

type DueRow = Awaited<ReturnType<FundraisingRepository['due']>>[number];
@Injectable()
export class FundraisingReminderDeliveryService {
  constructor(
    private readonly members: MemberDirectory,
    private readonly prices: PriceConfigService,
    private readonly renewal: FundraisingRenewalRepository,
    private readonly qr: MailQrToken,
    private readonly mail: MailService,
    private readonly outbox: OutboxService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async deliver(tx: DbTx, input: DueRow[], kind: FundraisingMailKind, now: Date) {
    if (!input.length) return;
    const owners = new Map(
      (await this.members.contactsByIds([...new Set(input.map((r) => r.ownerId))], tx)).map((u) => [
        u.id,
        u,
      ]),
    );
    const rows = input.filter((r) => owners.has(r.ownerId));
    if (!rows.length) return;
    const prices = await this.prices.current();
    const approved = await this.renewal.approved(
      tx,
      rows.map((r) => r.projectId),
    );
    const targets =
      kind === 'expired'
        ? await this.renewal.prepare(tx, rows, prices, approved, now)
        : new Map<string, never>();
    const mails = rows.flatMap((r) => {
      const owner = owners.get(r.ownerId);
      if (!owner || !r.endsAt) return [];
      const target = targets.get(r.projectId);
      const transfer = target?.code
        ? {
            ...bankTransferOf(
              this.env,
              target.amount,
              transferContentOf(owner.memberCode, owner.phone, target.code),
            ),
            imageUrl: this.qr.imageUrl({ kind: 'fundraising', id: target.id }, now),
          }
        : undefined;
      const m = fundraisingMail(kind, owner.fullName, r.project.name, r.endsAt, {
        amount: target?.amount ?? fundAmountOf(prices, approved.has(r.projectId)),
        link: `${this.env.PORTAL_URL}/projects`,
        ...(transfer ? { transfer } : {}),
      });
      return [
        {
          to: owner.email,
          kind: kind === 'expired' ? ('fundraising_expired' as const) : ('fundraising' as const),
          subject: m.subject,
          html: m.html,
        },
      ];
    });
    if (mails.length) await this.mail.requestMany(tx, mails);
    await this.outbox.add(tx, 'fundraising.reminded', {
      items: rows.map((r) => ({
        fundraisingId: r.id,
        projectId: r.projectId,
        projectName: r.project.name,
        ownerId: r.ownerId,
        amount: r.amount,
        kind,
        endsAt: (r.endsAt ?? new Date(0)).toISOString(),
      })),
    });
  }
}
