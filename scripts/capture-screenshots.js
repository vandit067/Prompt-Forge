#!/usr/bin/env node

/**
 * Screenshot Capture Utility
 * Usage: node scripts/capture-screenshots.js
 *
 * Prerequisites:
 * - npm install --save-dev playwright
 * - Application must be running: npm run dev
 * - Change APP_URL if not using default localhost:5173
 */

const fs = require('fs');
const path = require('path');

const APP_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
const VIEWPORT = { width: 1400, height: 900 };

// Create screenshots directory if not exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function captureScreenshots() {
  let browser;
  try {
    const playwright = require('playwright');
    browser = await playwright.chromium.launch();
    const page = await browser.newPage();

    // Set consistent viewport size
    await page.setViewportSize(VIEWPORT);

    console.log('📸 Navigating to app...');
    await page.goto(APP_URL, { waitUntil: 'networkidle' });

    // Wait for main content to load
    await page.waitForSelector('[role="main"]', { timeout: 10000 }).catch(() => {
      console.warn('⚠️  Main selector not found, proceeding anyway');
    });

    // Give it a moment to render
    await page.waitForTimeout(500);

    // Command Center (default screen)
    console.log('📸 Capturing Command Center...');
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01-command-center.png'),
      fullPage: false
    });

    // Analytics screen
    console.log('📸 Capturing Analytics...');
    const analyticsLink = await page.$('[data-nav="analytics"]');
    if (analyticsLink) {
      await analyticsLink.click();
      await page.waitForTimeout(800);
    } else {
      // Fallback: try clicking Analytics button by aria-label
      await page.click('button:has-text("Analytics")').catch(() => {});
      await page.waitForTimeout(800);
    }
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02-analytics.png'),
      fullPage: false
    });

    // Settings screen
    console.log('📸 Capturing Settings...');
    const settingsLink = await page.$('[data-nav="settings"]');
    if (settingsLink) {
      await settingsLink.click();
      await page.waitForTimeout(800);
    } else {
      // Fallback: try clicking Settings button
      await page.click('button:has-text("Settings")').catch(() => {});
      await page.waitForTimeout(800);
    }
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03-settings.png'),
      fullPage: false
    });

    // Back to Command Center
    console.log('📸 Capturing Command Center (with project context)...');
    const commandLink = await page.$('[data-nav="command-center"]');
    if (commandLink) {
      await commandLink.click();
      await page.waitForTimeout(800);
    } else {
      await page.click('button:has-text("Command Center")').catch(() => {});
      await page.waitForTimeout(800);
    }

    // Try to engage project scanning if possible
    try {
      // Click "Existing Project" toggle if visible
      const existingBtn = await page.$('button:has-text("Existing Project")');
      if (existingBtn) {
        await existingBtn.click();
        await page.waitForTimeout(500);
      }
    } catch (e) {
      // Ignore if toggle not found
    }

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04-command-center-context.png'),
      fullPage: false
    });

    console.log('✅ Screenshots captured successfully!');
    console.log(`📁 Saved to: ${SCREENSHOTS_DIR}`);
    console.log('\n📝 Next steps:');
    console.log('1. Review screenshots: open screenshots/');
    console.log('2. Commit them: git add screenshots/ && git commit -m "docs: add session screenshots"');
    console.log('3. Push: git push');

  } catch (error) {
    console.error('❌ Error capturing screenshots:');
    console.error(error.message);

    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Hint: Make sure the app is running with: npm run dev');
    }
    if (error.message.includes('Cannot find module')) {
      console.error('\n💡 Hint: Install Playwright: npm install --save-dev playwright');
    }
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run if called directly
if (require.main === module) {
  captureScreenshots();
}

module.exports = { captureScreenshots };
