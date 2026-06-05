import "./_env";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

// Generate a 1200x630 Open Graph share image.
const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0f766e"/>
      <stop offset="0.55" stop-color="#0d9488"/>
      <stop offset="1" stop-color="#4f46e5"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="#000000" opacity="0.06"/>

  <!-- brand -->
  <g transform="translate(80,72)">
    <g transform="scale(1.6)" fill="none" stroke="#ffffff" stroke-linecap="round">
      <path d="M7 3c0 4 10 5 10 9s-10 5-10 9" stroke-width="1.9"/>
      <path d="M17 3c0 4-10 5-10 9s10 5 10 9" stroke-width="1.9" opacity="0.55"/>
    </g>
    <text x="56" y="33" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="700" fill="#ffffff" letter-spacing="0.5">Helix Health</text>
  </g>

  <!-- headline -->
  <text x="80" y="300" font-family="Helvetica, Arial, sans-serif" font-size="76" font-weight="700" fill="#ffffff">Every app shows you what.</text>
  <text x="80" y="392" font-family="Helvetica, Arial, sans-serif" font-size="76" font-weight="700" fill="#ffffff">Helix shows you <tspan fill="#d9f7ef">why.</tspan></text>

  <!-- subtitle -->
  <text x="82" y="470" font-family="Helvetica, Arial, sans-serif" font-size="32" fill="#e6e9ef" opacity="0.95">An AI health-intelligence layer that turns measurement into meaning,</text>
  <text x="82" y="512" font-family="Helvetica, Arial, sans-serif" font-size="32" fill="#e6e9ef" opacity="0.95">and the one action that matters.</text>
</svg>`;

async function main() {
  const out = resolve(process.cwd(), "public/og.png");
  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log("Wrote", out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
