import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { McpService } from './mcp.service';

@Controller('tools')
export class McpController {
  constructor(private readonly mcpService: McpService) { }

  @Post('list')
  listTools() {
    return {
      jsonrpc: '2.0',
      result: [
        {
          name: 'summarizeIssues',
          description: 'Summarizes open GitHub issues for a repository.',
          parameters: {
            repo: { type: 'string', description: 'GitHub repo (owner/repo)' },
          },
        },
      ],
      id: 1,
    };
  }

  @Post('execute')
  async executeTool(@Body() body: {
    id: number; tool: string; parameters: { repo: string }
  }) {
    if (body.tool !== 'summarizeIssues') {
      throw new HttpException('Tool not found', HttpStatus.NOT_FOUND);
    }
    try {
      const result = await this.mcpService.summarizeIssues(body.parameters.repo);
      return { jsonrpc: '2.0', result, id: body.id || 1 };
    } catch (error) {
      return { jsonrpc: '2.0', error: { code: -32603, message: error.message }, id: body.id || 1 };
    }
  }
}