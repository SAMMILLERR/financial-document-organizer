import { Module } from '@nestjs/common';
import { DriveService } from './drive.service';
import { GoogleAuthModule } from 'src/google/google-auth/google-auth.module';
import { DriveController } from './drive.controller';

@Module({
  imports: [GoogleAuthModule],
  providers: [DriveService],
  exports: [DriveService],
  controllers: [DriveController],
})
export class DriveModule {}
