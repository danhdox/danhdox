# AI Triage Action - Quick Start Guide

Get up and running with AI Triage Action in under 5 minutes!

## Prerequisites

- A GitHub repository
- An OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Step 1: Add Your OpenAI API Key

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `OPENAI_API_KEY`
5. Value: Your OpenAI API key
6. Click **Add secret**

## Step 2: Create the Workflow File

Create a new file in your repository at `.github/workflows/ai-triage.yml`:

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

## Step 3: Commit and Push

```bash
git add .github/workflows/ai-triage.yml
git commit -m "Add AI Triage Action"
git push
```

## Step 4: Test It!

The action will now run automatically when:
- A new issue is opened or edited
- A new pull request is opened or updated

### Test with a New Issue

1. Create a new issue in your repository
2. Wait about 30-60 seconds
3. Check for a comment from the action about duplicate detection

### Test with a New PR

1. Create a new pull request
2. Wait about 30-60 seconds
3. Check for an AI-generated review comment with:
   - Summary of changes
   - Risk assessment
   - Readiness score
   - Recommended labels

## What's Next?

### Enable Stateful Mode (Optional)

For persistent similarity search across all repository history:

1. Set up a PostgreSQL database with pgvector
2. Add `DATABASE_URL` to your repository secrets
3. Update your workflow:

```yaml
- uses: Andrewdddobusiness/Andrewdddobusiness@main
  with:
    openai_key: ${{ secrets.OPENAI_API_KEY }}
    github_token: ${{ secrets.GITHUB_TOKEN }}
    database_url: ${{ secrets.DATABASE_URL }}
```

### Customize Settings

```yaml
- uses: Andrewdddobusiness/Andrewdddobusiness@main
  with:
    openai_key: ${{ secrets.OPENAI_API_KEY }}
    github_token: ${{ secrets.GITHUB_TOKEN }}
    similarity_threshold: '0.90'  # Higher = stricter duplicate detection
    max_candidates: 30             # Check more items for duplicates
    enable_pr_review: 'true'       # Enable/disable PR reviews
    enable_dedupe: 'true'          # Enable/disable duplicate detection
```

### Customize Labels

```yaml
- uses: Andrewdddobusiness/Andrewdddobusiness@main
  with:
    openai_key: ${{ secrets.OPENAI_API_KEY }}
    label_duplicate: 'duplicate'
    label_needs_tests: 'missing-tests'
    label_high_risk: 'needs-review'
    label_ready: 'ready-to-merge'
```

## Troubleshooting

### Action doesn't run

- Check that the workflow file is in `.github/workflows/`
- Verify the workflow syntax is correct
- Check the Actions tab in your repository for errors

### Permission errors

Make sure your workflow has the required permissions:

```yaml
permissions:
  issues: write
  pull-requests: write
  contents: read
```

### OpenAI API errors

- Verify your API key is correct
- Check you have credits in your OpenAI account
- Ensure the secret name matches exactly: `OPENAI_API_KEY`

## Need Help?

- 📖 [Full Documentation](./AI_TRIAGE_README.md)
- 🐛 [Report Issues](https://github.com/Andrewdddobusiness/Andrewdddobusiness/issues)
- 💬 [Discussions](https://github.com/Andrewdddobusiness/Andrewdddobusiness/discussions)

---

Happy triaging! 🚀
