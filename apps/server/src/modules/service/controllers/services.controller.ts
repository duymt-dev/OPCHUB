import { Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import {
  createServiceRequestSchema,
  type ServiceRequest,
  serviceRequestSchema,
  serviceSchema,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import { type AccessClaims, CurrentUser, SkipMembershipFee } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import { ServiceRequestService } from '../services/service-request.service';

const listSchema = z.object({ items: z.array(serviceSchema) });

/** Portal: dịch vụ + gửi phiếu YC — nằm trong hộp phí (gợi ý tư vấn), không paywall */
@SkipMembershipFee()
@Controller()
export class ServicesController {
  constructor(private readonly requests: ServiceRequestService) {}

  @Get('services')
  async list(): Promise<z.infer<typeof listSchema>> {
    return respond(listSchema, { items: await this.requests.catalog() });
  }

  @Post('service-requests')
  @HttpCode(201)
  async create(
    @CurrentUser() user: AccessClaims,
    @Headers('idempotency-key') key: string | undefined,
    @ZodBody(createServiceRequestSchema) body: z.output<typeof createServiceRequestSchema>,
  ): Promise<ServiceRequest> {
    return respond(serviceRequestSchema, await this.requests.create(user.sub, key, body));
  }
}
