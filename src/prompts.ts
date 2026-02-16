// Prompt templates for AI Triage Action

export const SUMMARY_PROMPT = `You are an expert at analyzing GitHub issues and pull requests.

Given the following content, generate a structured summary in strict JSON format:

{
  "problem_statement": "Brief description of the problem or change",
  "scope": "Scope of the change (e.g., backend, frontend, database)",
  "key_entities": ["list", "of", "relevant", "entities"],
  "affected_files": ["list", "of", "affected", "file", "paths"]
}

Content:
Title: {title}
Body: {body}
{files}

Respond ONLY with valid JSON. No markdown, no explanation.`;

export const DUPLICATE_DETECTION_PROMPT = `You are an expert at identifying duplicate issues and pull requests.

Compare the current item with the candidate item and determine if they are duplicates.

Current Item:
Title: {current_title}
Summary: {current_summary}

Candidate Item #{candidate_number}:
Title: {candidate_title}
Summary: {candidate_summary}

Respond in strict JSON format:
{
  "classification": "duplicate | related | distinct",
  "confidence": 0.0-1.0,
  "canonical_item": "number or null",
  "reasoning": "brief explanation"
}

Classification guidelines:
- "duplicate": Essentially the same issue/PR
- "related": Similar topic but different scope
- "distinct": Completely different

Respond ONLY with valid JSON. No markdown, no explanation.`;

export const PR_REVIEW_PROMPT = `You are an expert code reviewer analyzing a pull request.

PR Details:
Title: {title}
Description: {description}
Changed Files: {file_count}
Additions: {additions}
Deletions: {deletions}

Diff Summary:
{diff_summary}

Analyze this PR and respond in strict JSON format:
{
  "summary": "What the PR does in 1-2 sentences",
  "risk_level": "low | medium | high",
  "missing_elements": ["tests", "docs", "benchmarks"],
  "design_alignment": "aligned | partially_aligned | misaligned",
  "readiness_score": 0-100
}

Risk Level Guidelines:
- low: Minor changes, well-tested, no breaking changes
- medium: Moderate changes, some testing, potential side effects
- high: Major changes, missing tests, breaking changes, or core system modifications

Missing Elements should include any of: tests, docs, benchmarks, migration scripts, security review

Readiness Score (0-100):
- 80-100: Ready for review
- 60-79: Needs minor improvements
- 40-59: Needs moderate work
- 0-39: Needs major work

Respond ONLY with valid JSON. No markdown, no explanation.`;

export const formatSummaryPrompt = (
  title: string,
  body: string,
  files?: string[]
): string => {
  let filesSection = '';
  if (files && files.length > 0) {
    filesSection = `\nAffected Files:\n${files.join('\n')}`;
  }
  
  return SUMMARY_PROMPT
    .replace('{title}', title)
    .replace('{body}', body || 'No description provided')
    .replace('{files}', filesSection);
};

export const formatDuplicatePrompt = (
  currentTitle: string,
  currentSummary: string,
  candidateNumber: number,
  candidateTitle: string,
  candidateSummary: string
): string => {
  return DUPLICATE_DETECTION_PROMPT
    .replace('{current_title}', currentTitle)
    .replace('{current_summary}', currentSummary)
    .replace('{candidate_number}', candidateNumber.toString())
    .replace('{candidate_title}', candidateTitle)
    .replace('{candidate_summary}', candidateSummary);
};

export const formatReviewPrompt = (
  title: string,
  description: string,
  fileCount: number,
  additions: number,
  deletions: number,
  diffSummary: string
): string => {
  return PR_REVIEW_PROMPT
    .replace('{title}', title)
    .replace('{description}', description || 'No description provided')
    .replace('{file_count}', fileCount.toString())
    .replace('{additions}', additions.toString())
    .replace('{deletions}', deletions.toString())
    .replace('{diff_summary}', diffSummary);
};
