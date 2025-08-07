export interface GmailAttachment {
  filename: string;
  mimeType: string;
  data: Buffer;    // raw binary file data
}

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  date: string;
  subject: string;
  attachments: GmailAttachment[];
}
