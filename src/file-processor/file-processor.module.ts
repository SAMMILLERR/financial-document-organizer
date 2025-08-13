import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileProcessorController } from './file-processor.controller';
import { FileProcessorService } from './file-processor.service';
import { ApiKeyGuard } from './api-key.guard';
import { GoogleAuthModule } from '../google/google-auth/google-auth.module';

@Module({
  imports: [
    ConfigModule,
    GoogleAuthModule,
  ],
  controllers: [FileProcessorController],
  providers: [FileProcessorService, ApiKeyGuard],
  exports: [FileProcessorService],
})
export class FileProcessorModule {}
