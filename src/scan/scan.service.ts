import { Injectable, Logger } from '@nestjs/common';
import { GmailService } from '../gmail/gmail.service';
import { DriveService } from '../drive/drive.service';
import { SheetsService } from '../sheets/sheets.service';
import { SheetLogEntry } from '../sheets/types';

@Injectable()
export class ScanService {
  private readonly logger = new Logger(ScanService.name);

  constructor(
    private readonly gmail: GmailService,
    private readonly drive: DriveService,
    private readonly sheets: SheetsService,
  ) {}

  /**
   * 1) Fetch invoice emails
   * 2) Upload attachments to Drive
   * 3) Log each email + file IDs to Sheets
   */
  async runScan(): Promise<{ processed: number; details: SheetLogEntry[] }> {
    // 1) Fetch from Gmail
    const emails = await this.gmail.fetchInvoiceEmails();
    this.logger.log(`Processing ${emails.length} emails`);

    const entries: SheetLogEntry[] = [];

    for (const email of emails) {
      // 2) Upload attachments with email context for structured naming
      const uploads = await this.drive.uploadAttachments(
        email.attachments,
        { from: email.from, date: email.date, subject: email.subject }
      );
      const fileIds = uploads.map(u => u.fileId);

      // 3) Build log entry
      const invoiceNumberMatch = email.subject.match(/invoice\s*#?(\d+)/i);
      const invoiceNumber = invoiceNumberMatch?.[1];

      entries.push({
        from: email.from,
        date: email.date,
        subject: email.subject,
        invoiceNumber,
        driveFileIds: fileIds,
        processedAt: new Date().toISOString(),
      });
    }

    // 4) Append all entries to Sheets (if any)
    if (entries.length > 0) {
      await this.sheets.appendEntries(entries);
    }

    return { processed: entries.length, details: entries };
  }
}
