import { chromium } from 'playwright-core';
const d = process.argv[2];
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args:['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1200 }, deviceScaleFactor: 2 });
await p.goto('file://' + d + '/frame2.html'); await p.waitForTimeout(500);
await p.screenshot({ path: d + '/helix-showcase2.png' });
await b.close();
