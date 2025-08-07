import { Controller, Post, Body } from '@nestjs/common';
import { SheetsService } from './sheets.service';
import { SheetLogEntry } from './types';

@Controller('debug/sheets')
export class SheetsController {
  constructor(private readonly sheets: SheetsService) {}

  @Post('append')
  async append(@Body() entries: SheetLogEntry[]) {
    return this.sheets.appendEntries(entries);
  }
}
