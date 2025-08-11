import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import AdmZip from 'adm-zip';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { GoogleAuthService } from '../google/google-auth/google-auth.service';
import { 
  ProcessFileRequest, 
  ProcessFileResponse, 
  FileProcessResult, 
  ExtractionResult, 
  ExtractedFile,
  DownloadProgress 
} from './types';

@Injectable()
export class FileProcessorService {
  private readonly logger = new Logger(FileProcessorService.name);

  constructor(
    private readonly authService: GoogleAuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Main method to process a ZIP file from URL and upload to Google Drive
   */
  async processFile(request: ProcessFileRequest): Promise<ProcessFileResponse> {
    try {
      this.logger.log(`Starting file processing for URL: ${request.fileUrl}`);
      
      // 1. Validate inputs
      this.validateRequest(request);
      
      // 2. Extract folder ID from Google Drive link
      const folderId = this.extractFolderIdFromLink(request.driveFolderLink);
      
      // 3. Download the ZIP file
      this.logger.log('Downloading ZIP file...');
      const zipBuffer = await this.downloadFile(request.fileUrl);
      
      // 4. Extract ZIP contents
      this.logger.log('Extracting ZIP contents...');
      const extractedFiles = await this.extractZipFile(zipBuffer);
      
      // 5. Upload files to Google Drive
      this.logger.log(`Uploading ${extractedFiles.files.length} files to Google Drive...`);
      const uploadResults = await this.uploadFilesToDrive(extractedFiles.files, folderId);
      
      const response: ProcessFileResponse = {
        success: true,
        message: `Successfully processed and uploaded ${uploadResults.length} files`,
        processedFiles: uploadResults,
        driveFolder: folderId,
        totalFiles: extractedFiles.totalFiles,
        totalSize: extractedFiles.totalSize,
      };
      
      this.logger.log(`File processing completed successfully: ${uploadResults.length} files uploaded`);
      return response;
      
    } catch (error) {
      this.logger.error(`File processing failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`File processing failed: ${error.message}`);
    }
  }

  /**
   * Validate the incoming request
   */
  private validateRequest(request: ProcessFileRequest): void {
    if (!request.fileUrl || !request.fileUrl.trim()) {
      throw new BadRequestException('fileUrl is required');
    }
    
    if (!request.driveFolderLink || !request.driveFolderLink.trim()) {
      throw new BadRequestException('Drive folder link is required');
    }
    
    // Validate URL format
    try {
      new URL(request.fileUrl);
    } catch (error) {
      throw new BadRequestException('Invalid URL format');
    }
    
    // Validate that it's a ZIP file URL (or allow any file for now since the URL might redirect)
    // We'll check the actual content type when downloading
    this.logger.log(`Validating file URL: ${request.fileUrl}`);
  }

  /**
   * Extract Google Drive folder ID from various link formats
   */
  private extractFolderIdFromLink(driveLink: string): string {
    // Handle different Google Drive link formats:
    // https://drive.google.com/drive/folders/FOLDER_ID
    // https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
    // https://drive.google.com/open?id=FOLDER_ID
    
    const patterns = [
      /\/folders\/([a-zA-Z0-9_-]+)/,  // Standard folder link
      /[?&]id=([a-zA-Z0-9_-]+)/,      // Open link format
      /\/d\/([a-zA-Z0-9_-]+)/,        // Direct file/folder link
    ];
    
    for (const pattern of patterns) {
      const match = driveLink.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    // If no pattern matches, assume the entire string is the folder ID
    const cleanId = driveLink.split('/').pop()?.split('?')[0];
    if (cleanId && cleanId.length > 10) {
      return cleanId;
    }
    
    throw new BadRequestException('Invalid Google Drive folder link format');
  }

  /**
   * Download file from URL with progress tracking
   */
  private async downloadFile(url: string): Promise<Buffer> {
    try {
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'arraybuffer',
        timeout: 300000, // 5 minutes timeout
        maxContentLength: 500 * 1024 * 1024, // 500MB max
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress: DownloadProgress = {
              downloaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
            };
            this.logger.log(`Download progress: ${progress.percentage}% (${this.formatBytes(progress.downloaded)}/${this.formatBytes(progress.total)})`);
          }
        },
      });

      this.logger.log(`File downloaded successfully: ${this.formatBytes(response.data.byteLength)}`);
      return Buffer.from(response.data);
      
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new BadRequestException('Download timeout - file too large or server too slow');
      }
      if (error.response?.status === 404) {
        throw new BadRequestException('File not found at the provided URL');
      }
      if (error.response?.status >= 400) {
        throw new BadRequestException(`Failed to download file: HTTP ${error.response.status}`);
      }
      throw new InternalServerErrorException(`Download failed: ${error.message}`);
    }
  }

  /**
   * Extract files from ZIP buffer
   */
  private async extractZipFile(zipBuffer: Buffer): Promise<ExtractionResult> {
    try {
      const zip = new AdmZip(zipBuffer);
      const zipEntries = zip.getEntries();
      
      const extractedFiles: ExtractedFile[] = [];
      let totalSize = 0;
      
      for (const entry of zipEntries) {
        // Skip directories and hidden files
        if (entry.isDirectory || entry.entryName.startsWith('.') || entry.entryName.includes('__MACOSX')) {
          continue;
        }
        
        const data = entry.getData();
        const mimeType = this.getMimeType(entry.entryName);
        
        extractedFiles.push({
          name: entry.entryName,
          path: entry.entryName,
          size: data.length,
          data: data,
          mimeType: mimeType,
        });
        
        totalSize += data.length;
      }
      
      this.logger.log(`Extracted ${extractedFiles.length} files, total size: ${this.formatBytes(totalSize)}`);
      
      return {
        files: extractedFiles,
        totalFiles: extractedFiles.length,
        totalSize: totalSize,
      };
      
    } catch (error) {
      throw new InternalServerErrorException(`Failed to extract ZIP file: ${error.message}`);
    }
  }

  /**
   * Upload extracted files to Google Drive
   */
  private async uploadFilesToDrive(files: ExtractedFile[], folderId: string): Promise<FileProcessResult[]> {
    const authClient = await this.authService.getClient();
    const drive = google.drive({ version: 'v3', auth: authClient });
    
    const uploadResults: FileProcessResult[] = [];
    
    for (const file of files) {
      try {
        this.logger.log(`Uploading file: ${file.name} (${this.formatBytes(file.size)})`);
        
        // Convert Buffer to Readable stream
        const stream = new Readable();
        stream.push(file.data);
        stream.push(null);
        
        const response = await drive.files.create({
          requestBody: {
            name: file.name,
            parents: [folderId],
          },
          media: {
            mimeType: file.mimeType,
            body: stream,
          },
        });
        
        if (response.data.id) {
          uploadResults.push({
            fileName: file.name,
            driveFileId: response.data.id,
            size: file.size,
            mimeType: file.mimeType,
            uploadedAt: new Date().toISOString(),
          });
          
          this.logger.log(`Successfully uploaded: ${file.name} (ID: ${response.data.id})`);
        }
        
      } catch (error) {
        this.logger.error(`Failed to upload file ${file.name}: ${error.message}`);
        // Continue with other files even if one fails
      }
    }
    
    return uploadResults;
  }

  /**
   * Determine MIME type based on file extension
   */
  private getMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    const mimeTypes: { [key: string]: string } = {
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      
      // Documents
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'txt': 'text/plain',
      'csv': 'text/csv',
      
      // Videos
      'mp4': 'video/mp4',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'wmv': 'video/x-ms-wmv',
      'flv': 'video/x-flv',
      'webm': 'video/webm',
      'mkv': 'video/x-matroska',
      
      // Audio
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'flac': 'audio/flac',
      'aac': 'audio/aac',
      
      // Archives
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      'tar': 'application/x-tar',
      'gz': 'application/gzip',
    };
    
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
