import { Controller, HttpCode, Post } from '@nestjs/common';
import { fakeBankBodySchema, type FakeBankBody } from '@opchub/integrations';
import { Public } from '@/common/auth';
import { ZodBody } from '@/common/http/zod';
import { BankSimulationService } from '../services/bank-simulation.service';

/** Existing fake ingress, unchanged response and production404. */
@Controller('dev/bank')
export class DevBankController {
  constructor(private readonly simulation: BankSimulationService) {}
  @Public()
  @Post('simulate')
  @HttpCode(200)
  async simulate(@ZodBody(fakeBankBodySchema, { raw: true }) body: FakeBankBody) {
    return { received: await this.simulation.ingest(body) };
  }
}
