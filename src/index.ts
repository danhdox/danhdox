import * as core from '@actions/core';
import * as github from '@actions/github';
import OpenAI from 'openai';
import { createGitHubClient, getPullRequestFiles, createComment, addLabels } from './github';
import { detectDuplicates } from './dedupe';
import { reviewPullRequest, formatReviewComment } from './review';
import { calculateScore, detectHighRiskModules, detectTests } from './scoring';
import { getDatabase, initializeDatabase } from './db';

async function run(): Promise<void> {
  try {
    // Get inputs
    const openaiKey = core.getInput('openai_key', { required: true });
    const githubToken = core.getInput('github_token', { required: true });
    const databaseUrl = core.getInput('database_url') || undefined;
    const similarityThreshold = parseFloat(core.getInput('similarity_threshold') || '0.85');
    const maxCandidates = parseInt(core.getInput('max_candidates') || '20');
    const enablePrReview = core.getInput('enable_pr_review') === 'true';
    const enableDedupe = core.getInput('enable_dedupe') === 'true';

    // Label configuration
    const labelDuplicate = core.getInput('label_duplicate') || 'possible-duplicate';
    const labelNeedsTests = core.getInput('label_needs_tests') || 'needs-tests';
    const labelHighRisk = core.getInput('label_high_risk') || 'high-risk';
    const labelReady = core.getInput('label_ready') || 'ready-for-review';

    // Initialize clients
    const openai = new OpenAI({ apiKey: openaiKey });
    const client = createGitHubClient(githubToken);

    // Initialize database if URL provided
    if (databaseUrl) {
      const db = getDatabase(databaseUrl);
      await initializeDatabase(db);
    }

    // Get event context
    const { eventName, payload } = github.context;
    core.info(`Event: ${eventName}`);

    // Handle issue events
    if (eventName === 'issues' && enableDedupe) {
      const issue = payload.issue;
      if (!issue) {
        core.warning('No issue found in payload');
        return;
      }

      const action = payload.action;
      if (action !== 'opened' && action !== 'edited') {
        core.info(`Skipping action: ${action}`);
        return;
      }

      core.info(`Processing issue #${issue.number}: ${issue.title}`);

      // Detect duplicates
      const duplicateResult = await detectDuplicates(
        openai,
        client,
        issue.number,
        issue.title,
        issue.body || '',
        'issue',
        [],
        maxCandidates,
        similarityThreshold,
        databaseUrl
      );

      if (duplicateResult && duplicateResult.classification === 'duplicate') {
        const comment = `🔍 **Possible Duplicate Detected**\n\nThis issue appears to be similar to #${duplicateResult.canonical_item}.\n\n**Confidence:** ${(duplicateResult.confidence * 100).toFixed(0)}%\n**Reasoning:** ${duplicateResult.reasoning}\n\nPlease review to confirm if this is a duplicate.`;
        
        await createComment(client, issue.number, comment);
        await addLabels(client, issue.number, [labelDuplicate]);
        
        core.info(`Marked issue #${issue.number} as possible duplicate of #${duplicateResult.canonical_item}`);
      } else if (duplicateResult && duplicateResult.classification === 'related') {
        const comment = `🔗 **Related Issue Found**\n\nThis issue may be related to #${duplicateResult.canonical_item}.\n\n**Reasoning:** ${duplicateResult.reasoning}`;
        await createComment(client, issue.number, comment);
      } else {
        core.info('No duplicates detected');
      }
    }

    // Handle pull request events
    if ((eventName === 'pull_request' || eventName === 'pull_request_target')) {
      const pr = payload.pull_request;
      if (!pr) {
        core.warning('No pull request found in payload');
        return;
      }

      const action = payload.action;
      if (action !== 'opened' && action !== 'synchronize') {
        core.info(`Skipping action: ${action}`);
        return;
      }

      core.info(`Processing PR #${pr.number}: ${pr.title}`);

      // Get PR files
      const files = await getPullRequestFiles(client, pr.number);
      const fileNames = files.map(f => f.filename);

      const labelsToApply: string[] = [];

      // Duplicate detection for PRs
      if (enableDedupe) {
        const duplicateResult = await detectDuplicates(
          openai,
          client,
          pr.number,
          pr.title,
          pr.body || '',
          'pr',
          fileNames,
          maxCandidates,
          similarityThreshold,
          databaseUrl
        );

        if (duplicateResult && duplicateResult.classification === 'duplicate') {
          const comment = `🔍 **Possible Duplicate PR Detected**\n\nThis pull request appears to be similar to #${duplicateResult.canonical_item}.\n\n**Confidence:** ${(duplicateResult.confidence * 100).toFixed(0)}%\n**Reasoning:** ${duplicateResult.reasoning}\n\nPlease review to confirm if this is a duplicate.`;
          
          await createComment(client, pr.number, comment);
          labelsToApply.push(labelDuplicate);
        }
      }

      // PR Review
      if (enablePrReview) {
        const reviewResult = await reviewPullRequest(
          openai,
          client,
          pr.number,
          pr.title,
          pr.body || '',
          pr.additions || 0,
          pr.deletions || 0,
          pr.changed_files || 0,
          files
        );

        // Calculate score
        const hasTests = detectTests(fileNames);
        const highRiskModules = detectHighRiskModules(fileNames);
        const diffSize = (pr.additions || 0) + (pr.deletions || 0);

        const score = calculateScore(
          {
            testsAdded: hasTests,
            diffSize,
            descriptionLength: (pr.body || '').length,
            highRiskModules,
            hasTests
          },
          reviewResult
        );

        // Determine labels based on review
        if (reviewResult.missing_elements.includes('tests')) {
          labelsToApply.push(labelNeedsTests);
        }

        if (reviewResult.risk_level === 'high') {
          labelsToApply.push(labelHighRisk);
        }

        if (score >= 80) {
          labelsToApply.push(labelReady);
        }

        // Post review comment
        const reviewComment = formatReviewComment(reviewResult);
        await createComment(client, pr.number, reviewComment);
      }

      // Apply labels
      if (labelsToApply.length > 0) {
        await addLabels(client, pr.number, labelsToApply);
      }
    }

    core.info('AI Triage Action completed successfully');
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unexpected error occurred');
    }
  }
}

run();
