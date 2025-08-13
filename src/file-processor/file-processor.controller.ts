import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { FileProcessorService } from './file-processor.service';
import { ApiKeyGuard } from './api-key.guard';
import type { ProcessFileRequest, ProcessFileResponse } from './types';

@Controller('api/file')
@UseGuards(ApiKeyGuard)
export class FileProcessorController {
  private readonly logger = new Logger(FileProcessorController.name);

  constructor(private readonly fileProcessorService: FileProcessorService) {}

  /**
   * Process a ZIP file from URL and upload contents to Google Drive
   * 
   * @example
   * POST /api/file/process
   * Headers: 
   *   x-api-key: your-api-key
   *   Content-Type: application/json
   * 
   * Body:
   * {
   *   "fileUrl": "https://www.sample-videos.com/zip/100mb.zip",
   *   "driveFolderLink": "https://drive.google.com/drive/folders/1ABC123XYZ"
   * }
   */
  @Post('process')
  @HttpCode(HttpStatus.OK)
  async processFile(@Body() request: ProcessFileRequest): Promise<ProcessFileResponse> {
    this.logger.log(`Processing file request: ${JSON.stringify({ fileUrl: request.fileUrl, driveFolderLink: request.driveFolderLink })}`);
    
    try {
      const result = await this.fileProcessorService.processFile(request);
      
      this.logger.log(`File processing completed successfully: ${result.totalFiles} files processed`);
      return result;
      
    } catch (error) {
      this.logger.error(`File processing failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
