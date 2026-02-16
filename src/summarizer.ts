import * as core from '@actions/core';
import OpenAI from 'openai';
import { formatSummaryPrompt } from './prompts';

export interface ItemSummary {
  problem_statement: string;
  scope: string;
  key_entities: string[];
  affected_files: string[];
}

export async function generateSummary(
  openai: OpenAI,
  title: string,
  body: string,
  files?: string[]
): Promise<ItemSummary> {
  try {
    const prompt = formatSummaryPrompt(title, body, files);

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that generates structured summaries in JSON format.'
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
    const summary = JSON.parse(content);

    // Validate required fields
    return {
      problem_statement: summary.problem_statement || 'No problem statement',
      scope: summary.scope || 'Unknown',
      key_entities: Array.isArray(summary.key_entities) ? summary.key_entities : [],
      affected_files: Array.isArray(summary.affected_files) ? summary.affected_files : []
    };
  } catch (error) {
    core.warning(`Failed to generate summary: ${error}`);
    // Return a basic summary
    return {
      problem_statement: title,
      scope: 'Unknown',
      key_entities: [],
      affected_files: files || []
    };
  }
}

export async function generateEmbedding(
  openai: OpenAI,
  text: string
): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text
    });

    return response.data[0].embedding;
  } catch (error) {
    core.error(`Failed to generate embedding: ${error}`);
    throw error;
  }
}

export function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

export function summarizeText(text: string): string {
  return text.substring(0, 500);
}
