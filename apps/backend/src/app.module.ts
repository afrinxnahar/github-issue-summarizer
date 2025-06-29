import { Module } from '@nestjs/common';
import { McpController } from './mcp/mcp.controller';
import { McpService } from './mcp/mcp.service';
import { ConfigModule } from '@nestjs/config';
import { McpModule } from '@rekog/mcp-nest';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    McpModule.forRoot({
      name: 'github-issue-summarizer',
      version: '1.0.0',
      sse: { pingEnabled: true, pingIntervalMs: 30000 },
    })
  ],
  controllers: [McpController],
  providers: [McpService],
})
export class AppModule { }
