import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { GoogleAuthService } from '../google-auth/google-auth.service';

export type GaProperty = {
  property: string; // "properties/123456789"
  displayName: string;
  account: string | null;
  accountDisplayName: string | null;
};

export type SiteAnalytics = {
  property: string;
  range: { start: string; end: string };
  totals: {
    activeUsers: number;
    newUsers: number;
    sessions: number;
    screenPageViews: number;
    averageSessionDuration: number; // seconds
    bounceRate: number; // 0-1
  };
  realtimeActiveUsers: number;
  daily: Array<{
    date: string;
    activeUsers: number;
    newUsers: number;
    sessions: number;
  }>;
  topPages: Array<{ path: string; views: number }>;
};

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private gauth: GoogleAuthService) {}

  /** List GA4 properties the connected account can read. Combines admin API account + property summaries. */
  async listProperties(userId: string): Promise<GaProperty[]> {
    const auth = await this.gauth.getAuthorizedClient(userId);
    const admin = google.analyticsadmin({ version: 'v1beta', auth });

    const summaries = await admin.accountSummaries.list({ pageSize: 200 });
    const out: GaProperty[] = [];
    for (const acct of summaries.data.accountSummaries || []) {
      for (const prop of acct.propertySummaries || []) {
        if (!prop.property) continue;
        out.push({
          property: prop.property,
          displayName: prop.displayName || prop.property,
          account: acct.account || null,
          accountDisplayName: acct.displayName || null,
        });
      }
    }
    return out;
  }

  /** Pulls 28-day metrics + realtime active users + daily series + top pages. */
  async fetchSiteAnalytics(
    userId: string,
    propertyId: string,
  ): Promise<SiteAnalytics> {
    const auth = await this.gauth.getAuthorizedClient(userId);
    const data = google.analyticsdata({ version: 'v1beta', auth });

    const dateRange = { startDate: '28daysAgo', endDate: 'today' };

    const [totalsRes, dailyRes, topPagesRes, realtimeRes] = await Promise.all([
      data.properties.runReport({
        property: propertyId,
        requestBody: {
          dateRanges: [dateRange],
          metrics: [
            { name: 'activeUsers' },
            { name: 'newUsers' },
            { name: 'sessions' },
            { name: 'screenPageViews' },
            { name: 'averageSessionDuration' },
            { name: 'bounceRate' },
          ],
        },
      }),
      data.properties.runReport({
        property: propertyId,
        requestBody: {
          dateRanges: [dateRange],
          dimensions: [{ name: 'date' }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'newUsers' },
            { name: 'sessions' },
          ],
          orderBys: [{ dimension: { dimensionName: 'date' } }],
          limit: '60',
        },
      }),
      data.properties.runReport({
        property: propertyId,
        requestBody: {
          dateRanges: [dateRange],
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: '10',
        },
      }),
      data.properties.runRealtimeReport({
        property: propertyId,
        requestBody: { metrics: [{ name: 'activeUsers' }] },
      }),
    ]);

    const totalsRow = totalsRes.data.rows?.[0]?.metricValues || [];
    const totals = {
      activeUsers: Number(totalsRow[0]?.value ?? 0),
      newUsers: Number(totalsRow[1]?.value ?? 0),
      sessions: Number(totalsRow[2]?.value ?? 0),
      screenPageViews: Number(totalsRow[3]?.value ?? 0),
      averageSessionDuration: Number(totalsRow[4]?.value ?? 0),
      bounceRate: Number(totalsRow[5]?.value ?? 0),
    };

    const daily = (dailyRes.data.rows || []).map((r) => {
      const date = r.dimensionValues?.[0]?.value || '';
      const m = r.metricValues || [];
      return {
        date: this.formatGaDate(date),
        activeUsers: Number(m[0]?.value ?? 0),
        newUsers: Number(m[1]?.value ?? 0),
        sessions: Number(m[2]?.value ?? 0),
      };
    });

    const topPages = (topPagesRes.data.rows || []).map((r) => ({
      path: r.dimensionValues?.[0]?.value || '',
      views: Number(r.metricValues?.[0]?.value ?? 0),
    }));

    const realtimeActiveUsers = Number(
      realtimeRes.data.rows?.[0]?.metricValues?.[0]?.value ?? 0,
    );

    return {
      property: propertyId,
      range: { start: dateRange.startDate, end: dateRange.endDate },
      totals,
      realtimeActiveUsers,
      daily,
      topPages,
    };
  }

  /** "20260505" -> "2026-05-05". GA4 returns ISO-less yyyymmdd for the date dimension. */
  private formatGaDate(s: string): string {
    if (!s || s.length !== 8) return s;
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
}
