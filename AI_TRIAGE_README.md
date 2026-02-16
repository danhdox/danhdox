# AI Triage Action

An intelligent GitHub Action that automatically triages issues and pull requests using AI. It detects duplicates, provides structured PR reviews, and applies smart labels to help maintain your repository.

## 🌟 Features

- **Duplicate Detection**: Automatically identifies duplicate issues and PRs using semantic similarity
- **Structured PR Reviews**: Generates comprehensive reviews with risk assessment and readiness scores
- **Intelligent Labeling**: Auto-applies labels based on PR characteristics
- **Flexible Modes**: 
  - **Stateless Mode**: Works out-of-the-box using GitHub API
  - **Stateful Mode**: Optional PostgreSQL + pgvector for persistent similarity search
- **Configurable**: Customize labels, thresholds, and feature toggles

## 📋 Requirements

- GitHub repository
- OpenAI API key (for GPT-3.5-turbo and embeddings)
- Optional: PostgreSQL database with pgvector extension (for stateful mode)

## 🚀 Quick Start

### Basic Setup (Stateless Mode)

1. **Create a workflow file** at `.github/workflows/ai-triage.yml`:

```yaml
name: AI Triage

on:
  issues:
    types: [opened, edited]
  pull_request:
    types: [opened, synchronize]

jobs:
  triage:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      pull-requests: write
      contents: read
    
    steps:
      - uses: Andrewdddobusiness/Andrewdddobusiness@main
        with:
          openai_key: ${{ secrets.OPENAI_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

2. **Add your OpenAI API key** to repository secrets:
   - Go to Settings → Secrets and variables → Actions
   - Create new secret: `OPENAI_API_KEY`

3. **That's it!** The action will now automatically triage new issues and PRs.

### Advanced Setup (Stateful Mode)

For persistent similarity search across your entire repository history:

```yaml
name: AI Triage

on:
  issues:
    types: [opened, edited]
  pull_request:
    types: [opened, synchronize]

jobs:
  triage:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      pull-requests: write
      contents: read
    
    steps:
      - uses: Andrewdddobusiness/Andrewdddobusiness@main
        with:
          openai_key: ${{ secrets.OPENAI_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          database_url: ${{ secrets.DATABASE_URL }}
          similarity_threshold: '0.85'
          max_candidates: 20
```

## ⚙️ Configuration

### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `openai_key` | Yes | - | OpenAI API key for LLM operations |
| `github_token` | No | `${{ github.token }}` | GitHub token for API access |
| `database_url` | No | - | PostgreSQL connection URL (enables stateful mode) |
| `similarity_threshold` | No | `0.85` | Similarity threshold for duplicate detection (0.0-1.0) |
| `max_candidates` | No | `20` | Maximum number of candidates to check |
| `enable_pr_review` | No | `true` | Enable structured PR review functionality |
| `enable_dedupe` | No | `true` | Enable duplicate detection |
| `label_duplicate` | No | `possible-duplicate` | Label for possible duplicates |
| `label_needs_tests` | No | `needs-tests` | Label when tests are missing |
| `label_high_risk` | No | `high-risk` | Label for high-risk changes |
| `label_ready` | No | `ready-for-review` | Label when PR is ready |

### Custom Label Example

```yaml
- uses: Andrewdddobusiness/Andrewdddobusiness@main
  with:
    openai_key: ${{ secrets.OPENAI_API_KEY }}
    label_duplicate: 'duplicate'
    label_needs_tests: 'missing-tests'
    label_high_risk: 'needs-careful-review'
    label_ready: 'approved-by-ai'
```

## 🔍 How It Works

### Duplicate Detection

1. Generates a structured summary of the issue/PR
2. Creates an embedding vector for semantic similarity
3. Compares against recent items (stateless) or database (stateful)
4. Uses LLM to classify as duplicate/related/distinct
5. Posts comment and applies label if duplicate found

### PR Review

1. Analyzes changed files and diff
2. Evaluates risk level, missing elements, and design alignment
3. Calculates readiness score (0-100) based on:
   - Code changes size
   - Test coverage
   - Documentation
   - Description quality
4. Posts structured review comment
5. Applies relevant labels

### Scoring Formula

Base scoring factors:
- ✅ +20 if CI passing
- ✅ +15 if tests added
- ✅ +10 if diff < 300 lines
- ✅ +10 if description > 300 chars
- ❌ -15 if high-risk modules touched
- ❌ -20 if no tests
- ❌ -10 if diff > 1000 lines
- 🤖 ±15 LLM adjustment

## 📊 Example Outputs

### Duplicate Detection Comment

```markdown
🔍 **Possible Duplicate Detected**

This issue appears to be similar to #123.

**Confidence:** 92%
**Reasoning:** Both issues describe the same authentication bug with similar error messages.

Please review to confirm if this is a duplicate.
```

### PR Review Comment

```markdown
## 🤖 AI Triage Review

### Summary
Implements user authentication using OAuth2 with proper error handling and session management.

### Analysis
**Risk Level:** ⚠️ MEDIUM
**Design Alignment:** aligned
**Readiness Score:** 75/100

### Missing Elements
- tests
- docs

### Recommended Labels
- `needs-tests`

---
*This review was automatically generated by AI Triage Action*
```

## 🗄️ Database Setup (Optional)

For stateful mode with persistent similarity search:

### PostgreSQL with pgvector

1. **Install pgvector extension**:
```sql
CREATE EXTENSION vector;
```

2. **Set connection URL** in GitHub Secrets:
```
DATABASE_URL=postgresql://user:password@host:5432/database
```

The action will automatically create the required table and indexes.

### Database Schema

```sql
CREATE TABLE items (
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
);

CREATE INDEX items_embedding_idx 
ON items 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## 🔒 Security

- API keys are never logged or exposed
- Respects GitHub rate limits
- Does not process private data outside the workflow
- Never auto-closes or auto-merges PRs
- Read-only mode for fork PRs

## 🛠️ Development

### Project Structure

```
ai-triage-action/
├── action.yml           # Action metadata
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── src/
│   ├── index.ts        # Main entry point
│   ├── github.ts       # GitHub API integration
│   ├── dedupe.ts       # Duplicate detection
│   ├── review.ts       # PR review logic
│   ├── scoring.ts      # Scoring calculations
│   ├── summarizer.ts   # Summary generation
│   ├── db.ts          # Database operations
│   └── prompts.ts      # LLM prompts
└── README.md
```

### Building

```bash
npm install
npm run build
npm run package
```

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📮 Support

- [Create an issue](https://github.com/Andrewdddobusiness/Andrewdddobusiness/issues)
- [Discussions](https://github.com/Andrewdddobusiness/Andrewdddobusiness/discussions)

## 🙏 Acknowledgments

Built with:
- OpenAI GPT-3.5 & Embeddings
- GitHub Actions
- PostgreSQL + pgvector
- TypeScript

---

Made with ❤️ by [Andrew](https://github.com/Andrewdddobusiness)
