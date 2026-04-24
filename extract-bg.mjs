import sharp from 'sharp';
import { writeFile } from 'fs/promises';

const OUT = 'C:/Users/81904/Desktop/勉強進捗度管理アプリ/cpa-study-tracker/public';

// 背景除去：四隅からフラッドフィルで明るい低彩度ピクセル（紙・白背景）を透過化
function isBgPixel(r, g, b) {
  const diff = Math.max(r, g, b) - Math.min(r, g, b);
  const bri  = (r + g + b) / 3;
  return bri > 200 && diff < 40;
}

async function removeBg(inputPath, outputName) {
  const meta = await sharp(inputPath).metadata();
  const { width, height } = meta;
  console.log(`${outputName}: ${width} x ${height}`);

  const raw = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const src = raw.data;
  const ch  = raw.info.channels; // 3 or 4

  const mask = new Uint8Array(width * height);

  const queue = [];
  const enqueue = (x, y) => {
    const idx = y * width + x;
    if (mask[idx] === 0) {
      const r = src[idx * ch], g = src[idx * ch + 1], b = src[idx * ch + 2];
      if (isBgPixel(r, g, b)) { mask[idx] = 1; queue.push(idx); }
    }
  };
  for (let x = 0; x < width;  x++) { enqueue(x, 0); enqueue(x, height - 1); }
  for (let y = 0; y < height; y++) { enqueue(0, y); enqueue(width - 1, y); }

  let qi = 0;
  while (qi < queue.length) {
    const idx = queue[qi++];
    const x = idx % width, y = Math.floor(idx / width);
    for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      enqueue(nx, ny);
    }
  }

  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4]     = src[i * ch];
    rgba[i * 4 + 1] = src[i * ch + 1];
    rgba[i * 4 + 2] = src[i * ch + 2];
    rgba[i * 4 + 3] = mask[i] ? 0 : 255;
  }

  const buf = await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();
  await writeFile(`${OUT}/${outputName}.png`, buf);
  console.log(`✓ ${outputName}.png`);
}

await removeBg(`${OUT}/bg-grass.jpg`, 'bg-grass');
await removeBg(`${OUT}/bg-tree.jpg`,  'bg-tree');

// 透明余白をトリム
for (const name of ['bg-grass', 'bg-tree']) {
  const src = `${OUT}/${name}.png`;
  const buf = await sharp(src).trim({ threshold: 10 }).png().toBuffer();
  await writeFile(src, buf);
  const m = await sharp(buf).metadata();
  console.log(`trimmed ${name}.png → ${m.width}x${m.height}`);
}
console.log('完了');
