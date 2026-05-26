import {clientIp} from './cors.ts';
import {rateLimitOr429} from './rateLimit.ts';

export async function rateLimitPublicRead(req: Request): Promise<Response | null> {
  return rateLimitOr429(req, `browse:${clientIp(req)}`, 120, 60);
}

export async function rateLimitAuth(req: Request, discordId: string): Promise<Response | null> {
  return rateLimitOr429(req, `auth:${discordId}`, 60, 60);
}

export async function rateLimitMutation(req: Request, discordId: string): Promise<Response | null> {
  return rateLimitOr429(req, `mut:${discordId}`, 40, 60);
}

export async function rateLimitOAuthExchange(req: Request): Promise<Response | null> {
  return rateLimitOr429(req, `oauth:${clientIp(req)}`, 30, 60);
}
