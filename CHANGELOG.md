# Changelog

All notable changes to Prompt Forge are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Feature descriptions coming in next release

### Fixed
- Bug fixes coming in next release

---

## [0.1.0] - 2026-05-03

### Added
- Initial desktop app release for Mac (arm64)
- Windows installer and portable executable
- Command Center UI with multi-session prompt generation
- SQLite persistence for all tasks and prompts
- Sidebar with task history and quick access
- Four output tabs: Prompts, Files, Plan, Checklist
- Prompt quality scoring system (A-D grades)
- Backend auto-detection (Anthropic, Ollama, script generation)
- Support for both "New Project" and "Existing Project" modes
- Project scanning for code context inclusion
- Task status tracking (pending, success, error)
- Error note saving for pattern learning
- Electron packaging with electron-builder for Mac/Windows
- Comprehensive documentation (README + INSTRUCTIONS)

### Technical
- React 18 frontend with Vite build tool
- Express.js REST API backend
- SQLite database with better-sqlite3
- Electron 41.5.0 for cross-platform desktop support
- ESM modules throughout codebase
- esbuild bundling for Electron main process
- Cross-platform installers (DMG for Mac, EXE for Windows)

---

## Format Notes

When adding entries, use these categories:

- **Added** — New features
- **Changed** — Changes to existing functionality
- **Deprecated** — Soon-to-be removed features
- **Removed** — Removed features
- **Fixed** — Bug fixes
- **Security** — Security-related changes
- **Technical** — Technical/infrastructure changes (optional)

Example entry:

```markdown
## [0.2.0] - 2026-05-10

### Added
- Dark mode support
- Export tasks to JSON
- Keyboard shortcuts help dialog

### Fixed
- Database lock errors on rapid task creation
- UI freezing when generating large prompts

### Changed
- Improved prompt generation speed by 40%
- Updated default system prompt

### Removed
- Deprecated API endpoint `/api/legacy/tasks`
```

---

## Release Process

See [RELEASE.md](RELEASE.md) for detailed release instructions.

Quick version bump:
1. Update version in `package.json`
2. Add entry to this file
3. Commit: `git commit -m "chore: bump version to X.X.X"`
4. Tag: `git tag -a vX.X.X -m "Release version X.X.X"`
5. Push: `git push origin main && git push origin vX.X.X`
6. Create GitHub Release with binaries

---

## Versioning

- **0.x.y** — Beta/pre-release versions
- **1.0.0+** — Stable releases
- **MAJOR** — Breaking changes, major features
- **MINOR** — New features, backward compatible
- **PATCH** — Bug fixes, no new features
