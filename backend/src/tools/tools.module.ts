import { Module } from '@nestjs/common';
import { ToolsController } from './tools.controller';
import { WhoisModule } from '../whois/whois.module';

@Module({
  imports: [WhoisModule],
  controllers: [ToolsController],
})
export class ToolsModule {}
