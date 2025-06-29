import { Injectable } from '@nestjs/common';
import { Octokit } from '@octokit/core';
import { GoogleGenAI } from '@google/genai';
import { ConfigService } from '@nestjs/config';
import { Tool, Context } from '@rekog/mcp-nest';
import { z } from 'zod';

@Injectable()
export class McpService {
  private octokit: Octokit;
  private genAI: GoogleGenAI;

  constructor(private configService: ConfigService) {
    this.octokit = new Octokit({ auth: this.configService.getOrThrow('GITHUB_TOKEN') });
    this.genAI = new GoogleGenAI({ apiKey: this.configService.getOrThrow('GEMINI_API_KEY') });
  }

  @Tool({
    name: 'summarizeIssues',
    description: 'Summarizes open GitHub issues for a repository.',
    parameters: z.object({
      repo: z.string().describe('GitHub repository in the format owner/repo'),
    }),
  })
  async summarizeIssues({ repo }: { repo: string }) {
    try {
      const [owner, repoName] = repo.split('/');
      const { data: issues } = await this.octokit.request('GET /repos/{owner}/{repo}/issues', {
        owner,
        repo: repoName,
      });
      if (!issues || issues.length === 0) {
        return { message: 'No open issues found in the repository.' };
      }

      console.log(issues);

      const summaries = await Promise.all(
        issues.slice(0, 5).map(async (issue) => {
          console.log(`Issue info:`, issue);
          const result = await this.genAI.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: `Summarize this in 50 words: ${issue.title}\n${issue.body}, suggest fixes and improvements for this issue.`,
            config: {
              systemInstruction: "You are an experienced software engineer with 10 years of experience. You are well versed in summarizing technical issues and providing concise summaries from Github repositories.",
            },
          });

          return { id: issue.number, summary: result.text };
        })
      );
      return summaries;
    } catch (error) {
      throw new Error(`Failed to summarize issues: ${error.message}`);
    }
  }
}