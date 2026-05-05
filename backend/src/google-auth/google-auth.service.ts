import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';

const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private clientId() {
    return process.env.GOOGLE_OAUTH_CLIENT_ID || '';
  }
  private clientSecret() {
    return process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
  }
  private redirectUri() {
    return (
      process.env.GOOGLE_OAUTH_REDIRECT_URI ||
      'http://localhost:3001/api/integrations/google/callback'
    );
  }
  private frontendUrl() {
    return process.env.FRONTEND_URL || 'http://localhost:3000';
  }

  isConfigured() {
    return Boolean(this.clientId() && this.clientSecret());
  }

  newOAuthClient(): OAuth2Client {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'Google OAuth is not configured on the server (GOOGLE_OAUTH_CLIENT_ID / SECRET missing).',
      );
    }
    return new google.auth.OAuth2(
      this.clientId(),
      this.clientSecret(),
      this.redirectUri(),
    );
  }

  /** Builds the URL the user is sent to in order to grant analytics access. */
  buildAuthUrl(userId: string): string {
    const client = this.newOAuthClient();
    const state = this.jwt.sign({ sub: userId, kind: 'google_oauth' }, { expiresIn: '15m' });
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // ensures we get a refresh_token even on re-connect
      include_granted_scopes: true,
      scope: SCOPES,
      state,
    });
  }

  /** Exchanges the OAuth code for tokens, fetches the connected email, and persists. */
  async handleCallback(code: string, state: string): Promise<{ redirectTo: string }> {
    let userId: string;
    try {
      const decoded = this.jwt.verify<{ sub: string; kind: string }>(state);
      if (decoded.kind !== 'google_oauth' || !decoded.sub) {
        throw new Error('Invalid state payload');
      }
      userId = decoded.sub;
    } catch {
      return { redirectTo: `${this.frontendUrl()}/seo?google=error&reason=invalid_state` };
    }

    const client = this.newOAuthClient();
    let tokens;
    try {
      const res = await client.getToken(code);
      tokens = res.tokens;
    } catch (err: any) {
      this.logger.warn(`Token exchange failed: ${err?.message}`);
      return { redirectTo: `${this.frontendUrl()}/seo?google=error&reason=exchange_failed` };
    }

    if (!tokens.access_token) {
      return { redirectTo: `${this.frontendUrl()}/seo?google=error&reason=no_access_token` };
    }

    // Fetch the user's Google email (informational; helps the UI show "Connected as ...").
    let connectedEmail: string | null = null;
    try {
      client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: client });
      const me = await oauth2.userinfo.get();
      connectedEmail = me.data.email || null;
    } catch (err: any) {
      this.logger.warn(`userinfo fetch failed: ${err?.message}`);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token ?? undefined,
        googleTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        googleConnectedAt: new Date(),
        googleConnectedEmail: connectedEmail,
      },
    });

    return { redirectTo: `${this.frontendUrl()}/seo?google=connected` };
  }

  async disconnect(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiresAt: null,
        googleConnectedAt: null,
        googleConnectedEmail: null,
      },
    });
    return { ok: true };
  }

  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return {
      configured: this.isConfigured(),
      connected: Boolean(user?.googleConnectedAt),
      email: user?.googleConnectedEmail || null,
      connectedAt: user?.googleConnectedAt || null,
    };
  }

  /** Returns an authorized OAuth2Client for the user, refreshing tokens if needed. */
  async getAuthorizedClient(userId: string): Promise<OAuth2Client> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.googleAccessToken && !user?.googleRefreshToken) {
      throw new UnauthorizedException('Google account is not connected');
    }
    const client = this.newOAuthClient();
    client.setCredentials({
      access_token: user.googleAccessToken ?? undefined,
      refresh_token: user.googleRefreshToken ?? undefined,
      expiry_date: user.googleTokenExpiresAt ? user.googleTokenExpiresAt.getTime() : undefined,
    });

    // Persist refreshed tokens so we don't keep re-refreshing.
    client.on('tokens', (newTokens) => {
      this.prisma.user
        .update({
          where: { id: userId },
          data: {
            googleAccessToken: newTokens.access_token ?? user.googleAccessToken,
            googleRefreshToken: newTokens.refresh_token ?? user.googleRefreshToken,
            googleTokenExpiresAt: newTokens.expiry_date
              ? new Date(newTokens.expiry_date)
              : user.googleTokenExpiresAt,
          },
        })
        .catch((err) => this.logger.warn(`token persist failed: ${err?.message}`));
    });

    return client;
  }
}
