import { chromium } from 'playwright-core';
const d = process.argv[2];
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args:['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 2560, height: 880 }, deviceScaleFactor: 2 });
await p.goto('file://' + d + '/side.html'); await p.waitForTimeout(500);
const h = await p.evaluate(() => document.body.scrollHeight);
await p.setViewportSize({ width: 2560, height: h });
await p.screenshot({ path: d + '/compare.png', fullPage: true });
await b.close();
