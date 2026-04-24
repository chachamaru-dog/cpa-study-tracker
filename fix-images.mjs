import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { Jimp } = require('jimp');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, 'public');

// top/right/bottom/left: 各辺からトリムするピクセル数
// fuzz: 白背景除去の許容幅（RGB各チャンネルが 255-fuzz 以上なら透過対象）
// extraColors: 追加で除去する色 [{r,g,b,fuzz}]（チェッカーボード等）
const FIXES = {
  'owl-studying.png':   { top: 0,  right: 0,  bottom: 0,  left: 0,  fuzz: 15 },
  'owl-focus.png':      { top: 8,  right: 0,  bottom: 30, left: 22, fuzz: 20 },
  'owl-thinking.png':   { top: 0,  right: 0,  bottom: 0,  left: 16, fuzz: 18 },
  'owl-thinking2.png':  { top: 0,  right: 0,  bottom: 30, left: 0,  fuzz: 18 },
  'owl-cheering.png':   { top: 0,  right: 0,  bottom: 34, left: 0,  fuzz: 18 },
  'ui-47days.png':      { top: 0,  right: 0,  bottom: 32, left: 0,  fuzz: 30 },
  // チェッカーボード（ベージュ系 ~rgb(220,215,205)）も除去
  'ui-tree.png':        { top: 12, right: 12, bottom: 34, left: 12, fuzz: 60,
    extraColors: [{ r: 220, g: 215, b: 205, fuzz: 40 }] },
  'ui-plaid-board.png': { top: 0,  right: 0,  bottom: 0,  left: 0,  fuzz: 22 },
  'ui-focus-bar.png':   { top: 24, right: 0,  bottom: 0,  left: 0,  fuzz: 40 },
  'ui-balance-bar.png': { top: 32, right: 0,  bottom: 0,  left: 0,  fuzz: 35 },
  'ui-button-dark.png': { top: 0,  right: 0,  bottom: 0,  left: 0,  fuzz: 12 },
  'ui-button-light.png':{ top: 0,  right: 0,  bottom: 0,  left: 0,  fuzz: 12 },
};

function colorDist(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2);
}

function removeColorBackground(img, targetR, targetG, targetB, fuzz) {
  if (fuzz <= 0) return;
  const maxDist = Math.sqrt(3) * fuzz;
  img.scan(0, 0, img.width, img.height, function(x, y, idx) {
    const r = this.bitmap.data[idx];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    const dist = colorDist(r, g, b, targetR, targetG, targetB);
    if (dist <= maxDist) {
      const alpha = Math.round((dist / maxDist) * 255);
      this.bitmap.data[idx + 3] = Math.min(this.bitmap.data[idx + 3], alpha);
    }
  });
}

function removeWhiteBackground(img, fuzz, extraColors = []) {
  // 白背景除去
  if (fuzz > 0) removeColorBackground(img, 255, 255, 255, fuzz);
  // 追加色除去（チェッカーボード等）
  for (const ec of extraColors) {
    removeColorBackground(img, ec.r, ec.g, ec.b, ec.fuzz);
  }
}

async function processImage(filename, fix) {
  const filepath = path.join(PUBLIC, filename);
  try {
    let img = await Jimp.read(filepath);
    const origW = img.width;
    const origH = img.height;

    const { top, right, bottom, left, fuzz } = fix;
    const newW = origW - left - right;
    const newH = origH - top - bottom;

    if (newW > 0 && newH > 0 && (top || right || bottom || left)) {
      img = img.crop({ x: left, y: top, w: newW, h: newH });
    }

    removeWhiteBackground(img, fuzz);

    await img.write(filepath);
    console.log(`✓ ${filename}  ${origW}×${origH} → ${img.width}×${img.height}px`);
  } catch (e) {
    console.log(`✗ ${filename}: ${e.message ?? JSON.stringify(e)}`);
  }
}

console.log('PNG修正開始...\n');
for (const [filename, fix] of Object.entries(FIXES)) {
  await processImage(filename, fix);
}
console.log('\n完了！');
