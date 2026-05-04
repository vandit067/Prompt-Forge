# Prompt Forge — Setup & Usage Instructions

## Table of Contents
1. [Installation](#installation)
2. [First Launch](#first-launch)
3. [Configuration](#configuration)
4. [Daily Usage](#daily-usage)
5. [Development Setup](#development-setup)
6. [Troubleshooting](#troubleshooting)

---

## Installation

### macOS (Recommended)

#### Option 1: Using DMG Installer (Easiest)
1. Download `Prompt Forge-0.1.0-arm64.dmg`
2. Double-click to mount the disk image
3. Drag the **Prompt Forge** icon to the Applications folder
4. Wait for the copy to complete
5. Eject the disk image
6. Go to Applications, find Prompt Forge
7. **First launch:** Right-click → "Open" (macOS security check)
8. The app will open and ask for permissions — grant them
9. You're done! Future launches can be from Applications or Spotlight

**Important:** The first time, you need to right-click and select "Open" because the app is not signed. After this one approval, you can launch normally.

### Windows

#### Option 1: Using Installer (Recommended)
1. Download `Prompt Forge Setup 0.1.0.exe`
2. Double-click to run the installer
3. Follow the installation wizard
4. Accept default locations
5. Uncheck "Launch app on completion" if you want to configure first
6. Click Finish
7. The app will be in Start Menu under "Prompt Forge"

#### Option 2: Portable (No Installation)
1. Download `Prompt Forge 0.1.0.exe`
2. Place it in a folder of your choice (e.g., Desktop)
3. Double-click to run — no installation needed
4. App launches with all data stored in the same folder

---

## First Launch

When you open Prompt Forge for the first time:

1. **Main UI loads** — You'll see the Command Center with an empty task list
2. **Database initializes** — SQLite database is created in the data folder
3. **Backend detects** — The app checks for Anthropic API key or Ollama

### First Time Checklist
- ✅ UI loads without errors
- ✅ Sidebar shows "No tasks yet"
- ✅ You can type in the textarea
- ✅ "New Project" / "Existing Project" toggle works
- ✅ Generate button is visible

If any of these fail, check [Troubleshooting](#troubleshooting).

---

## Configuration

### Anthropic API (Optional)

If you have an Anthropic API key and want to use Claude directly:

**macOS:**
1. Create `.env` file in your home directory: `~/.prompt-forge.env`
2. Add: `ANTHROPIC_API_KEY=sk-your-key-here`
3. Restart the app

**Windows:**
1. Create `.env` file in: `C:\Users\YourUsername\.prompt-forge.env`
2. Add: `ANTHROPIC_API_KEY=sk-your-key-here`
3. Restart the app

**Without API Key:**
- The app falls back to Ollama (if running) or script generation
- Completely free and local — no API calls

### Ollama Configuration (Optional)

If you have Ollama running locally:

**Default:** Already configured for `http://localhost:11434`

**Custom Location:**
1. Create/edit `.env` file (see above)
2. Add: `OLLAMA_HOST=http://your-server:11434`
3. Restart the app

---

## Daily Usage

### Creating Your First Prompt

1. **Open Prompt Forge**
2. **Choose Project Mode:**
   - **New Project** — For standalone prompts, no code context
   - **Existing Project** — To include your codebase context (optional)
3. **Type Your Request:**
   ```
   Example: "Fix the login form validation to require minimum 8 characters"
   ```
4. **Click Generate** or press Cmd/Ctrl + Enter
5. **Wait for Processing:**
   - App shows "Learning from N past issues" if there are known patterns
   - Processing takes 5-30 seconds depending on backend
6. **View Results in Tabs:**
   - **Prompts** — The generated prompt(s) — copy to Claude Code
   - **Files** — Any supporting documentation
   - **Plan** — Step-by-step implementation plan
   - **Checklist** — Verification checklist

### Using Existing Project Mode

When you select "Existing Project":

1. **Enter Project Path:** `/Users/you/my-app`
2. **Click "Scan"** — App analyzes:
   - Project structure
   - Technology stack detected
   - Key files and dependencies
3. **Context is added** to the prompt automatically
4. **Generate as normal** — Prompts are now tailored to your codebase

### Copying & Using Prompts

1. **In the Prompts tab:**
   - Click **Copy** button on any prompt
   - Paste into Claude Code's `/claude` command
   - Or use in ChatGPT, Claude directly, etc.

2. **Copy All** button (for multi-session tasks):
   - Copies all prompts at once
   - Useful for complex tasks with multiple steps

### Saving Error Notes

If a generated prompt didn't work:

1. **Mark as "Error"** button
2. **Describe what went wrong:**
   - "Generated code didn't handle edge cases"
   - "Suggested approach conflicts with existing auth system"
3. **Save** — App learns from this for future similar tasks

---

## Development Setup

For developers who want to modify the app:

### Prerequisites
```bash
# Check versions
node --version  # Should be v20+
npm --version   # Should be v10+
```

### Initial Setup
```bash
# Clone or download the project
cd /path/to/Prompt-Forge

# Install dependencies (takes ~5 minutes)
npm install

# Rebuild native modules for Electron
npm run electron:rebuild
```

### Running in Dev Mode
```bash
npm run electron:dev
```

This starts:
- **Vite** on `localhost:5174` (or next available port)
- **Express API** on `localhost:3001`
- **Electron window** pointing to the dev server
- **Hot reload** enabled — changes appear instantly

### Building for Distribution

**Mac:**
```bash
npm run electron:build
# Creates: release/Prompt Forge-0.1.0-arm64.dmg
```

**Windows:**
```bash
npx electron-builder --win
# Creates: release/Prompt Forge Setup 0.1.0.exe
#      and release/Prompt Forge 0.1.0.exe
```

### Project Structure
```
Prompt-Forge/
├── src/              # React frontend
│   ├── screens/      # Main UI screens
│   ├── components/   # Reusable components
│   ├── lib/          # Utilities
│   └── App.tsx       # Root component
├── server/           # Express API
│   ├── index.js      # Main server
│   └── db.js         # SQLite setup
├── electron/         # Electron main process
│   ├── main.js       # App entry point
│   └── preload.js    # Security bridge
├── dist/             # Built frontend (created by npm run build)
├── release/          # Packaged apps (created by electron-builder)
└── package.json      # Dependencies & scripts
```

---

## Troubleshooting

### App Won't Launch

**macOS:** "Prompt Forge cannot be opened"
```
Solution: Right-click → "Open" (first time only)
```

**Windows:** "Windows protected your PC"
```
Solution: Click "More info" → "Run anyway"
(This is normal for unsigned apps)
```

### "Cannot find module '@anthropic-ai/sdk'"
```bash
npm install
```

### "better-sqlite3 rebuild error"
```bash
npm run electron:rebuild
```

### Tasks not saving
1. Check data location:
   - **Mac:** `~/Library/Application Support/Prompt Forge/`
   - **Windows:** `%APPDATA%/Prompt Forge/`
2. Ensure folder exists and you have write permissions
3. Restart the app

### Port 5173 already in use (dev mode)
- Vite automatically uses the next available port (5174, 5175, etc.)
- Check the terminal output for which port is being used
- No action needed — the app will work fine

### Ollama not detected
1. Verify Ollama is running: `curl http://localhost:11434/api/tags`
2. If using custom port, set `OLLAMA_HOST` env variable
3. Restart Prompt Forge

### Database corruption
```bash
# Backup existing database
mv ~/Library/Application\ Support/Prompt\ Forge/prompt-forge.db ~/prompt-forge.db.backup

# Delete corrupted database
rm ~/Library/Application\ Support/Prompt\ Forge/prompt-forge.db*

# Restart app — new clean database will be created
```

---

## Tips & Best Practices

### Prompt Engineering
- **Be specific:** "Add dark mode toggle" is better than "Improve UI"
- **Include context:** Mention tech stack, constraints, edge cases
- **Use existing project mode:** For tasks within your codebase

### Saving Results
- Mark successful tasks as "Worked" for reference
- Save error notes on failures to improve future prompts
- Periodically review past tasks for patterns

### Backend Strategy
- **Start with script generation** (free, fast)
- **Use Ollama** for privacy-critical code
- **Use Anthropic API** for highest quality

---

## Support & Feedback

- **Issues?** Check the [Troubleshooting](#troubleshooting) section
- **Feature requests?** Open an issue in the project repository
- **Bug report?** Include app version and the exact steps to reproduce

---

## Version Info

- **App Version:** 0.1.0
- **Electron:** 41.5.0
- **Node.js:** 20 (bundled in app)
- **React:** 18.3.1
- **Supported OS:** macOS 11+, Windows 10+
