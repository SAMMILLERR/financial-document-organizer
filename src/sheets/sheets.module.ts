import { Module } from '@nestjs/common';
import { SheetsService } from './sheets.service';
import { GoogleAuthModule } from 'src/google/google-auth/google-auth.module';
import { SheetsController } from './sheets.controller';

@Module({
  imports: [GoogleAuthModule],
  providers: [SheetsService],
  controllers: [SheetsController],
  exports: [SheetsService],
})
export class SheetsModule {}
