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

  private async send(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Uptime Monitor" <noreply@uptime.io>',
        to,
        subject,
        html,
      });
      this.logger.log(`Alert sent to ${to}: ${subject}`);
    } catch (err) {
      this.logger.error(`Failed to send alert to ${to}: ${err.message}`);
    }
  }
}
