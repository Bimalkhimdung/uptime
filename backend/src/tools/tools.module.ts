import { Module } from '@nestjs/common';
import { ToolsController } from './tools.controller';
import { WhoisModule } from '../whois/whois.module';
import { DnsService } from './dns.service';
import { HttpCheckService } from './http-check.service';
import { SslCheckService } from './ssl-check.service';
import { PortCheckService } from './port-check.service';
import { PingService } from './ping.service';

@Module({
  imports: [WhoisModule],
  controllers: [ToolsController],
  providers: [
    DnsService,
    HttpCheckService,
    SslCheckService,
    PortCheckService,
    PingService,
  ],
})
export class ToolsModule {}
