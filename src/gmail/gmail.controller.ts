import { Controller, Get } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { GmailMessage } from './type';

@Controller('debug/gmail')
export class GmailController {
  constructor(private readonly gmail: GmailService) {}

  @Get('emails')
  async scanEmails(): Promise<GmailMessage[]> {
    return this.gmail.fetchInvoiceEmails();
  }
}
