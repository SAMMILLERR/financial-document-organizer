import { Controller, Get } from '@nestjs/common';
import { ScanService } from './scan.service';

@Controller('scan')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  /**
   * Main scan endpoint - trigger the complete automation flow
   */
  @Get()
  async scanAll() {
    const result = await this.scanService.runScan();
    return {
      message: `Processed ${result.processed} email(s).`,
      entries: result.details,
    };
  }
}
