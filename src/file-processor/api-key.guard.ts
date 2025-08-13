import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);
    
    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }
    
    const validApiKey = this.configService.get<string>('config.apiKey');
    
    if (!validApiKey) {
      throw new UnauthorizedException('API key authentication is not configured');
    }
    
    if (apiKey !== validApiKey) {
      throw new UnauthorizedException('Invalid API key');
    }
    
    return true;
  }

  private extractApiKey(request: Request): string | undefined {
    // Check multiple possible locations for API key
    
    // 1. Authorization header: "Bearer API_KEY" or "ApiKey API_KEY"
    const authHeader = request.headers.authorization;
    if (authHeader) {
      const [type, key] = authHeader.split(' ');
      if ((type === 'Bearer' || type === 'ApiKey') && key) {
        return key;
      }
    }
    
    // 2. Custom header: x-api-key
    const apiKeyHeader = request.headers['x-api-key'];
    if (apiKeyHeader && typeof apiKeyHeader === 'string') {
      return apiKeyHeader;
    }
    
    // 3. Query parameter: ?api_key=
    const queryApiKey = request.query.api_key;
    if (queryApiKey && typeof queryApiKey === 'string') {
      return queryApiKey;
    }
    
    return undefined;
  }
}
