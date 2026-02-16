import * as core from '@actions/core';
import OpenAI from 'openai';
import { GitHubClient, Issue, PullRequest } from './github';
import { generateSummary, generateEmbedding, calculateCosineSimilarity } from './summarizer';
import { formatDuplicatePrompt } from './prompts';
import { getDatabase, storeSimilarityItem, findSimilarItems, SimilarityItem } from './db';

export interface DuplicateResult {
  classification: 'duplicate' | 'related' | 'distinct';
  confidence: number;
  canonical_item: number | null;
  reasoning: string;
}

export async function detectDuplicates(
  openai: OpenAI,
  client: GitHubClient,
  itemNumber: number,
  itemTitle: string,
  itemBody: string,
  itemType: 'issue' | 'pr',
  files: string[],
  maxCandidates: number,
  similarityThreshold: number,
  databaseUrl?: string
): Promise<DuplicateResult | null> {
  try {
    // Generate summary for current item
    const currentSummary = await generateSummary(openai, itemTitle, itemBody, files);
    const summaryText = `${itemTitle} ${currentSummary.problem_statement}`;

    // Generate embedding
    const currentEmbedding = await generateEmbedding(openai, summaryText);

    let candidates: Array<{ number: number; title: string; summary: string; similarity: number }> = [];

    // Check if database mode is enabled
    if (databaseUrl) {
      core.info('Using stateful mode (database)');
      const db = getDatabase(databaseUrl);
      
      // Store current item
      await storeSimilarityItem(db, {
        repo: `${client.context.repo.owner}/${client.context.repo.repo}`,
        github_id: itemNumber.toString(),
        type: itemType,
        title: itemTitle,
        summary: currentSummary.problem_statement,
        embedding: currentEmbedding,
        closed: false
      });

      // Find similar items
      const similarItems = await findSimilarItems(
        db,
        currentEmbedding,
        `${client.context.repo.owner}/${client.context.repo.repo}`,
        itemType,
        maxCandidates
      );

      candidates = similarItems
        .filter(item => item.github_id !== itemNumber.toString())
        .map(item => ({
          number: parseInt(item.github_id),
          title: item.title,
          summary: item.summary,
          similarity: item.similarity || 0
        }));
    } else {
      core.info('Using stateless mode (GitHub API)');
      
      // Fetch recent items from GitHub
      let items: Array<{ number: number; title: string; body: string | null }> = [];
      
      if (itemType === 'issue') {
        const { getRecentIssues } = await import('./github');
        items = await getRecentIssues(client, maxCandidates);
      } else {
        const { getRecentPullRequests } = await import('./github');
        items = await getRecentPullRequests(client, maxCandidates);
      }

      // Filter out current item and generate embeddings
      for (const item of items) {
        if (item.number === itemNumber) continue;

        const candidateSummary = await generateSummary(
          openai,
          item.title,
          item.body || '',
          []
        );
        const candidateText = `${item.title} ${candidateSummary.problem_statement}`;
        const candidateEmbedding = await generateEmbedding(openai, candidateText);

        const similarity = calculateCosineSimilarity(currentEmbedding, candidateEmbedding);

        if (similarity >= similarityThreshold) {
          candidates.push({
            number: item.number,
            title: item.title,
            summary: candidateSummary.problem_statement,
            similarity
          });
        }
      }
    }

    // Sort by similarity
    candidates.sort((a, b) => b.similarity - a.similarity);

    // If no candidates above threshold, return null
    if (candidates.length === 0) {
      core.info('No similar items found above threshold');
      return null;
    }

    // Use LLM to determine if it's a duplicate
    const topCandidate = candidates[0];
    const result = await classifyDuplicate(
      openai,
      itemTitle,
      currentSummary.problem_statement,
      topCandidate.number,
      topCandidate.title,
      topCandidate.summary
    );

    return result;
  } catch (error) {
    core.error(`Failed to detect duplicates: ${error}`);
    return null;
  }
}

async function classifyDuplicate(
  openai: OpenAI,
  currentTitle: string,
  currentSummary: string,
  candidateNumber: number,
  candidateTitle: string,
  candidateSummary: string
): Promise<DuplicateResult> {
  try {
    const prompt = formatDuplicatePrompt(
      currentTitle,
      currentSummary,
      candidateNumber,
      candidateTitle,
      candidateSummary
    );

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that identifies duplicate issues and pull requests.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content || '{}';
    const result = JSON.parse(content);

    // Validate and return
    return {
      classification: result.classification || 'distinct',
      confidence: result.confidence || 0,
      canonical_item: result.canonical_item || null,
      reasoning: result.reasoning || 'No reasoning provided'
    };
  } catch (error) {
    core.warning(`Failed to classify duplicate: ${error}`);
    return {
      classification: 'distinct',
      confidence: 0,
      canonical_item: null,
      reasoning: 'Classification failed'
    };
  }
}
