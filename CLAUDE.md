# CLAUDE.md — Workspace Rules

## Git Identity
- Author name: Vandit Patel
- Author email: vanditpatel067@gmail.com
- Always use this identity for all commits in this repo and all repos under vandit067

## Branch Naming
- Never use "claude", "Claude", or "anthropic" in branch names
- Use conventional prefixes: `feature/`, `fix/`, `docs/`, `refactor/`, `chore/`
- Example: `feature/orchestrator-dashboard-prototype`

## Commit Messages
- Never mention "Claude", "claude", "Anthropic", or "anthropic" in commit subject or body
- Do NOT include claude.ai session URLs in commit messages
- Follow conventional commits format: `type: short description`
- Types: feat, fix, docs, refactor, chore, test, style

## Screenshots
- After every work session, capture screenshots of any UI changes
- Save to `screenshots/` directory with numbered filenames: `NN-description.png`
- Commit screenshots in the same session as the code changes, before pushing
