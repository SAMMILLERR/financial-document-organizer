export interface SheetLogEntry {
  from: string;
  date: string;
  subject: string;
  invoiceNumber?: string;
  driveFileIds: string[];   // one or more file IDs
  processedAt: string;      // ISO timestamp
}
