import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { GoogleAuthService } from './google/google-auth/google-auth.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly googleAuthService: GoogleAuthService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('auth/url')
  getAuthUrl(): { url: string } {
    const url = this.googleAuthService.getAuthUrl();
    return { url };
  }

  @Get('auth/callback')
  async handleCallback(@Query('code') code: string): Promise<{ message: string }> {
    if (!code) {
      return { message: 'No authorization code provided' };
    }
    
    try {
      await this.googleAuthService.saveTokens(code);
      return { message: 'Authorization successful! Tokens saved.' };
    } catch (error) {
      return { message: `Error: ${error.message}` };
    }
  }
}
