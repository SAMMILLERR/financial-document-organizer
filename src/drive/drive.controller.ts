import { Controller, Post } from '@nestjs/common';
import { DriveService } from './drive.service';
import { GmailAttachment } from 'src/gmail/type';

@Controller('debug/drive')
export class DriveController {
  constructor(private readonly drive: DriveService) {}

  // For quick smoke test: simulate a single attachment
  @Post('upload')
  async uploadSample(): Promise<any> {
    const sample: GmailAttachment = {
      filename: 'test.txt',
      mimeType: 'text/plain',
      data: Buffer.from('Hello, world!'),
    };
    return this.drive.uploadAttachments([sample]);
  }
}
