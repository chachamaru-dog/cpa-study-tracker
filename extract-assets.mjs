import sharp from 'sharp';
import { writeFile } from 'fs/promises';

const INPUT = 'C:/Users/81904/Desktop/勉強進捗度管理アプリ/画像要素__90415107.jpg';
const OUT   = 'C:/Users/81904/Desktop/勉強進捗度管理アプリ/cpa-study-tracker/public';

// 画像サイズ: 896 x 1195
// スライス解析結果に基づく精確な座標 [left, top, width, height]
const CROPS = {
  'owl-studying':    [ 62, 275, 178, 135],  // 机でくつろぐフクロウ
  'owl-thinking':    [255, 278, 178, 132],  // 考えるフクロウ（のぞき用）
  'owl-focus':       [ 62, 455, 185, 148],  // 集中フクロウ
  'owl-thinking2':   [255, 455, 182, 145],  // 別バリエーション
  'owl-cheering':    [ 62, 645, 185, 148],  // 応援フクロウ
  'ui-plaid-board':  [478, 280, 392, 118],  // タータン柄メッセージボード
  'ui-47days':       [478, 460, 172, 148],  // フリップボード「47日」
  'ui-tree':         [658, 455, 215, 155],  // 木のイラスト
  'ui-focus-bar':    [478, 692,  375, 48],  // 集中度グラフバー
  'ui-balance-bar':  [478, 762,  375, 48],  // バランスグラフバー
  'ui-button-dark':  [478, 868,  375, 44],  // ダークボタン
  'ui-button-light': [478, 942,  375, 44],  // ライトボタン
};

// 背景除去：四隅からフラッドフィルで背景を透過化
// → フクロウ内部の明るい部分は消えない
function isBgPixel(r, g, b) {
  const diff = Math.max(r, g, b) - Math.min(r, g, b);
  const bri  = (r + g + b) / 3;
  // 明るくて低彩度 = 背景（チェッカー or クリーム紙）
  return bri > 155 && diff < 55;
}

async function removeCheckerboard(jpgBuffer, { width, height }) {
  const raw  = await sharp(jpgBuffer).raw().toBuffer({ resolveWithObject: true });
  const src  = raw.data;

  // 透過マスク（true=背景=透過）
  const mask = new Uint8Array(width * height); // 0=opaque, 1=transparent

  // BFS フラッドフィル（四隅＋全辺から開始）
  const queue = [];
  const enqueue = (x, y) => {
    const idx = y * width + x;
    if (mask[idx] === 0) {
      const r = src[idx * 3], g = src[idx * 3 + 1], b = src[idx * 3 + 2];
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

  // RGBAバッファ生成
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4]     = src[i * 3];
    rgba[i * 4 + 1] = src[i * 3 + 1];
    rgba[i * 4 + 2] = src[i * 3 + 2];
    rgba[i * 4 + 3] = mask[i] ? 0 : 255;
  }

  return sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function run() {
  const meta = await sharp(INPUT).metadata();
  console.log(`元画像: ${meta.width} x ${meta.height}`);

  for (const [name, [left, top, width, height]] of Object.entries(CROPS)) {
    try {
      const cropped = await sharp(INPUT)
        .extract({ left, top, width, height })
        .toBuffer();

      let out;
      if (name.startsWith('owl-')) {
        // フクロウはチェッカーボード除去 → 透過PNG
        out = await removeCheckerboard(cropped, { width, height });
      } else {
        // UIパーツはそのままPNG化
        out = await sharp(cropped).png().toBuffer();
      }

      await writeFile(`${OUT}/${name}.png`, out);
      console.log(`✓ ${name}.png`);
    } catch (e) {
      console.error(`✗ ${name}: ${e.message}`);
    }
  }
  console.log('完了');
}

run();
