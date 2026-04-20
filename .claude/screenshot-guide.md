# Screenshot Capture Guide

## Purpose
Per CLAUDE.md, screenshots must be captured after every work session showing UI changes, committed before pushing.

## Manual Capture (Current Approach)

### 1. Start Dev Server
```bash
npm run dev
```

### 2. Navigate Application
Visit each screen to capture UI changes:
- Command Center (toggle buttons, input area)
- Analytics (stat cards, charts, trends)
- Settings (form inputs)
- Task Detail (feedback buttons, status)

### 3. Capture Screenshots
Use your system's screenshot tool:
- **Mac**: `Cmd+Shift+4` (region) or `Cmd+Shift+5` (window)
- **Linux**: `Print` key or `gnome-screenshot`
- **Windows**: `Win+Shift+S` or Snipping Tool

### 4. Save to Directory
Save to `screenshots/` with numbered filenames:
```
NN-description.png
```

Examples:
- `01-toggle-buttons-visible.png` (P0 fix)
- `02-design-tokens-applied.png` (design system)
- `03-settings-persistence.png` (P1 fix)
- `04-analytics-weekly-trend.png` (analytics)
- `05-project-context-saved.png` (context persistence)

### 5. Commit Before Push
```bash
git add screenshots/
git commit -m "docs: add session screenshots"
git push
```

## Automated Capture (Future)

The following script template can be used with Playwright/Puppeteer for automated screenshots:

```javascript
// scripts/capture-screenshots.js
const playwright = require('playwright');

async function captureScreenshots() {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');

  // Set viewport to consistent size
  await page.setViewportSize({ width: 1400, height: 900 });

  // Wait for app to load
  await page.waitForSelector('[role="main"]', { timeout: 5000 });

  // Command Center
  await page.screenshot({ path: 'screenshots/01-command-center.png', fullPage: false });

  // Analytics
  await page.click('[href*="analytics"]');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'screenshots/02-analytics.png', fullPage: false });

  // Settings
  await page.click('[href*="settings"]');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'screenshots/03-settings.png', fullPage: false });

  await browser.close();
}

captureScreenshots();
```

## Integration

Add to `package.json`:
```json
{
  "scripts": {
    "screenshots": "node scripts/capture-screenshots.js",
    "screenshots:watch": "concurrently 'npm run dev' 'sleep 5 && npm run screenshots'"
  }
}
```

Then run before committing:
```bash
npm run screenshots:watch
```

## Current Session Screens

Based on changes made, capture screenshots for:

1. **Toggle Buttons Visible** (P0 fix)
   - Show "New Project" and "Existing Project" buttons clearly highlighted
   - Demonstrate hover states and active selection

2. **Design System Applied** (Design tokens P0)
   - Show consistent styling across screens
   - Demonstrate colors and spacing from design system

3. **Database Indexes** (P1)
   - Show Analytics screen with performance improvements
   - Charts should render smoothly with large datasets

4. **Settings Persistence** (P1)
   - Show Settings screen with form inputs
   - Demonstrate that changes persist after reload

5. **Project Context Saved** (P1)
   - Show Task Detail with scanned project context
   - Display tech stack, files, and rules detected

6. **Analytics Enhanced** (P1 + P2)
   - Show weekly trend chart
   - Show most-used project paths
   - Show common failure patterns

7. **File Scanning Expanded** (P2)
   - Scan a Python project with requirements.txt
   - Show detected tech stack includes Python frameworks

8. **Error Classification** (P2)
   - Show failure patterns with error type categorization
   - Display error_type populated in analytics

## Checklist for Next Session

- [ ] Run dev server
- [ ] Test toggle button visibility
- [ ] Test settings persistence (reload page)
- [ ] Test project context loading
- [ ] Capture 8 key screenshots
- [ ] Commit screenshots: `git add screenshots/ && git commit -m "docs: add session screenshots"`
- [ ] Push to remote

## Notes

- Keep screenshots at consistent resolution (1400x900 recommended)
- Include UI chrome (sidebar, buttons) for context
- Filename numbering reflects implementation order, not screen count
- Update this guide when adding new screens