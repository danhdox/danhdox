import * as core from '@actions/core';
import { Pool, PoolClient } from 'pg';

export interface SimilarityItem {
  repo: string;
  github_id: string;
  type: 'issue' | 'pr';
  title: string;
  summary: string;
  embedding: number[];
  closed: boolean;
  similarity?: number;
}

let pool: Pool | null = null;

export function getDatabase(databaseUrl: string): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
    });
  }
  return pool;
}

export async function initializeDatabase(db: Pool): Promise<void> {
  const client = await db.connect();
  try {
    // Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');

    // Create table
    await client.query(`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        repo TEXT NOT NULL,
        github_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        embedding vector(1536),
        created_at TIMESTAMP DEFAULT NOW(),
        closed BOOLEAN DEFAULT FALSE,
        UNIQUE(repo, github_id, type)
      )
    `);

    // Create index for similarity search
    await client.query(`
      CREATE INDEX IF NOT EXISTS items_embedding_idx 
      ON items 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);

    core.info('Database initialized successfully');
  } catch (error) {
    core.warning(`Failed to initialize database: ${error}`);
  } finally {
    client.release();
  }
}

export async function storeSimilarityItem(
  db: Pool,
  item: SimilarityItem
): Promise<void> {
  try {
    // Convert embedding to pgvector format
    const embeddingStr = `[${item.embedding.join(',')}]`;

    await db.query(
      `
      INSERT INTO items (repo, github_id, type, title, summary, embedding, closed)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (repo, github_id, type) 
      DO UPDATE SET
        title = EXCLUDED.title,
        summary = EXCLUDED.summary,
        embedding = EXCLUDED.embedding,
        closed = EXCLUDED.closed
      `,
      [item.repo, item.github_id, item.type, item.title, item.summary, embeddingStr, item.closed]
    );

    core.info(`Stored item ${item.type} #${item.github_id} in database`);
  } catch (error) {
    core.warning(`Failed to store similarity item: ${error}`);
  }
}

export async function findSimilarItems(
  db: Pool,
  embedding: number[],
  repo: string,
  type: 'issue' | 'pr',
  limit: number
): Promise<SimilarityItem[]> {
  try {
    const embeddingStr = `[${embedding.join(',')}]`;

    const result = await db.query(
      `
      SELECT 
        repo,
        github_id,
        type,
        title,
        summary,
        embedding,
        closed,
        1 - (embedding <=> $1::vector) as similarity
      FROM items
      WHERE repo = $2 AND type = $3 AND closed = FALSE
      ORDER BY embedding <=> $1::vector
      LIMIT $4
      `,
      [embeddingStr, repo, type, limit]
    );

    return result.rows.map(row => ({
      repo: row.repo,
      github_id: row.github_id,
      type: row.type,
      title: row.title,
      summary: row.summary,
      embedding: parseEmbedding(row.embedding),
      closed: row.closed,
      similarity: row.similarity
    }));
  } catch (error) {
    core.warning(`Failed to find similar items: ${error}`);
    return [];
  }
}

function parseEmbedding(embeddingStr: string): number[] {
  // pgvector returns embeddings as strings like "[1,2,3]"
  if (typeof embeddingStr === 'string') {
    return JSON.parse(embeddingStr);
  }
  return embeddingStr;
}

export async function closeDatabase(db: Pool): Promise<void> {
  if (db) {
    await db.end();
    pool = null;
    core.info('Database connection closed');
  }
}
