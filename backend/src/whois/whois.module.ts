import { Module } from '@nestjs/common';
import { WhoisService } from './whois.service';

@Module({
  providers: [WhoisService],
  exports: [WhoisService],
})
export class WhoisModule {}
