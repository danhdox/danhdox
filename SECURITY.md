# Security Summary - AI Triage Action

## Security Measures Implemented

### 1. API Key Protection
✅ **No Logging**: OpenAI API keys are never logged or exposed in error messages
✅ **GitHub Secrets**: API keys are stored securely in GitHub repository secrets
✅ **No Storage**: API keys are not stored in database or any persistent storage

### 2. Database Security
✅ **SSL Enforcement**: Database connections require SSL with proper certificate validation
✅ **No Credential Storage**: Database credentials are not stored in code, only passed via environment
✅ **Parameterized Queries**: All database queries use parameterized statements to prevent SQL injection
✅ **Minimal Permissions**: Action only requires read/write access to issues and PRs

### 3. GitHub API Security
✅ **Rate Limits**: Respects GitHub API rate limits via official SDK
✅ **Token Scoping**: Uses minimal required token permissions
✅ **Fork Safety**: Read-only mode for pull requests from forks
✅ **No Token Logging**: GitHub tokens are never logged

### 4. Data Privacy
✅ **No External Storage**: Private repository data never leaves GitHub Actions environment
✅ **Optional Database**: Database is optional and user-controlled
✅ **No Telemetry**: No usage tracking or telemetry data collection
✅ **No Third-Party Services**: Only communicates with GitHub API and user-provided OpenAI API

### 5. Action Permissions
✅ **Minimal Scope**: Only requests necessary permissions:
  - `issues: write` - For commenting and labeling issues
  - `pull-requests: write` - For commenting and labeling PRs
  - `contents: read` - For reading PR diffs
✅ **No Code Modification**: Never modifies repository code
✅ **No Auto-Merge**: Never automatically merges pull requests
✅ **No Auto-Close**: Never automatically closes issues or PRs

### 6. Input Validation
✅ **Type Safety**: TypeScript with strict mode enabled
✅ **Input Sanitization**: All user inputs validated before use
✅ **JSON Validation**: LLM outputs validated as proper JSON before parsing
✅ **Error Handling**: Comprehensive try-catch blocks with graceful degradation

### 7. Dependency Security
✅ **Minimal Dependencies**: Only essential, well-maintained packages
✅ **Official SDKs**: Uses official GitHub Actions and OpenAI SDKs
✅ **Type Definitions**: Full TypeScript type coverage
✅ **Bundled Distribution**: All dependencies bundled in single dist file

### 8. Code Security
✅ **No Eval**: No use of `eval()` or dynamic code execution
✅ **No Shell Injection**: No direct shell command execution
✅ **Proper Types**: Replaced all `any` types with proper Octokit types
✅ **SSL Certificate Validation**: Database connections validate SSL certificates (rejectUnauthorized: true)

## Security Best Practices for Users

### 1. API Key Management
- Store OpenAI API key in repository secrets (Settings → Secrets → Actions)
- Never commit API keys to repository
- Rotate API keys regularly
- Use separate API keys for different projects

### 2. Database Configuration (Optional)
- Use SSL-enabled PostgreSQL databases
- Never use production database for testing
- Ensure database has proper access controls
- Consider using read-only replicas if available

### 3. Workflow Permissions
- Use the minimal permissions shown in examples
- Don't grant unnecessary permissions
- Review workflow runs regularly
- Enable branch protection rules

### 4. Monitoring
- Review action logs regularly
- Monitor OpenAI API usage
- Check for unexpected behavior
- Report security issues promptly

## Reporting Security Issues

If you discover a security vulnerability, please:

1. **DO NOT** open a public issue
2. Email the maintainer privately
3. Include detailed reproduction steps
4. Allow time for fix before public disclosure

## Security Updates

- Security patches will be released as soon as possible
- Users will be notified via GitHub releases
- Update action reference to latest version regularly

## Known Limitations

1. **OpenAI API**: Sends PR/issue content to OpenAI for analysis
   - Only use with content you're comfortable sharing with OpenAI
   - Review OpenAI's privacy policy and terms of service

2. **Database Mode**: If using database mode, ensure database is properly secured
   - Use strong passwords
   - Enable SSL
   - Restrict network access
   - Regular backups

3. **Fork PRs**: Limited permissions for security
   - Cannot write to fork PRs from external contributors
   - This is a GitHub Actions security feature

## Compliance

✅ **MIT License**: Open source, transparent code
✅ **No Warranty**: Provided as-is per MIT license
✅ **Community Auditable**: All code publicly available
✅ **Security-First Design**: Following GitHub Actions security best practices

---

Last Updated: 2026-02-16
