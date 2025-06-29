import { Injectable } from '@nestjs/common';
import { Octokit } from '@octokit/core';
import { GoogleGenAI } from '@google/genai';
import { ConfigService } from '@nestjs/config';
import { Tool, Context } from '@rekog/mcp-nest';
import { z } from 'zod';
import * as AdmZip from 'adm-zip';
import { writeFile, unlink, mkdir } from 'fs/promises';
import * as os from 'os';

@Injectable()
export class McpService {
  private octokit: Octokit;
  private genAI: GoogleGenAI;
  private tempRepoCode: Map<string, any> = new Map();

  constructor(private configService: ConfigService) {
    this.octokit = new Octokit({
      auth: this.configService.getOrThrow('GITHUB_TOKEN'),
    });
    this.genAI = new GoogleGenAI({
      apiKey: this.configService.getOrThrow('GEMINI_API_KEY'),
    });
  }

  @Tool({
    name: 'summarizeIssues',
    description: 'Summarizes a specific GitHub issue or PR.',
    parameters: z.object({
      url: z
        .string()
        .describe(
          'GitHub issue or PR URL (e.g., https://github.com/vercel/next.js/pull/80974)',
        ),
    }),
  })
  async summarizeIssues({ url }: { url: string }) {
    try {
      const urlParts = url.match(
        /github\.com\/([^\/]+)\/([^\/]+)\/(issues|pull)\/(\d+)/,
      );
      if (!urlParts) throw new Error('Invalid GitHub URL');
      const [, owner, repo, , issueNumber] = urlParts;
      const { data: issue } = await this.octokit.request(
        'GET /repos/{owner}/{repo}/issues/{issue_number}',
        {
          owner,
          repo,
          issue_number: parseInt(issueNumber),
        },
      );

      let summaryResponse;
      if (issue.pull_request) {
        const { data: pr } = await this.octokit.request(
          'GET /repos/{owner}/{repo}/pulls/{issue_number}',
          {
            owner,
            repo,
            issue_number: parseInt(issueNumber),
          },
        );
        summaryResponse = await this.genAI.models.generateContent({
          model: 'gemini-1.5-flash',
          config: {
            maxOutputTokens: 150,
            systemInstruction:
              'You are an experienced software engineer with 10 years of experience.',
          },
          contents: `Summarize this PR in 50 words: ${issue.title}\n${issue.body || 'No description'}\nWhat does it do? How was it fixed? Difficulty level?`,
        });

        console.log('PR summary response:', summaryResponse);
        return {
          id: issue.number,
          summary: summaryResponse.text,
          prDetails: true,
        };
      } else {
        const images =
          (issue.body || '').match(
            /\!\[.*?\]\((https:\/\/.*?\.(png|jpg|jpeg|gif))/g,
          ) || [];
        summaryResponse = await this.genAI.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: `Summarize this issue ${issue.title}\n${issue.body || 'No description'}\nSuggest a potential fix in simple words, include code if needed, reference a file from the repo code, estimate difficulty (Easy/Medium/Hard) and time (e.g., 2-4 hours). Keep the summary short, simple and concise.`,
          config: {
            systemInstruction:
              'You are an experienced software engineer with 10 years of experience.',
          },
        });
        return {
          id: issue.number,
          summary: summaryResponse.text,
          images: images.map((img) =>
            img.replace(/\[.*?\]\(/, '').replace(/\)/, ''),
          ),
        };
      }
    } catch (error) {
      throw new Error(`Failed to summarize issue: ${error.message}`);
    }
  }

  @Tool({
    name: 'fetchRepoCode',
    description: 'Fetches the entire repository code structure.',
    parameters: z.object({
      repo: z.string().describe('GitHub repository in the format owner/repo'),
    }),
  })
  async fetchRepoCode({ repo }: { repo: string }) {
    try {
      const [owner, repoName] = repo.split('/');
      console.log(`Fetching repo info for owner: ${owner}, repo: ${repoName}`);

      // Get the default branch
      const { data: repoInfo } = await this.octokit.request('GET /repos/{owner}/{repo}', { owner, repo: repoName });
      const defaultBranch = repoInfo.default_branch || 'main';

      const response = await this.octokit.request('GET /repos/{owner}/{repo}/zipball/{branch}', { owner, repo: repoName, branch: defaultBranch });
      const zipBuffer = Buffer.from(response.data as ArrayBuffer);

      const maxSize = 10 * 1024 * 1024;
      if (zipBuffer.length > maxSize) {
        throw new Error('Repository ZIP exceeds 10MB limit. Please use a smaller repo (e.g., lingo/dev or cal/com).');
      }

      const tempDir = os.tmpdir();
      await mkdir(tempDir, { recursive: true });
      const tempZipPath = `${tempDir}/${repoName}-${Date.now()}.zip`.replace(/\//g, '\\');
      await writeFile(tempZipPath, zipBuffer);

      const zip = new AdmZip(tempZipPath);
      const codeStructure = zip.getEntries()
        .filter(entry => !entry.isDirectory && !/\.(png|jpg|jpeg|gif|svg|ico|woff2?|ttf|otf|mp4|pdf)$/.test(entry.entryName))
        .map(entry => ({
          path: entry.entryName,
          content: entry.getData().toString('utf8'),
        }));

      this.tempRepoCode.set(repo, codeStructure);
      setTimeout(() => this.tempRepoCode.delete(repo), 3600000);
      await unlink(tempZipPath);
      return { repo, structure: codeStructure.map(item => item.path) };
    } catch (error) {
      console.error('Fetch repo code error:', error);
      throw new Error(`Failed to fetch repo code: ${error.message} - https://docs.github.com/rest/repos/contents#get-archive-link`);
    }
  }
}
