import { Inject, Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { renewalDaysLeft, transferContentOf } from '@opchub/shared';
import type { RenewalMilestone, RenewalSettings } from '@opchub/shared/api-domains';
import { ENV, type Env } from '@/common/config';
import { bankTransferOf } from '@/common/integrations';
import { OutboxService } from '@/common/outbox';
import { MailService, MailQrToken, renewalMail, vnDateText } from '../../mail';
import type { RenewalCandidate } from '../repositories/renewal.repository';

@Injectable()
export class RenewalDeliveryService {
  constructor(
    private readonly mail: MailService,
    private readonly outbox: OutboxService,
    private readonly qr: MailQrToken,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async deliver(
    tx: DbTx,
    items: { row: RenewalCandidate; milestone: RenewalMilestone }[],
    channels: RenewalSettings['channels'],
    now: Date,
  ): Promise<void> {
    if (!items.length) return;
    if (channels.email)
      await this.mail.requestMany(
        tx,
        items.map(({ row: r, milestone }) => {
          const m = renewalMail({
            fullName: r.full_name,
            milestone,
            validUntil: r.valid_until,
            amount: r.amount,
            plan: r.plan,
            daysLeft: renewalDaysLeft(r.valid_until, now),
            trial: r.trial,
            transfer: {
              ...bankTransferOf(this.env, r.amount, transferContentOf(r.member_code, r.phone)),
              ...(milestone === 'D1'
                ? {
                    imageUrl: this.qr.imageUrl(
                      { kind: 'fee', id: r.user_id, anchor: r.valid_until.toISOString() },
                      now,
                    ),
                  }
                : {}),
            },
          });
          return { to: r.email, kind: 'fee_reminder' as const, subject: m.subject, html: m.html };
        }),
      );
    if (channels.app)
      await this.outbox.add(tx, 'membership_fee.reminded', {
        items: items.map(({ row: r }) => ({
          userId: r.user_id,
          title: 'Gói thành viên sắp hết hạn',
          text: `${r.plan === 'business' ? 'Gói Doanh nghiệp' : 'Gói Cá nhân'} hết hạn ngày ${vnDateText(r.valid_until)}. Gia hạn để không bị gián đoạn.`,
        })),
      });
  }
}
