import sharp from "sharp";
import { writeFileSync } from "fs";

function makeSvg(size, maskable = false) {
  const radius = maskable ? 0 : Math.round(size * 0.18);
  const cx = size / 2;
  const cy = size / 2;
  const inner = maskable ? size * 0.8 : size * 0.9;
  const fontSize = Math.round(inner * 0.45);
  const subFontSize = Math.round(inner * 0.12);

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="#2f5a1e"/>
  <text x="${cx}" y="${cy - inner * 0.02}" text-anchor="middle" dominant-baseline="central"
        font-family="Georgia, serif" font-weight="700"
        font-size="${fontSize}" fill="#c89f45">S</text>
  <text x="${cx}" y="${cy + inner * 0.3}" text-anchor="middle" dominant-baseline="central"
        font-family="Arial, sans-serif" font-weight="500"
        font-size="${subFontSize}" fill="#faf8f4" letter-spacing="${Math.round(subFontSize * 0.15)}">TAGAYTAY</text>
</svg>`);
}

const outDir = "./public/icons";

const variants = [
  { size: 192, maskable: false, file: "icon-192.png" },
  { size: 512, maskable: false, file: "icon-512.png" },
  { size: 192, maskable: true, file: "icon-maskable-192.png" },
  { size: 512, maskable: true, file: "icon-maskable-512.png" },
];

for (const v of variants) {
  const svg = makeSvg(v.size, v.maskable);
  await sharp(svg).png().toFile(`${outDir}/${v.file}`);
  console.log(`Created ${v.file}`);
}

const faviconSvg = makeSvg(32, false);
writeFileSync("./public/favicon.svg", faviconSvg);
await sharp(makeSvg(32, false)).png().toFile("./public/favicon.png");

console.log("All icons generated!");
