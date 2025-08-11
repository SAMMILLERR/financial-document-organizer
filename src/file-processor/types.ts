export interface ProcessFileRequest {
  fileUrl: string;
  driveFolderLink: string;
}

export interface ProcessFileResponse {
  success: boolean;
  message: string;
  processedFiles?: FileProcessResult[];
  driveFolder?: string;
  totalFiles?: number;
  totalSize?: number;
}

export interface FileProcessResult {
  fileName: string;
  driveFileId: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface DownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
}

export interface ExtractionResult {
  files: ExtractedFile[];
  totalFiles: number;
  totalSize: number;
}

export interface ExtractedFile {
  name: string;
  path: string;
  size: number;
  data: Buffer;
  mimeType: string;
}
