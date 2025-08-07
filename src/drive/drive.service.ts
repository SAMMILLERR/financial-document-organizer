import { Injectable, Logger } from '@nestjs/common';
import { google, drive_v3 } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthService } from 'src/google/google-auth/google-auth.service';
import { GmailAttachment } from 'src/gmail/type';
import { DriveUploadResult } from './types';
import { Readable } from 'stream';

@Injectable()
export class DriveService {
  private readonly logger = new Logger(DriveService.name);

  constructor(
    private readonly authService: GoogleAuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Uploads an array of GmailAttachment to Google Drive under the configured folder.
   * Files are renamed with a structured convention: [Sender]_[Invoice]_[Date].ext
   */
  async uploadAttachments(
    attachments: GmailAttachment[],
    emailContext?: { from: string; date: string; subject: string }
  ): Promise<DriveUploadResult[]> {
    const authClient = await this.authService.getClient();
    const drive = google.drive({ version: 'v3', auth: authClient });
    const folderId = this.configService.get<string>('config.google.driveFolderId');

    if (!folderId) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID not configured');
    }

    const results: DriveUploadResult[] = [];

    for (const att of attachments) {
      try {
        // Generate structured filename: [Sender]_[Invoice]_[Date].ext
        let structuredName = att.filename;
        if (emailContext) {
          const senderName = emailContext.from.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
          const dateStr = new Date(emailContext.date).toISOString().split('T')[0];
          const invoiceMatch = emailContext.subject.match(/invoice\s*#?(\d+)/i);
          const invoiceNum = invoiceMatch?.[1] || 'unknown';
          
          const fileExt = att.filename.split('.').pop() || 'file';
          structuredName = `${senderName}_${invoiceNum}_${dateStr}.${fileExt}`;
        }

        // Convert Buffer to Readable stream
        const stream = new Readable();
        stream.push(att.data);
        stream.push(null); // End the stream

        const res = await drive.files.create({
          requestBody: {
            name: structuredName,
            mimeType: att.mimeType,
            parents: [folderId],
          },
          media: {
            mimeType: att.mimeType,
            body: stream,
          },
          fields: 'id, webViewLink',
        });

        const fileId = res.data.id;
        const webViewLink = res.data.webViewLink || undefined;
        
        if (!fileId) {
          this.logger.error(`Failed to upload ${att.filename}: No file ID returned`);
          continue;
        }

        this.logger.log(`Uploaded ${att.filename} → ${fileId}`);
        results.push({ 
          filename: att.filename, 
          mimeType: att.mimeType, 
          fileId, 
          webViewLink 
        });
      } catch (error) {
        this.logger.error(`Failed to upload ${att.filename}:`, error);
        // Continue with other attachments even if one fails
      }
    }

    return results;
  }
}
