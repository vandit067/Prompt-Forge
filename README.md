# Prompt Forge

A desktop application that transforms engineering requests into structured, executable prompts for Claude Code and AI coding agents.

## Features

- 🎯 **Intelligent Task Classification** — Automatically categorizes requests (bug fixes, features, refactoring, etc.)
- 📝 **Multi-Session Prompts** — Generate multiple perspectives on the same task
- 💾 **SQLite Persistence** — All tasks and prompts saved locally
- 🔄 **Live Backend Detection** — Works with Anthropic API, Ollama, or script generation
- 📊 **Quality Scoring** — Evaluates prompt quality across 8+ dimensions
- 🖥️ **Native Desktop App** — Available for Mac and Windows

## Quick Start

### Mac
1. Download `Prompt Forge-0.1.0-arm64.dmg`
2. Open the `.dmg` file
3. Drag **Prompt Forge** to Applications
4. Launch and enjoy (right-click → Open on first run)

### Windows
**Installer:** Download and run `Prompt Forge Setup 0.1.0.exe`  
**Portable:** Download and run `Prompt Forge 0.1.0.exe` (no installation needed)

## Development

### Requirements
- Node.js 20+
- npm 10+

### Setup
```bash
npm install
npm run electron:rebuild
```

### Run in Dev Mode
```bash
npm run electron:dev
```

Launches:
- Vite on `localhost:5174` (auto-detects available port)
- Express API on `localhost:3001`
- Electron with hot reload

### Build Production
```bash
npm run electron:build   # Creates .dmg for Mac
npx electron-builder --win  # Creates .exe for Windows
```

## Architecture

- **Frontend:** React 18 + Vite
- **Backend:** Express.js REST API
- **Database:** SQLite (better-sqlite3)
- **Desktop:** Electron + electron-builder
- **Packaging:** Cross-platform (Mac & Windows)

## Data Storage

- **Mac:** `~/Library/Application Support/Prompt Forge/prompt-forge.db`
- **Windows:** `%APPDATA%/Prompt Forge/prompt-forge.db`

## Environment Variables

Create `.env` in project root:

```bash
# Anthropic API key (optional)
ANTHROPIC_API_KEY=sk-...

# Ollama URL (optional, default: http://localhost:11434)
OLLAMA_HOST=http://localhost:11434
```

Leave `ANTHROPIC_API_KEY` empty to use Ollama or script generation.

## Usage

1. **Create a Task** — Describe what you want to build, fix, or improve
2. **View Outputs** — See generated prompts, files, plans, and checklists
3. **Copy & Use** — Click Copy on any prompt to use in Claude Code
4. **Save Results** — All tasks persist automatically
5. **Learn from Errors** — Mark failed tasks to improve future prompts

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Module not found | Run `npm install` |
| better-sqlite3 error | Run `npm run electron:rebuild` |
| Port 5173 in use | Auto-detects next available port |
| Data not saving | Check `~/Library/Application Support/Prompt Forge/` |

## License

Private project — for personal use.