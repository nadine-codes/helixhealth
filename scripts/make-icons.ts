import "./_env";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

// Rasterize public/icon.svg into the full favicon set in /public.
// PNG favicons are included explicitly because Safari renders gradient/opacity
// SVG favicons unreliably; a raster 32x32 is the dependable cross-browser option.
async function main() {
  const svg = readFileSync(resolve(process.cwd(), "public/icon.svg"));
  const pub = resolve(process.cwd(), "public");

  async function png(size: number): Promise<Buffer> {
    return sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();
  }

  writeFileSync(resolve(pub, "icon-16.png"), await png(16));
  writeFileSync(resolve(pub, "icon-32.png"), await png(32));
  writeFileSync(resolve(pub, "icon-192.png"), await png(192));
  writeFileSync(resolve(pub, "icon-512.png"), await png(512));
  writeFileSync(resolve(pub, "apple-icon.png"), await png(180));

  const ico = await pngToIco([await png(16), await png(32), await png(48)]);
  writeFileSync(resolve(pub, "favicon.ico"), ico);

  console.log("Wrote favicon.ico, apple-icon.png, icon-16/32/192/512.png to /public");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
