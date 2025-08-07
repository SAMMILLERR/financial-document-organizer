import { Module } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { GoogleAuthModule } from 'src/google/google-auth/google-auth.module';
import { GmailController } from './gmail.controller';

@Module({
  imports: [GoogleAuthModule],
  providers: [GmailService],
  exports: [GmailService],
  controllers: [GmailController],
})
export class GmailModule {}
