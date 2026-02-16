import * as core from '@actions/core';
import * as github from '@actions/github';
import { Octokit } from '@octokit/rest';

export interface GitHubClient {
  octokit: Octokit;
  context: typeof github.context;
}

export interface Issue {
  number: number;
  title: string;
  body: string | null;
  state: string;
  created_at: string;
  html_url: string;
}

export interface PullRequest {
  number: number;
  title: string;
  body: string | null;
  state: string;
  created_at: string;
  html_url: string;
  additions: number;
  deletions: number;
  changed_files: number;
}

export interface PRFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export function createGitHubClient(token: string): GitHubClient {
  const octokit = github.getOctokit(token);
  return {
    octokit: octokit.rest as unknown as Octokit,
    context: github.context
  };
}

export async function searchIssues(
  client: GitHubClient,
  query: string,
  maxResults: number
): Promise<Issue[]> {
  try {
    const { owner, repo } = client.context.repo;
    const response = await client.octokit.search.issuesAndPullRequests({
      q: `repo:${owner}/${repo} is:issue ${query}`,
      per_page: maxResults,
      sort: 'created',
      order: 'desc'
    });

    return response.data.items.map(item => ({
      number: item.number,
      title: item.title,
      body: item.body || null,
      state: item.state,
      created_at: item.created_at,
      html_url: item.html_url
    }));
  } catch (error) {
    core.warning(`Failed to search issues: ${error}`);
    return [];
  }
}

export async function searchPullRequests(
  client: GitHubClient,
  query: string,
  maxResults: number
): Promise<PullRequest[]> {
  try {
    const { owner, repo } = client.context.repo;
    const response = await client.octokit.search.issuesAndPullRequests({
      q: `repo:${owner}/${repo} is:pr ${query}`,
      per_page: maxResults,
      sort: 'created',
      order: 'desc'
    });

    const prs: PullRequest[] = [];
    for (const item of response.data.items) {
      // Get full PR details
      const prResponse = await client.octokit.pulls.get({
        owner,
        repo,
        pull_number: item.number
      });

      prs.push({
        number: item.number,
        title: item.title,
        body: item.body || null,
        state: item.state,
        created_at: item.created_at,
        html_url: item.html_url,
        additions: prResponse.data.additions,
        deletions: prResponse.data.deletions,
        changed_files: prResponse.data.changed_files
      });
    }

    return prs;
  } catch (error) {
    core.warning(`Failed to search pull requests: ${error}`);
    return [];
  }
}

export async function getPullRequestFiles(
  client: GitHubClient,
  prNumber: number
): Promise<PRFile[]> {
  try {
    const { owner, repo } = client.context.repo;
    const response = await client.octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100
    });

    return response.data.map(file => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: file.patch
    }));
  } catch (error) {
    core.warning(`Failed to get PR files: ${error}`);
    return [];
  }
}

export async function createComment(
  client: GitHubClient,
  issueNumber: number,
  body: string
): Promise<void> {
  try {
    const { owner, repo } = client.context.repo;
    await client.octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body
    });
    core.info(`Comment posted to #${issueNumber}`);
  } catch (error) {
    core.error(`Failed to create comment: ${error}`);
    throw error;
  }
}

export async function addLabels(
  client: GitHubClient,
  issueNumber: number,
  labels: string[]
): Promise<void> {
  if (labels.length === 0) return;

  try {
    const { owner, repo } = client.context.repo;
    
    // First, create labels if they don't exist
    for (const label of labels) {
      try {
        await client.octokit.issues.getLabel({
          owner,
          repo,
          name: label
        });
      } catch (error) {
        // Label doesn't exist, create it
        try {
          await client.octokit.issues.createLabel({
            owner,
            repo,
            name: label,
            color: getDefaultLabelColor(label)
          });
          core.info(`Created label: ${label}`);
        } catch (createError) {
          core.warning(`Failed to create label ${label}: ${createError}`);
        }
      }
    }

    // Add labels to the issue
    await client.octokit.issues.addLabels({
      owner,
      repo,
      issue_number: issueNumber,
      labels
    });
    core.info(`Labels added to #${issueNumber}: ${labels.join(', ')}`);
  } catch (error) {
    core.warning(`Failed to add labels: ${error}`);
  }
}

function getDefaultLabelColor(labelName: string): string {
  const colors: Record<string, string> = {
    'possible-duplicate': 'FBCA04',
    'needs-tests': 'D93F0B',
    'high-risk': 'B60205',
    'ready-for-review': '0E8A16'
  };
  return colors[labelName] || '0052CC';
}

export async function getRecentIssues(
  client: GitHubClient,
  maxResults: number
): Promise<Issue[]> {
  try {
    const { owner, repo } = client.context.repo;
    const response = await client.octokit.issues.listForRepo({
      owner,
      repo,
      state: 'all',
      per_page: maxResults,
      sort: 'created',
      direction: 'desc'
    });

    return response.data
      .filter(item => !item.pull_request) // Filter out PRs
      .map(item => ({
        number: item.number,
        title: item.title,
        body: item.body || null,
        state: item.state,
        created_at: item.created_at,
        html_url: item.html_url
      }));
  } catch (error) {
    core.warning(`Failed to get recent issues: ${error}`);
    return [];
  }
}

export async function getRecentPullRequests(
  client: GitHubClient,
  maxResults: number
): Promise<PullRequest[]> {
  try {
    const { owner, repo } = client.context.repo;
    const response = await client.octokit.pulls.list({
      owner,
      repo,
      state: 'all',
      per_page: maxResults,
      sort: 'created',
      direction: 'desc'
    });

    return response.data.map(pr => ({
      number: pr.number,
      title: pr.title,
      body: pr.body || null,
      state: pr.state,
      created_at: pr.created_at,
      html_url: pr.html_url,
      additions: pr.additions || 0,
      deletions: pr.deletions || 0,
      changed_files: pr.changed_files || 0
    }));
  } catch (error) {
    core.warning(`Failed to get recent pull requests: ${error}`);
    return [];
  }
}
