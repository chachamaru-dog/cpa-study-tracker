/**
 * 背景透過 + トリミング（透明余白を除去してふくろうだけにする）
 * flood fill + エッジフェザリング + sharp.trim()
 */
import sharp from "sharp";
import { resolve } from "path";

const SRC = "C:/Users/81904/Desktop/勉強進捗度管理アプリ/UIの要素";
const DST = "C:/Users/81904/Desktop/勉強進捗度管理アプリ/cpa-study-tracker/public";

const targets = [
  { src: "ハッピー.png", dst: "owl-happy.png" },
];

async function removeBg(srcPath, dstPath) {
  const img = sharp(srcPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const buf = Buffer.from(data);

  // 背景色を左上からサンプリング
  const bgR = buf[0], bgG = buf[1], bgB = buf[2];
  console.log(`  背景色: rgb(${bgR},${bgG},${bgB})`);

  const colorDist = (r, g, b) =>
    Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);

  const BG_THRESH = 28;

  // --- Flood fill（外周から背景を透明化）---
  const visited = new Uint8Array(width * height);
  const queue = [];

  const enqueue = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const i = y * width + x;
    if (visited[i]) return;
    visited[i] = 1;
    const p = i * 4;
    if (colorDist(buf[p], buf[p+1], buf[p+2]) <= BG_THRESH) queue.push(x, y);
  };

  for (let x = 0; x < width; x++) { enqueue(x, 0); enqueue(x, height-1); }
  for (let y = 1; y < height-1; y++) { enqueue(0, y); enqueue(width-1, y); }

  for (let qi = 0; qi < queue.length; ) {
    const x = queue[qi++], y = queue[qi++];
    buf[(y * width + x) * 4 + 3] = 0;
    enqueue(x+1, y); enqueue(x-1, y); enqueue(x, y+1); enqueue(x, y-1);
  }

  // --- エッジフェザリング（アンチエイリアス部分を滑らかに）---
  const isTransp = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return true;
    return buf[(y * width + x) * 4 + 3] === 0;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4;
      if (buf[p+3] === 0) continue;
      const adj =
        isTransp(x-1,y)||isTransp(x+1,y)||isTransp(x,y-1)||isTransp(x,y+1)||
        isTransp(x-1,y-1)||isTransp(x+1,y-1)||isTransp(x-1,y+1)||isTransp(x+1,y+1);
      if (!adj) continue;
      const dist = colorDist(buf[p], buf[p+1], buf[p+2]);
      if (dist < BG_THRESH * 3) {
        buf[p+3] = Math.max(0, Math.min(255, Math.round((dist / (BG_THRESH * 3)) * 255)));
      }
    }
  }

  // --- トリミング（透明な余白を削除） ---
  const trimmed = await sharp(buf, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();

  await sharp(trimmed)
    .trim({ threshold: 0 })
    .toFile(dstPath);

  const meta = await sharp(dstPath).metadata();
  console.log(`✓ ${srcPath.split("/").pop()} → ${dstPath.split("/").pop()} (${meta.width}x${meta.height})`);
}

for (const { src, dst } of targets) {
  await removeBg(`${SRC}/${src}`, `${DST}/${dst}`).catch(e =>
    console.error(`✗ ${src}: ${e.message}`)
  );
}
console.log("完了");
