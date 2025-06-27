import { Injectable } from '@nestjs/common';
import { Octokit } from '@octokit/core';
import OpenAI from 'openai';

@Injectable()
export class McpService {
  private octokit: Octokit;
  private openai: OpenAI;

  constructor() {
    this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async summarizeIssues(repo: string) {
    try {
      const [owner, repoName] = repo.split('/');
      const { data: issues } = await this.octokit.request('GET /repos/{owner}/{repo}/issues', {
        owner,
        repo: repoName,
      });
      const summaries = await Promise.all(
        issues.map(async (issue) => {
          const response = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              {
                role: 'user',
                content: `Summarize this in 50 words: ${issue.title}\n${issue.body}`,
              },
            ],
          });
          return { id: issue.number, summary: response.choices[0].message.content };
        }),
      );
      return summaries;
    } catch (error) {
      throw new Error(`Failed to summarize issues: ${error.message}`);
    }
  }
}