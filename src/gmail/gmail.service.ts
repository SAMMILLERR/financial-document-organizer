import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { GoogleAuthService } from 'src/google/google-auth/google-auth.service';
import { GmailMessage, GmailAttachment } from './type';

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);

  constructor(private readonly authService: GoogleAuthService) {}

  /**
   * Fetch unread emails matching “invoice” or “receipt” in subject,
   * download attachments, and mark as read.
   */
  async fetchInvoiceEmails(): Promise<GmailMessage[]> {
    // 1) Obtain authenticated client
    const authClient = await this.authService.getClient();
    const gmail = google.gmail({ version: 'v1', auth: authClient });

    // 2) List unread invoice/receipt messages (limit to 20 for now)
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread (subject:invoice OR subject:receipt)',
      maxResults: 20,
    });
    const messages = listRes.data.messages ?? [];
    this.logger.log(`Found ${messages.length} matching emails`);

    const result: GmailMessage[] = [];

    // 3) For each message ID, fetch full payload
    for (const message of messages) {
      if (!message.id) continue;
      
      const msgRes = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full',
      });
      const payload = msgRes.data.payload;
      if (!payload) continue;

      // 4) Parse important headers
      const headers = payload.headers || [];
      const lookup = (name: string) =>
        headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
      const from = lookup('From');
      const date = lookup('Date');
      const subject = lookup('Subject');

      // 5) Extract attachments
      const attachments: GmailAttachment[] = [];
      for (const part of payload.parts ?? []) {
        if (part.filename && part.body?.attachmentId) {
          const attachRes = await gmail.users.messages.attachments.get({
            userId: 'me',
            messageId: message.id,
            id: part.body.attachmentId,
          });
          const buffer = Buffer.from(attachRes.data.data!, 'base64');
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType ?? 'application/octet-stream',
            data: buffer,
          });
        }
      }

      // 6) Add custom label and mark as read to avoid reprocessing
      await gmail.users.messages.modify({
        userId: 'me',
        id: message.id,
        requestBody: { 
          addLabelIds: ['INBOX'], // You can create a custom label ID here
          removeLabelIds: ['UNREAD'] 
        },
      });

      result.push({ 
        id: message.id, 
        threadId: msgRes.data.threadId || '', 
        from, 
        date, 
        subject, 
        attachments 
      });
    }

    return result;
  }
}
