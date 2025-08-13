import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { GoogleAuthModule } from './google/google-auth/google-auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GmailModule } from './gmail/gmail.module';
import { DriveModule } from './drive/drive.module';
import { SheetsModule } from './sheets/sheets.module';
import { ScanModule } from './scan/scan.module';
import { FileProcessorModule } from './file-processor/file-processor.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    GoogleAuthModule,
    GmailModule,
    DriveModule,
    SheetsModule,
    ScanModule,
    FileProcessorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}