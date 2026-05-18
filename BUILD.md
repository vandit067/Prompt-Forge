# Building Prompt Forge for Desktop

This guide explains how to build Prompt Forge as a native desktop application for macOS, Windows, and Linux.

## Prerequisites

### All Platforms
- Node.js 20+
- npm or yarn

### macOS
- Xcode Command Line Tools: `xcode-select --install`
- For code signing/notarization (optional): Apple Developer account

### Windows
- Visual Studio Build Tools (for native module compilation)
- NSIS (installer) - automatically downloaded by electron-builder
- Optional: Windows code signing certificate

### Linux
- GCC and build tools: `sudo apt-get install build-essential`
- Optional packages for different formats:
  - AppImage: `snapcraft` and `appimagetool`
  - Snap: `snapcraft`
  - Deb: `dpkg`

## Development

Run the desktop app in development mode with hot reload:

```bash
npm run electron:dev
```

This launches:
- Vite dev server (http://localhost:5173)
- API server (http://localhost:3001)
- Electron app with DevTools enabled

## Building for Distribution

### All Platforms (macOS, Windows, Linux)
```bash
npm run electron:build:all
```

Outputs to `release/` directory:
- macOS: `.dmg` installer and `.zip` archive
- Windows: `.exe` installer, portable `.exe`, and `.msi`
- Linux: `.AppImage`, `.snap`, and `.deb`

### macOS Only
```bash
npm run electron:build:mac
```

Outputs:
- `release/Prompt Forge-*.dmg` - Installer
- `release/Prompt Forge-*.zip` - Archive (Intel + Apple Silicon)

**Code Signing (Optional)**
To sign for distribution, update `electron-builder.yml`:
```yaml
mac:
  identity: "Developer ID Application: Your Name (ID)"
  notarize:
    teamId: "XXXXXXXXXX"
```

### Windows Only
```bash
npm run electron:build:win
```

Outputs:
- `release/Prompt Forge Setup *.exe` - NSIS Installer
- `release/Prompt Forge *.exe` - Portable executable
- `release/Prompt Forge-*.msi` - MSI Installer

**Code Signing (Optional)**
To sign the installer, set environment variables:
```bash
export WIN_SIGNING_THUMBPRINT="your-cert-thumbprint"
npm run electron:build:win
```

### Linux Only
```bash
npm run electron:build:linux
```

Outputs:
- `release/Prompt Forge-*.AppImage` - Self-contained executable
- `release/Prompt Forge_*.deb` - Debian package
- `release/snap/Prompt Forge-*.snap` - Snap package

## Application Data Locations

The app stores data in platform-specific locations:

- **macOS**: `~/Library/Application Support/Prompt Forge/`
- **Windows**: `%APPDATA%\Prompt Forge\`
- **Linux**: `~/.config/Prompt Forge/` or `$XDG_CONFIG_HOME/Prompt Forge/`

Database file: `prompt-forge.db` in the data directory above.

## Distribution

### macOS
1. Build the DMG: `npm run electron:build:mac`
2. Sign and notarize (if needed)
3. Upload to App Store or distribute DMG directly

### Windows
1. Build installers: `npm run electron:build:win`
2. Sign the installers (if code signing certificate available)
3. Distribute `.exe` or `.msi` installers

### Linux
1. Build packages: `npm run electron:build:linux`
2. For Ubuntu/Debian: distribute the `.deb` file
3. For universal distribution: use the `.AppImage` file
4. For snap store: `snapcraft push release/*.snap`

## Troubleshooting

### Native Module Issues
If `better-sqlite3` fails to compile:
```bash
npm run electron:rebuild
```

### Icon Issues
Icons are located in `assets/`:
- `icon.icns` - macOS
- `icon.ico` - Windows
- `icon-256x256.png` - Linux
- `icon.svg` - Source vector (can be regenerated)

### Build Failures
1. Clear cache: `rm -rf dist release`
2. Clean dependencies: `rm -rf node_modules && npm install`
3. Rebuild native modules: `npm run electron:rebuild`
4. Try again: `npm run electron:build:all`

## Environment Variables

- `ANTHROPIC_API_KEY` - API key for Claude (optional, for online features)
- `OLLAMA_HOST` - Ollama server address (default: `http://localhost:11434`)

## Performance Tips

- Build on the target platform when possible (macOS apps should be built on macOS for proper signing)
- Use ARM64 builds for Apple Silicon machines
- For Windows, use x64 builds for better compatibility

## Release Process

1. Update version in `package.json`
2. Build for all platforms: `npm run electron:build:all`
3. Test installers on each platform
4. Create GitHub release and upload binaries
5. Announce release

## Support

For issues with electron-builder, see: https://www.electron.build/
