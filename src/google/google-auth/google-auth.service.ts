import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { promises as fs } from 'fs';
import { GoogleAuthTokens } from './types';

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private oauth2Client: OAuth2Client;
  private tokenPath: string;

  constructor(private config: ConfigService) {
    const clientId = this.config.get<string>('config.google.clientId');
    const clientSecret = this.config.get<string>('config.google.clientSecret');
    const redirectUri = this.config.get<string>('config.google.redirectUri');
    this.tokenPath = this.config.get<string>('config.tokenDbPath') || './tokens.json';

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Missing required Google OAuth configuration');
    }

    this.oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
  }

  /** 
   * Generate the auth URL; user visits this to grant access 
   */
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/spreadsheets',
    ];
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  }

  /** 
   * After user authorizes, exchange code for tokens and save them 
   */
  async saveTokens(code: string): Promise<void> {
    const { tokens } = await this.oauth2Client.getToken(code);
    await fs.writeFile(this.tokenPath, JSON.stringify(tokens, null, 2));
    this.logger.log(`Tokens saved to ${this.tokenPath}`);
  }

  /** 
   * Returns an authorized OAuth2 client, refreshing tokens if needed 
   */
  async getClient(): Promise<OAuth2Client> {
    // Load tokens
    let tokens: GoogleAuthTokens;
    try {
      const json = await fs.readFile(this.tokenPath, 'utf-8');
      tokens = JSON.parse(json);
    } catch (err) {
      throw new Error(`No tokens found at ${this.tokenPath}. Please authorize first.`);
    }

    this.oauth2Client.setCredentials(tokens);

    // Refresh if expired
    if ((tokens.expiry_date ?? 0) < Date.now()) {
      this.logger.log('Access token expired, refreshing...');
      const newTokens = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(newTokens.credentials);
      await fs.writeFile(this.tokenPath, JSON.stringify(newTokens.credentials, null, 2));
      this.logger.log('Tokens refreshed and saved.');
    }

    return this.oauth2Client;
  }
}
