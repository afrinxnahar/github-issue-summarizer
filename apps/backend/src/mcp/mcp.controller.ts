import { McpService } from "./mcp.service";
import { Controller, Post, Body, HttpException, HttpStatus } from "@nestjs/common";

@Controller('tools')
export class McpController {
  constructor(private readonly mcpService: McpService) { };

  @Post('list')
  async listTools() {
    return [
      {
        name: 'summarizeIssues',
        description: 'Summarizes open GitHub issues for a repository.',
        parameters: {
          repo: { type: 'string', description: 'GitHub repo (owner/repo)' },
        },
      },
    ]
  }


  @Post('execute')
  async executeTool(@Body() body: { id: number, tool: string, parameters: { repo: string } }) {
    if (body.tool !== 'summarizeIssues') {
      throw new HttpException('Tool not found', HttpStatus.NOT_FOUND);
    }
    try {
      const result = await this.mcpService.summarizeIssues(body.parameters);
      return { jsonrpc: '2.0', result, id: body.id || 1 };
    } catch (error) {
      return { jsonrpc: '2.0', error: { code: -32603, message: error.message }, id: body.id || 1 };
    }
  }
}