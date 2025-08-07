import { Module } from '@nestjs/common';
import { ScanService } from './scan.service';
import { ScanController } from './scan.controller';
import { GmailModule } from '../gmail/gmail.module';
import { DriveModule } from '../drive/drive.module';
import { SheetsModule } from '../sheets/sheets.module';

@Module({
  imports: [GmailModule, DriveModule, SheetsModule],
  providers: [ScanService],
  controllers: [ScanController],
})
export class ScanModule {}
