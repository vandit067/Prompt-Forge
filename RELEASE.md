# Release Instructions

Step-by-step guide to release a new version of Prompt Forge.

## Pre-Release Checklist

Before starting a release:

- [ ] All features are complete and tested
- [ ] All bugs are fixed
- [ ] Code is committed to `feature/*` or `main` branch
- [ ] No uncommitted changes (`git status` is clean)
- [ ] Tests pass locally
- [ ] Documentation is up-to-date

## Step 1: Update Version Number

### 1.1 Update package.json
```bash
# Edit package.json and change version from "0.1.0" to "0.2.0"
# Example: "version": "0.2.0"
```

### 1.2 Verify Version Updated
```bash
grep '"version"' package.json
# Should show: "version": "0.2.0"
```

## Step 2: Update CHANGELOG

### 2.1 Create/Edit CHANGELOG.md
Add a new section at the top:

```markdown
## [0.2.0] - 2026-05-03

### Added
- New feature description
- Another feature

### Fixed
- Bug fix description
- Another fix

### Changed
- Breaking change or improvement

### Security
- Security-related changes (if any)
```

Format: Use [Keep a Changelog](https://keepachangelog.com/) format

## Step 3: Commit Version Changes

```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 0.2.0"
git push origin main  # or your feature branch
```

## Step 4: Build All Platforms

### 4.1 Clean Previous Builds
```bash
rm -rf release/
rm -rf dist/
```

### 4.2 Build Mac (.dmg)
```bash
npm run electron:build
# Creates: release/Prompt Forge-0.2.0-arm64.dmg (~118 MB)
```

### 4.3 Build Windows (.exe)
```bash
npx electron-builder --win --publish=never
# Creates: 
#   - release/Prompt Forge Setup 0.2.0.exe (~102 MB) [installer]
#   - release/Prompt Forge 0.2.0.exe (~102 MB) [portable]
```

### 4.4 Verify All Files Exist
```bash
ls -lh release/
# Should show:
# - Prompt Forge-0.2.0-arm64.dmg (Mac)
# - Prompt Forge Setup 0.2.0.exe (Windows installer)
# - Prompt Forge 0.2.0.exe (Windows portable)
```

## Step 5: Test All Installers

### 5.1 Test Mac DMG (if you're on Mac)
```bash
# Open the DMG file
open release/Prompt\ Forge-0.2.0-arm64.dmg

# Drag to Applications
# Launch and test basic functionality
# - Can create a task?
# - Can generate a prompt?
# - Does data persist after restart?
```

### 5.2 Test Windows EXE (if you have Windows or VM)
```bash
# Run: Prompt Forge Setup 0.2.0.exe
# OR
# Run: Prompt Forge 0.2.0.exe

# Test:
# - Can launch without errors?
# - UI loads correctly?
# - Can create a task?
# - Database persists?
```

**Note:** If you don't have Windows, ask someone to test or skip this step and note it in release notes.

## Step 6: Create Git Tag

```bash
# Tag the release commit
git tag -a v0.2.0 -m "Release version 0.2.0"

# Verify tag created
git tag -l | grep v0.2.0

# Push tag to GitHub
git push origin v0.2.0
```

## Step 7: Create GitHub Release

### 7.1 Via Command Line (using gh CLI)
```bash
gh release create v0.2.0 \
  --title "Prompt Forge v0.2.0" \
  --notes-file CHANGELOG.md \
  release/Prompt\ Forge-0.2.0-arm64.dmg \
  release/Prompt\ Forge\ Setup\ 0.2.0.exe \
  release/Prompt\ Forge\ 0.2.0.exe
```

### 7.2 Via GitHub Web UI
1. Go to your GitHub repo
2. Click **Releases** → **Draft a new release**
3. Choose tag: `v0.2.0`
4. Set title: `Prompt Forge v0.2.0`
5. Copy release notes from CHANGELOG.md
6. **Attach binaries:**
   - Drag & drop the 3 files from `release/` folder
   - Or click "Attach binaries by dropping here"
7. Check **"This is a pre-release"** if it's a beta/RC version
8. Click **Publish release**

## Step 8: Announce Release

Share the news:
- Update README.md if needed
- Share release link in any relevant channels
- Include download links for Mac and Windows

---

## Complete Workflow Example

```bash
# 1. Update version
nano package.json  # Change 0.1.0 → 0.2.0

# 2. Update changelog
nano CHANGELOG.md  # Add new section

# 3. Commit
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 0.2.0"
git push origin main

# 4. Build
rm -rf release/ dist/
npm run electron:build
npx electron-builder --win

# 5. Test
# Test the installers on Mac/Windows

# 6. Tag
git tag -a v0.2.0 -m "Release version 0.2.0"
git push origin v0.2.0

# 7. Release (use gh CLI or web UI)
gh release create v0.2.0 --title "Prompt Forge v0.2.0" \
  release/Prompt\ Forge-0.2.0-arm64.dmg \
  release/Prompt\ Forge\ Setup\ 0.2.0.exe \
  release/Prompt\ Forge\ 0.2.0.exe
```

---

## Version Numbering

Use [Semantic Versioning](https://semver.org/):

- **0.2.0** — New features, backward compatible (minor bump)
- **0.2.1** — Bug fixes only (patch bump)
- **1.0.0** — Major milestone, breaking changes (major bump)

Format: `MAJOR.MINOR.PATCH`

---

## Rollback (If Something Goes Wrong)

If you need to undo a release:

```bash
# Delete the tag locally
git tag -d v0.2.0

# Delete from GitHub
git push origin --delete v0.2.0

# Delete the release on GitHub (via web UI)
# Go to Releases → Edit → Delete

# Fix the issue and re-release with updated version
```

---

## Quick Reference Checklist

```
Release v0.2.0
─────────────────────────────────────────
☐ Update package.json version
☐ Update CHANGELOG.md
☐ Commit: "chore: bump version to 0.2.0"
☐ Push to GitHub
☐ Clean: rm -rf release/ dist/
☐ Build: npm run electron:build
☐ Build: npx electron-builder --win
☐ Test Mac DMG (if possible)
☐ Test Windows EXE (if possible)
☐ Verify all files in release/
☐ Create git tag: git tag -a v0.2.0 -m "..."
☐ Push tag: git push origin v0.2.0
☐ Create GitHub release
☐ Upload binaries to release
☐ Publish release
☐ Announce release
─────────────────────────────────────────
```

---

## Troubleshooting

### Build Fails
```bash
# Clean and retry
rm -rf node_modules dist/ release/
npm install
npm run electron:rebuild
npm run electron:build
```

### Tag Already Exists
```bash
# Delete and recreate
git tag -d v0.2.0
git tag -a v0.2.0 -m "Release version 0.2.0"
git push origin v0.2.0 --force
```

### Files Missing from Release
```bash
# Verify all builds completed
ls -lh release/

# Should show exactly 3 files:
# - Prompt Forge-0.2.0-arm64.dmg
# - Prompt Forge Setup 0.2.0.exe
# - Prompt Forge 0.2.0.exe
```

### Installer Doesn't Work
- Verify version number matches in binary names
- Check file sizes are reasonable (~100+ MB)
- Test on actual machine (not just CI/build logs)

---

## Need Help?

Reference files:
- `CHANGELOG.md` — Release notes format
- `package.json` — Version number
- `electron-builder.yml` — Build config
- `.github/workflows/` — If you add CI/CD later

For issues with builds, check:
- Vite build output in `dist/`
- Electron-builder logs
- electron-builder.yml configuration

Questions? Review the build section of INSTRUCTIONS.md
