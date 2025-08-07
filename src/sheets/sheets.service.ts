import { Injectable, Logger } from '@nestjs/common';
import { google, sheets_v4 } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthService } from 'src/google/google-auth/google-auth.service';
import { SheetLogEntry } from './types';

@Injectable()
export class SheetsService {
  private readonly logger = new Logger(SheetsService.name);

  constructor(
    private readonly authService: GoogleAuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Append log entries to the sheet.
   * Each entry becomes one row.
   */
  async appendEntries(entries: SheetLogEntry[]): Promise<sheets_v4.Schema$AppendValuesResponse> {
    const auth = await this.authService.getClient();
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = this.configService.get<string>('config.google.sheetId');

    if (!sheetId) {
      throw new Error('GOOGLE_SHEET_ID not configured');
    }

    // Build rows: [from, date, subject, invoiceNumber, driveFileIds, processedAt]
    const values = entries.map(e => [
      e.from,
      e.date,
      e.subject,
      e.invoiceNumber || '',
      e.driveFileIds.join(', '),
      e.processedAt,
    ]);

    const res = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Sheet1!A:F',          // adjust if using a different tab/name or columns
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });

    this.logger.log(`Appended ${entries.length} rows to sheet ${sheetId}`);
    return res.data;
  }
}
