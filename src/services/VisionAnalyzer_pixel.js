/**
 * VisionAnalyzer_pixel.js
 *
 * STEPN 収支管理ツール - ピクセル解析
 * VisionAnalyzer.js から分割（トークン節約のため）
 *
 * 含まれる内容：
 *   - detectMbResultByPixel（MB結果画面判定）
 *   - getKeptGemColor（VIPジェム色判別）
 *   - getChainSuggestion（チェーン提案）
 *   - getMbRewardItems（MB報酬アイテム判別）
 *   - ピクセル解析内部ユーティリティ
 */

import * as ImageManipulator from 'expo-image-manipulator';
import pako from 'pako';
import { Buffer } from 'buffer';


// ─────────────────────────────────────────
// ピクセル解析（MB獲得アイテム自動判別）
// ─────────────────────────────────────────

/**
 * gem_upgrade_fail の VIPジェム保持時に
 * 保持したジェムの色をピクセル解析で判別する
 * App.js側から呼ぶ（needs_pixel_scan=true, pixel_scan_type='kept_gem'）
 *
 * @param {string} uri  gem_upgrade_fail 結果画面のURI
 * @returns {string|null} 'efficiency'|'luck'|'comfort'|'resilience'|null
 *
 * 画面構造：
 *   "You kept 1 Gem" バナーの下にジェムアイコンが光って表示される
 *   画面中央下部（y:65%〜85%、x:35%〜65%）にアイコンが出る
 */

// ─────────────────────────────────────────
// MB結果画面判定（ピクセル解析）
// ─────────────────────────────────────────

/**
 * MB結果画面かホーム画面かをピクセル解析で判定する
 *
 * ✅ v3.3.3修正: サンプリング戦略を改善
 *   ジェムアイコンの中心を避けて、スロットカードの余白（白い領域）を
 *   確実にサンプリングするように座標を調整
 *
 *   MB結果画面: y=70-87% に白いカード型スロットが並ぶ（明るい）
 *   ホーム画面: y=70-87% はSTARTボタン(緑)＋暗い背景（暗い）
 *
 *   判定: 12ポイントサンプリング → 明るい(brightness>160)が3つ以上
 */
export async function detectMbResultByPixel(uri) {
  try {
    const imgInfo = await ImageManipulator.manipulateAsync(uri, [], {
      format: ImageManipulator.SaveFormat.PNG,
    });
    const W = imgInfo.width;
    const H = imgInfo.height;

    console.log('[pixel] detectMbResult start, size:', W, 'x', H);

    // 12ポイントサンプリング
    // y: スロット領域（実測 y=63-73%）の上部(62%)・中央(68%)・下部(74%)
    // x: 各スロット中心付近（左15%・中左38%・中右62%・右85%）
    const yPositions = [0.62, 0.68, 0.74];
    const xPositions = [0.15, 0.38, 0.62, 0.85];

    const cropW = Math.max(Math.round(W * 0.05), 8);
    const cropH = Math.max(Math.round(H * 0.02), 8);

    let brightCount = 0;

    for (const yp of yPositions) {
      for (const xp of xPositions) {
        const crop = {
          originX: Math.max(0, Math.round(W * xp) - Math.round(cropW / 2)),
          originY: Math.max(0, Math.round(H * yp) - Math.round(cropH / 2)),
          width:   Math.min(cropW, W),
          height:  Math.min(cropH, H),
        };

        const rgb = await _getAverageRgb(uri, crop);
        if (rgb) {
          const brightness = (rgb.r + rgb.g + rgb.b) / 3;
          const isBright = brightness > 160;
          console.log('[pixel] mbScan (x=' + xp + ',y=' + yp + '):',
            'RGB(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')',
            'bri=' + Math.round(brightness),
            isBright ? '→ BRIGHT ✅' : '');
          if (isBright) brightCount++;
        }
      }
    }

    const isMbResult = brightCount >= 3;
    console.log('[pixel] detectMbResult brightCount:', brightCount, '/ 12 →',
      isMbResult ? 'mb_result' : 'home');
    return isMbResult;

  } catch (e) {
    console.warn('[detectMbResultByPixel] error:', e);
    return false;
  }
}

export async function getKeptGemColor(uri) {
  try {
    const imgInfo = await ImageManipulator.manipulateAsync(uri, [], {
      format: ImageManipulator.SaveFormat.PNG,
    });
    const imgW = imgInfo.width;
    const imgH = imgInfo.height;

    // 保持ジェムアイコンの中心付近をクロップ
    // "You kept 1 Gem" → ジェムは画面中央・やや下
    const crop = {
      originX: Math.round(imgW * 0.35),
      originY: Math.round(imgH * 0.62),
      width:   Math.round(imgW * 0.30),
      height:  Math.round(imgH * 0.18),
    };

    const rgb = await _getAverageRgb(uri, crop);
    if (!rgb) return null;

    const color = _classifyMbSlot(rgb);
    // 'scroll'/'empty'/'unknown' は null として返す
    const validColors = ['efficiency', 'luck', 'comfort', 'resilience'];
    return validColors.includes(color) ? color : null;
  } catch (err) {
    console.warn('[VisionAnalyzer] getKeptGemColor error:', err);
    return null;
  }
}

/**
 * ホーム画面のヘッダーアイコン色からチェーンを提案する
 * App.js側から呼ぶ（needs_pixel_scan=true, pixel_scan_type='chain_header'）
 *
 * @param {string} uri  ホーム画面のURI
 * @returns {'SOL'|'BNB'|'POL'|null}
 *
 * チェーン判定基準（ヘッダー右上のチェーンアイコン）：
 *   SOL → ティール緑 RGB(27, 186, 158)
 *   BNB → 黄色      RGB(243, 197, 60)
 *   POL → 紫系      RGB(178, 67, 84) ／ 暗紫 RGB(40, 22, 82)
 *
 * ※確定ではなく「提案」として使う（手動選択が優先）
 * ※v3.2.3: クロップ座標を相対座標化・最大彩度ピクセル方式に変更
 */
export async function getChainSuggestion(uri) {
  try {
    const imgInfo = await ImageManipulator.manipulateAsync(uri, [], {
      format: ImageManipulator.SaveFormat.PNG,
    });
    const imgW = imgInfo.width;
    const imgH = imgInfo.height;

    console.log('[DEBUG] getChainSuggestion start, size:', imgW, 'x', imgH);

    // ✅ v3.3.2修正: クロップ範囲を拡大
    //   リペア画面はGST/GMT残高表示があるため、チェーンアイコンが
    //   画面右端ではなく70-90%あたりに位置する
    //   ホーム画面（右端寄り）とリペア画面（やや左寄り）の両方をカバー
    const crop = {
      originX: Math.round(imgW * 0.68),
      originY: Math.round(imgH * 0.03),
      width:   Math.round(imgW * 0.28),
      height:  Math.round(imgH * 0.08),
    };
    console.log('[DEBUG] crop:', JSON.stringify(crop));

    // ✅ v3.2.3修正: 平均RGB → 最大彩度ピクセル方式
    const rgb = await _getMaxSaturationRgb(uri, crop);
    console.log('[DEBUG] rgb result:', JSON.stringify(rgb));

    if (!rgb) {
      console.log('[DEBUG] rgb is null → return null');
      return null;
    }
    const chain = _classifyChainColor(rgb);
    console.log('[DEBUG] chain result:', chain);
    return chain;
  } catch (err) {
    console.warn('[DEBUG] getChainSuggestion error:', err.message);
    return null;
  }
}

/**
 * RGB値からチェーンを判別する
 *
 * ✅ v3.2.3修正: SOLをデフォルト値として扱う方式に変更
 *   背景：SOLのチェーンアイコンはグレーで色検出不可
 *   → 彩度が低い（グレー系）= SOLアイコンの特徴 → SOLとみなす
 *   → BNB（黄）と POL（紫）は色で検出、それ以外はSOL
 *
 *   SOLアイコン    RGB(77, 76, 81)   sat≈5   → SOL（sat<35）
 *   SOLティール緑  RGB(27, 186, 158) sat=159 → SOL（G最大）
 *   BNB実測        RGB(243, 197, 60) sat=183 → BNB
 *   POL暗紫(MB時)  RGB(36, 24, 62)  sat=38  → POL
 *   POL通常        RGB(144, 99, 205) sat=106 → POL
 */
/**
 * ✅ v3.3.2修正: 彩度チェック → 色パターンチェックの順に変更
 *   リペア画面のダークオーバーレイでアイコン色が暗くなるため、
 *   低彩度でも色パターン（R>G>B=黄系, B>G<R=紫系）を先に判定する
 *
 *   実測値（オーバーレイ越し）:
 *     POL: RGB(51,39,73) sat=34 → B>R>G = 紫パターン
 *     BNB: RGB(81,78,63) sat=18 → R>G>B = 黄パターン
 *     SOL: RGB(72,83,79) sat=11 → G>R≒B = グレー/ティール
 */
function _classifyChainColor({ r, g, b }) {
  const sat = Math.max(r, g, b) - Math.min(r, g, b);

  // ── 色パターンを先にチェック（オーバーレイで暗くなっても判別可能） ──

  // BNB：黄色系（R最大・G中・B最小、R-B差がある）
  // オーバーレイ越し: RGB(81,78,63) sat=18 → R>G>B, R-B=18
  // 通常: RGB(243,197,60) sat=183
  if (r > g && g > b && r - b > 12 && sat > 8) return 'BNB';

  // POL：紫系（B最大 or B>G かつ R>G）
  // オーバーレイ越し: RGB(51,39,73) sat=34 → B>R>G
  // 通常: RGB(144,99,205) sat=106
  if (b > g && r > g && sat > 10) return 'POL';

  // SOL：ティール緑（G最大・Gが突出）
  if (g > r && g > b && g > 100 && g - r > 40) return 'SOL';

  // ── 彩度が非常に低い → SOL（SOLアイコンはグレー） ──
  return 'SOL';
}

/**
 * App.js側から呼ぶ（mystery_box_open の needs_pixel_scan=true 時）
 *
 * @param {string} uri          - MB結果画像のURI
 * @param {number[]} counts     - OCRで取得した個数リスト（例: [10, 5, 1]）
 * @returns {RewardItem[]}      - 判別結果（App.js側で確認画面に表示）
 */
/**
 * ✅ v3.4.0修正:
 *   ① iconCropを中央20%×高さ30%に絞り、オレンジグロー枠の混入を排除
 *   ② 2行目スロット（y=78-88%, x=16%）に対応（ミンスク等の4つ目アイテム）
 */
export async function getMbRewardItems(uri, counts = []) {
  try {
    const imgInfo = await ImageManipulator.manipulateAsync(uri, [], {
      format: ImageManipulator.SaveFormat.PNG,
    });
    const imgW = imgInfo.width;
    const imgH = imgInfo.height;

    console.log('[pixel] getMbRewardItems start, size:', imgW, 'x', imgH);

    // ── 1行目スロット（最大3つ） ──
    const row1yStart = Math.round(imgH * 0.60);
    const row1yEnd   = Math.round(imgH * 0.73);
    const slotH = row1yEnd - row1yStart;
    const slotW = Math.round(imgW * 0.24);
    const row1xCenters = [0.16, 0.42, 0.68];

    // ── 2行目スロット（4つ目以降・ミンスク等） ──
    const row2yStart = Math.round(imgH * 0.78);
    const row2yEnd   = Math.round(imgH * 0.88);
    const row2xCenters = [0.16];  // 2行目は左端のみ（実測）

    // 全スロット座標を統合
    const allSlots = [];
    for (const xp of row1xCenters) {
      allSlots.push({ xCenter: xp, yStart: row1yStart, yEnd: row1yEnd });
    }
    for (const xp of row2xCenters) {
      allSlots.push({ xCenter: xp, yStart: row2yStart, yEnd: row2yEnd });
    }

    const results = [];

    for (let i = 0; i < allSlots.length; i++) {
      const slot = allSlots[i];
      const sH = slot.yEnd - slot.yStart;
      const centerX = Math.round(imgW * slot.xCenter);
      const cropX = Math.max(0, centerX - Math.round(slotW / 2));
      const cropY = slot.yStart;
      const cropW = Math.min(slotW, imgW - cropX);
      const cropH = Math.min(sH, imgH - cropY);

      if (cropW <= 0 || cropH <= 0) continue;

      // ─ ジェムアイコン領域（中央40%×高さ40%）
      //   中央スロットのジェム位置ズレに対応するため40%に拡大
      //   slot 0は50%でも正確だった実績あり → 40%なら枠混入を抑えつつ安全
      const iconCrop = {
        originX: cropX + Math.round(cropW * 0.30),
        originY: cropY + Math.round(cropH * 0.18),
        width:   Math.round(cropW * 0.40),
        height:  Math.round(cropH * 0.40),
      };

      const rgb = await _getAverageRgb(uri, iconCrop);
      console.log('[pixel] slot', i, 'iconColor:',
        rgb ? 'RGB(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')' : 'null',
        i >= row1xCenters.length ? '(row2)' : '');

      if (!rgb) continue;

      const brightness = (rgb.r + rgb.g + rgb.b) / 3;

      // 暗すぎる → 空スロットかLoot Box → この行は終了
      if (brightness < 50) {
        console.log('[pixel] slot', i, '→ empty (dark)');
        if (i < row1xCenters.length) break;  // 1行目で空なら終了
        continue;  // 2行目で空なら次を確認
      }

      // ── 2行目スロットはミンスク/Loot Boxのみ（STEPNの仕様）──
      // ジェムは必ず1行目に出るため、2行目はアイテム種別を色判定せずscrollとして扱う
      const isRow2 = i >= row1xCenters.length;
      if (isRow2) {
        // 暗すぎる（空スロット）はスキップ
        if (brightness < 80) {
          console.log('[pixel] slot', i, '→ empty (row2 dark)');
          continue;
        }
        console.log('[pixel] slot', i, '→ scroll (row2固定)');
        results.push({ item_type: 'scroll', gem_color: null, gem_level: null, quantity: counts[i] ?? 1 });
        continue;
      }

      const itemType = _classifyMbSlot(rgb);
      console.log('[pixel] slot', i, '→', itemType);

      if (itemType === 'empty') {
        if (i < row1xCenters.length) break;
        continue;
      }

      if (itemType === 'scroll') {
        results.push({ item_type: 'scroll', gem_color: null, gem_level: null, quantity: 1 });
        continue;
      }

      // ジェムLv判定（形状ベース）
      const gemLevel = await _classifyGemLevel(uri, iconCrop);
      const quantity = counts[i] ?? 1;

      console.log('[pixel] slot', i, '→ gem:', itemType, 'Lv' + gemLevel, 'x' + quantity);

      results.push({
        item_type: 'gem',
        gem_color: itemType,
        gem_level: gemLevel,
        quantity,
      });
    }

    console.log('[pixel] getMbRewardItems result:', JSON.stringify(results));
    return results;
  } catch (err) {
    console.warn('[pixel] getMbRewardItems error:', err);
    return [];
  }
}

// ─────────────────────────────────────────
// ピクセル解析 内部ユーティリティ
// ─────────────────────────────────────────

/**
 * 指定クロップ領域の平均RGB値を取得する
 * 
 * ✅ v3.3.1修正: 1x1 → 4x1 にリサイズ
 *   Android の expo-image-manipulator が 1x1 リサイズで
 *   グレースケールPNGを出力する問題を回避する
 *   高さ1行なのでPNGフィルタバイトの処理が単純で信頼性が高い
 */
async function _getAverageRgb(uri, crop) {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        { crop },
        { resize: { width: 4, height: 1 } },
      ],
      { format: ImageManipulator.SaveFormat.PNG, base64: true },
    );

    return _parsePngRow(result.base64, 4);
  } catch (e) {
    console.warn('[pixel] _getAverageRgb error:', e);
    return null;
  }
}

/**
 * 指定クロップ領域の「最大彩度ピクセル」のRGBを返す
 * getChainSuggestion 専用（_getAverageRgb の代替）
 *
 * ✅ v3.2.3: PNG自力パース → _getAverageRgb 6点サンプリング方式に変更
 *   理由：RN環境で pako.inflate(IDAT) が正常動作しないため
 *   クロップ内を 3列×2行 の6点でサンプリングし、最大彩度の点を採用する
 *   赤アノテーション（R>180 かつ R>G×2.0 かつ R>B×1.8）は除外する
 */
async function _getMaxSaturationRgb(uri, crop) {
  try {
    const { originX, originY, width, height } = crop;

    // サンプル小領域のサイズ（クロップ幅の約18%）
    const sw = Math.max(4, Math.round(width  * 0.18));
    const sh = Math.max(4, Math.round(height * 0.20));

    // 3列 × 2行 = 6点サンプリング
    const xPcts = [0.2, 0.5, 0.8];
    const yPcts = [0.35, 0.65];

    let maxSat = -1;
    let best   = null;

    for (const yp of yPcts) {
      for (const xp of xPcts) {
        const sampleCrop = {
          originX: Math.max(0, Math.round(originX + width  * xp - sw / 2)),
          originY: Math.max(0, Math.round(originY + height * yp - sh / 2)),
          width:   sw,
          height:  sh,
        };

        const rgb = await _getAverageRgb(uri, sampleCrop);
        if (!rgb) continue;

        const { r, g, b } = rgb;
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        console.log(`[DEBUG] _getMaxSat (xp=${xp},yp=${yp}): RGB(${r},${g},${b}) sat=${sat}`);

        // 赤アノテーション除外
        if (r > 180 && r > g * 2.0 && r > b * 1.8) {
          console.log('[DEBUG] _getMaxSat: 赤アノテ除外');
          continue;
        }

        if (sat > maxSat) { maxSat = sat; best = { r, g, b }; }
      }
    }

    console.log('[DEBUG] _getMaxSat best:', JSON.stringify(best), 'maxSat:', maxSat);
    return best;
  } catch (e) {
    console.warn('[VisionAnalyzer] _getMaxSaturationRgb error:', e);
    return null;
  }
}

/**
 * PNG の 幅Wx高さ1 のBase64文字列から平均RGBを取得する
 *
 * ✅ v3.3.2: Subフィルタ(type=1)の累積復元バグを修正
 *   IHDRのカラータイプ対応（グレースケール/RGB/RGBA）
 */
function _parsePngRow(base64, expectedW) {
  try {
    const buf = Buffer.from(base64, 'base64');

    if (buf.length < 30 || buf[0] !== 0x89 || buf[1] !== 0x50) {
      return null;
    }

    // IHDR からカラータイプを読み取る（buf[25]）
    let colorType = 2;
    if (buf.slice(12, 16).toString('ascii') === 'IHDR' && buf.length > 25) {
      colorType = buf[25];
    }

    // bytes per pixel
    const bpp = (colorType === 0) ? 1
              : (colorType === 4) ? 2
              : (colorType === 6) ? 4
              : 3;

    // IDAT チャンクを探す
    let pos = 8;
    while (pos < buf.length - 12) {
      const chunkLen  = buf.readUInt32BE(pos);
      const chunkType = buf.slice(pos + 4, pos + 8).toString('ascii');

      if (chunkType === 'IDAT') {
        const compressed = buf.slice(pos + 8, pos + 8 + chunkLen);
        const inflated = pako.inflate(compressed);

        const filterByte = inflated[0];
        const rowDataLen = expectedW * bpp;

        // ── ピクセル復元（フィルタタイプに応じて） ──
        const recon = new Uint8Array(rowDataLen);
        for (let i = 0; i < rowDataLen; i++) {
          const raw = inflated[1 + i] || 0;
          let prev = 0;

          if (filterByte === 1 && i >= bpp) {
            // Sub: 左のピクセルの復元済み値を加算
            prev = recon[i - bpp];
          }
          // filter 0 (None) は prev=0 のまま → raw がそのまま使われる
          recon[i] = (raw + prev) & 0xFF;
        }

        // ── 全ピクセルの平均RGB計算 ──
        let totalR = 0, totalG = 0, totalB = 0, count = 0;
        for (let i = 0; i < expectedW; i++) {
          const off = i * bpp;
          if (off >= recon.length) break;

          if (colorType === 0 || colorType === 4) {
            const gray = recon[off];
            totalR += gray; totalG += gray; totalB += gray;
          } else {
            totalR += recon[off];
            totalG += recon[off + 1];
            totalB += recon[off + 2];
          }
          count++;
        }

        if (count === 0) return null;
        const result = {
          r: Math.round(totalR / count),
          g: Math.round(totalG / count),
          b: Math.round(totalB / count),
        };
        console.log('[pixel] parsePngRow:', JSON.stringify(result),
          'cType:', colorType, 'filter:', filterByte);
        return result;
      }
      pos += 4 + 4 + chunkLen + 4;
    }
    return null;
  } catch (e) {
    console.warn('[pixel] _parsePngRow error:', e.message);
    return null;
  }
}


/**
 * RGB値からMBスロットのアイテム種類を判別する
 */
/**
 * ✅ v3.3.3修正: 色パターン（相対比較）方式に変更
 *   スロット領域のクロップはジェムアイコン＋白背景を含むため
 *   色が薄まる → 絶対値ではなく R,G,B の大小関係で判定する
 *
 *   実測値（白背景と平均化後）:
 *     efficiency(黄): RGB(149,127,106) → R>G>B, R-B=43
 *     resilience(紫): RGB(183,172,207) → B>R>G, B-G=35
 *     comfort(赤):    RGB(147,141,147) → R≈B>G, sat=6
 *     scroll(灰):     RGB(180,180,180) → sat≈0
 */
function _classifyMbSlot(rgb) {
  const { r, g, b } = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max - min;

  // 暗すぎる → 空スロット
  if (max < 70) return 'empty';

  // ── 色パターン判定（薄くても相対関係で判別可能）──

  // Efficiency（黄/金）: R最大・B最小・差が大きい
  // 実測: RGB(149,127,106) R-B=43 / ミンスク: RGB(145,127,106) R-B=39
  // ミンスク誤判定防止のため閾値を30に厳しくする
  if (r > g && g > b && r - b > 30) return 'efficiency';

  // Luck（水色/シアン）: G と B が高く R が低い
  if (g > r && b > r && (g + b) / 2 - r > 25) return 'luck';

  // Resilience（紫）: B最大・G最小
  // 実測: RGB(183,172,207) B-G=35
  if (b > r && b > g && b - g > 8) return 'resilience';

  // Comfort（赤）: R が G 以上かつ中程度の明るさ
  // 実測: RGB(147,141,147) sat=6 → 非常に薄い
  // 白背景と混ざって R≈B>G になる
  if (r > b && r >= g && sat > 5 && max < 210 && max > 80) return 'comfort';

  // 彩度がほぼゼロ → ミンスク or 未判別
  // scroll(ミンスク): 低彩度グレー OR 暖色低彩度（巻物の茶色系）
  if (sat <= 8) return 'scroll';
  // 暖色低彩度のミンスク: R>G>B だが彩度が低い（R-B < 30 の場合）
  if (r > g && g > b && r - b < 30 && sat < 25) return 'scroll';

  return 'unknown';
}

/**
 * ジェムのLvを形状（三角 vs 菱形）で判別する
 *
 * ✅ v3.4.1修正: 上部と下部の輝度差で判定
 *   三角(Lv1): 下部は白背景のみ → 下部輝度 > 上部輝度
 *   小ダイヤ(Lv2): 下部にジェムの下半分 → 下部輝度 ≈ 上部輝度
 *   大ダイヤ(Lv3): ダイヤ全体が大きい → 上部も下部も暗い（ジェム色濃い）
 */
async function _classifyGemLevel(uri, iconCrop) {
  try {
    // 上部40%（ジェムアイコンの上半分）
    const upperCrop = {
      originX: iconCrop.originX,
      originY: iconCrop.originY,
      width:   iconCrop.width,
      height:  Math.round(iconCrop.height * 0.40),
    };

    // 下部30%（ジェムアイコンの下部）
    const lowerCrop = {
      originX: iconCrop.originX,
      originY: iconCrop.originY + Math.round(iconCrop.height * 0.65),
      width:   iconCrop.width,
      height:  Math.round(iconCrop.height * 0.30),
    };

    const [rgbU, rgbL] = await Promise.all([
      _getAverageRgb(uri, upperCrop),
      _getAverageRgb(uri, lowerCrop),
    ]);

    if (!rgbU || !rgbL) return 1;

    const briU = (rgbU.r + rgbU.g + rgbU.b) / 3;
    const briL = (rgbL.r + rgbL.g + rgbL.b) / 3;
    const diff = briL - briU;  // 正=下部が明るい, 負=上部が明るい

    console.log('[pixel] gemLevel briU=' + Math.round(briU) +
      ' briL=' + Math.round(briL) + ' diff=' + Math.round(diff));

    // 三角(Lv1): 下部が明るい（白背景）→ diff > 30
    if (diff > 30) return 1;

    // ── Lv2とLv3の区別：中央部の彩度で判定 ──
    // Lv3（大ダイヤ）: ジェムが大きく中央部の彩度が高い
    // Lv2（小ダイヤ）: ジェムが小さく中央部は白背景が多い
    const midCrop = {
      originX: iconCrop.originX,
      originY: iconCrop.originY + Math.round(iconCrop.height * 0.30),
      width:   iconCrop.width,
      height:  Math.round(iconCrop.height * 0.35),
    };
    const rgbM = await _getAverageRgb(uri, midCrop);
    if (rgbM) {
      const maxM = Math.max(rgbM.r, rgbM.g, rgbM.b);
      const minM = Math.min(rgbM.r, rgbM.g, rgbM.b);
      const satM = maxM - minM;
      console.log('[pixel] gemLevel midSat=' + satM +
        ' RGB(' + rgbM.r + ',' + rgbM.g + ',' + rgbM.b + ')');
      // 中央部の彩度が高い → Lv3（大ダイヤ）
      if (satM > 40) return 3;
    }

    // 小ダイヤ(Lv2): それ以外
    return 2;

  } catch (e) {
    console.warn('[pixel] _classifyGemLevel error:', e.message);
    return 1;
  }
}

function parseVipMembership(text, upper, lines) {
  const warnings = [];
  const extra = {};

  // 有効期限（Due on MM/DD/YYYY）
  const dueM = text.match(/Due\s+on\s+(\d{2}\/\d{2}\/\d{4})/i);
  extra.valid_until = dueM ? dueM[1] : null;
  if (!extra.valid_until) warnings.push('valid_until取得失敗');

  warnings.push('vip_membershipは手動入力専用カテゴリ：金額は別途入力が必要');

  const confidence = extra.valid_until ? 0.7 : 0.4;
  return { gst_amount: 0, gmt_amount: 0, extra, confidence, warnings };
}
