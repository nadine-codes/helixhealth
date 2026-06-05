import "./_env";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

// Rasterize src/app/icon.svg into the favicon set (apple-touch + .ico + manifest PNGs).
async function main() {
  const svgPath = resolve(process.cwd(), "src/app/icon.svg");
  const svg = readFileSync(svgPath);
  const appDir = resolve(process.cwd(), "src/app");
  const pub = resolve(process.cwd(), "public");

  async function png(size: number): Promise<Buffer> {
    return sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();
  }

  // Apple touch icon (iOS home screen) — Next serves src/app/apple-icon.png.
  writeFileSync(resolve(appDir, "apple-icon.png"), await png(180));

  // Android / PWA manifest icons.
  writeFileSync(resolve(pub, "icon-192.png"), await png(192));
  writeFileSync(resolve(pub, "icon-512.png"), await png(512));

  // Classic favicon.ico (16/32/48) — overrides the default Next favicon.
  const ico = await pngToIco([await png(16), await png(32), await png(48)]);
  writeFileSync(resolve(appDir, "favicon.ico"), ico);

  console.log("Wrote apple-icon.png, favicon.ico, icon-192.png, icon-512.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
