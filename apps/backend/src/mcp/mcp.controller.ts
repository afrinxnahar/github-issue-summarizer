import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { McpService } from './mcp.service';

@Controller('tools')
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @Post('list')
  async listTools() {
    return [
      {
        name: 'summarizeIssues',
        description: 'Summarizes a specific GitHub issue or PR.',
        parameters: {
          url: {
            type: 'string',
            description:
              'GitHub issue or PR URL (e.g., https://github.com/vercel/next.js/pull/80974)',
          },
        },
      },
      {
        name: 'fetchRepoCode',
        description: 'Fetches the entire repository code structure.',
        parameters: {
          repo: {
            type: 'string',
            description: 'GitHub repository in the format owner/repo',
          },
        },
      },
    ];
  }

  @Post('execute')
  async executeTool(
    @Body()
    body: {
      id: number;
      tool: string;
      parameters: { url?: string; repo?: string };
    },
  ) {
    if (!body.tool || !body.parameters) {
      throw new HttpException(
        'Invalid request: tool and parameters are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      let result;
      switch (body.tool) {
        case 'summarizeIssues':
          if (!body.parameters.url) {
            throw new HttpException(
              'URL parameter is required for summarizeIssues',
              HttpStatus.BAD_REQUEST,
            );
          }
          result = await this.mcpService.summarizeIssues({
            url: body.parameters.url,
          });
          break;
        case 'fetchRepoCode':
          if (!body.parameters.repo) {
            throw new HttpException(
              'Repo parameter is required for fetchRepoCode',
              HttpStatus.BAD_REQUEST,
            );
          }
          result = await this.mcpService.fetchRepoCode({
            repo: body.parameters.repo,
          });
          break;
        default:
          throw new HttpException('Tool not found', HttpStatus.NOT_FOUND);
      }
      return { jsonrpc: '2.0', result, id: body.id || 1 };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        error: { code: -32603, message: error.message },
        id: body.id || 1,
      };
    }
  }
}
