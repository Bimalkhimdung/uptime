import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendDownAlert(monitor: any, contact: any, errorMessage?: string) {
    if (contact.type !== 'EMAIL') return;

    const subject = `🔴 [DOWN] ${monitor.name} is unreachable`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #ef4444; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin:0; font-size: 24px;">🔴 Monitor Down</h1>
        </div>
        <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
          <h2 style="color: #111827; margin-top: 0;">${monitor.name}</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">URL</td>
              <td style="padding: 8px 0; font-weight: bold;"><a href="${monitor.url}">${monitor.url}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Time</td>
              <td style="padding: 8px 0; font-weight: bold;">${new Date().toUTCString()}</td>
            </tr>
            ${errorMessage ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Error</td>
              <td style="padding: 8px 0; font-weight: bold; color: #ef4444;">${errorMessage}</td>
            </tr>` : ''}
          </table>
          <p style="color: #6b7280; margin-top: 20px; font-size: 14px;">
            You will receive another email when the monitor recovers.
          </p>
        </div>
        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">
          Powered by Uptime Monitor
        </p>
      </div>
    `;

    await this.send(contact.value, subject, html);
  }

  async sendRecoveryAlert(monitor: any, contact: any) {
    if (contact.type !== 'EMAIL') return;

    const subject = `🟢 [RECOVERED] ${monitor.name} is back online`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #22c55e; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin:0; font-size: 24px;">🟢 Monitor Recovered</h1>
        </div>
        <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
          <h2 style="color: #111827; margin-top: 0;">${monitor.name}</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">URL</td>
              <td style="padding: 8px 0; font-weight: bold;"><a href="${monitor.url}">${monitor.url}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Recovered at</td>
              <td style="padding: 8px 0; font-weight: bold;">${new Date().toUTCString()}</td>
            </tr>
          </table>
          <p style="color: #6b7280; margin-top: 20px; font-size: 14px;">
            Your monitored service is back online. 
          </p>
        </div>
        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">
          Powered by Uptime Monitor
        </p>
      </div>
    `;

    await this.send(contact.value, subject, html);
  }

  async sendTestNotification(monitor: any, to: string) {
    const isUp = monitor.status === 'UP';
    const isDown = monitor.status === 'DOWN';
    const statusColor = isUp ? '#22c55e' : isDown ? '#ef4444' : '#94a3b8';
    const statusEmoji = isUp ? '🟢' : isDown ? '🔴' : '⚪️';
    const statusLabel = monitor.status || 'PENDING';

    const sslLine =
      monitor.sslValidUntil
        ? `${new Date(monitor.sslValidUntil).toUTCString()} (${monitor.sslDaysLeft ?? '?'} days left, issuer: ${monitor.sslIssuer ?? '—'})`
        : 'Not collected yet';
    const domainLine =
      monitor.domainExpiresAt
        ? `${new Date(monitor.domainExpiresAt).toUTCString()} (${monitor.domainDaysLeft ?? '?'} days left, registrar: ${monitor.domainRegistrar ?? '—'})`
        : 'Not collected yet';
    const lastCheckLine = monitor.lastCheckedAt
      ? new Date(monitor.lastCheckedAt).toUTCString()
      : 'Never';

    const subject = `🧪 [TEST] ${monitor.name} — current status ${statusLabel}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${statusColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin:0; font-size: 22px;">${statusEmoji} Test notification</h1>
          <p style="margin: 4px 0 0; opacity: 0.9; font-size: 13px;">This is a manually-triggered test from your dashboard.</p>
        </div>
        <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
          <h2 style="color: #111827; margin-top: 0;">${escapeHtml(monitor.name)}</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #6b7280; width: 160px;">URL</td>
                <td style="padding: 6px 0;"><a href="${escapeHtml(monitor.url)}">${escapeHtml(monitor.url)}</a></td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Status</td>
                <td style="padding: 6px 0; font-weight: bold; color: ${statusColor};">${statusLabel}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">HTTP code</td>
                <td style="padding: 6px 0;">${monitor.lastStatusCode ?? '—'}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Response time</td>
                <td style="padding: 6px 0;">${monitor.lastResponseTime != null ? monitor.lastResponseTime + ' ms' : '—'}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Uptime</td>
                <td style="padding: 6px 0;">${(monitor.uptimePercent ?? 100).toFixed(2)}%</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Check interval</td>
                <td style="padding: 6px 0;">Every ${monitor.interval} min</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Last checked</td>
                <td style="padding: 6px 0;">${lastCheckLine}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Domain resolves</td>
                <td style="padding: 6px 0;">${monitor.domainResolved == null ? '—' : monitor.domainResolved ? 'Yes' : 'No'}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Domain expires</td>
                <td style="padding: 6px 0;">${domainLine}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">SSL certificate</td>
                <td style="padding: 6px 0;">${sslLine}</td></tr>
          </table>
          <p style="color: #6b7280; margin-top: 20px; font-size: 13px;">
            If you received this email, your alert pipeline is working — real DOWN/RECOVERY alerts will land here too.
          </p>
        </div>
        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">
          Powered by Uptime Monitor
        </p>
      </div>
    `;

    await this.send(to, subject, html, { throwOnError: true });
  }

  private async send(
    to: string,
    subject: string,
    html: string,
    opts: { throwOnError?: boolean } = {},
  ) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Uptime Monitor" <noreply@uptime.io>',
        to,
        subject,
        html,
      });
      this.logger.log(`Alert sent to ${to}: ${subject}`);
    } catch (err: any) {
      this.logger.error(`Failed to send alert to ${to}: ${err.message}`);
      if (opts.throwOnError) throw err;
    }
  }
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
