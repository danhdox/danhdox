# Contributing to AI Triage Action

Thank you for your interest in contributing! This document provides guidelines for contributing to the AI Triage Action.

## Development Setup

1. **Clone the repository**:
```bash
git clone https://github.com/Andrewdddobusiness/Andrewdddobusiness.git
cd Andrewdddobusiness
```

2. **Install dependencies**:
```bash
npm install
```

3. **Build the project**:
```bash
npm run build
```

4. **Package for distribution**:
```bash
npx @vercel/ncc build lib/index.js -o dist
```

## Project Structure

```
ai-triage-action/
├── src/              # TypeScript source files
│   ├── index.ts      # Main entry point
│   ├── github.ts     # GitHub API integration
│   ├── dedupe.ts     # Duplicate detection logic
│   ├── review.ts     # PR review functionality
│   ├── scoring.ts    # Scoring calculations
│   ├── summarizer.ts # Summary generation
│   ├── db.ts        # Database operations
│   └── prompts.ts    # LLM prompt templates
├── lib/              # Compiled JavaScript (gitignored)
├── dist/             # Packaged action (committed)
├── action.yml        # Action metadata
├── package.json      # Dependencies
└── tsconfig.json     # TypeScript config
```

## Making Changes

1. **Create a branch**:
```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes** in the `src/` directory

3. **Build and test**:
```bash
npm run build
npx @vercel/ncc build lib/index.js -o dist
```

4. **Commit your changes**:
```bash
git add .
git commit -m "Description of your changes"
```

5. **Push and create a PR**:
```bash
git push origin feature/your-feature-name
```

## Code Style

- Use TypeScript for all new code
- Follow existing code style and patterns
- Add JSDoc comments for public functions
- Keep functions focused and modular

## Testing

Before submitting a PR:

1. Ensure the code builds without errors: `npm run build`
2. Package the action: `npx @vercel/ncc build lib/index.js -o dist`
3. Test the action in a real repository if possible
4. Ensure all TypeScript types are properly defined

## Pull Request Guidelines

- Provide a clear description of the changes
- Reference any related issues
- Include examples if applicable
- Ensure all checks pass
- Keep PRs focused on a single feature/fix

## Questions?

Feel free to open an issue or discussion if you have questions!
