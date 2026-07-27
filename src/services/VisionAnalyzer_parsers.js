/**
 * VisionAnalyzer_parsers.js
 *
 * STEPN 収支管理ツール - カテゴリパーサー群
 * VisionAnalyzer.js から分割（トークン節約のため）
 */

/** ソケット解放コスト → レアリティ逆引きテーブル */
const SOCKET_COST_TO_RARITY = {
  10:  'Common',
  20:  'Uncommon',
  50:  'Rare',
  100: 'Epic',
  200: 'Legendary',
};

/** MBレベル → 品質変換テーブル */
const MB_LEVEL_TO_QUALITY = {
  1: 'Damaged',    2: 'Refurbished', 3: 'Common',
  4: 'Uncommon',   5: 'Rare',        6: 'Epic',
  7: 'Legendary',  8: 'Enchanted',   9: 'Master',
  10: 'Satoshi',
};

function runParser(category, text, upper, lines, chain) {
  switch (category) {
    case 'move_result':             return parseMoveResult(text, upper, lines);
    case 'repair_hp':               return parseRepairHp(text, upper, lines);
    case 'repair_durability':       return parseRepairDurability(text, upper, lines);
    case 'level_up':                return parseLevelUp(text, upper, lines);
    case 'socket_unlock':           return parseSocketUnlock(text, upper, lines);
    case 'gem_upgrade_confirm':     return parseGemUpgradeConfirm(text, upper, lines);
    case 'gem_upgrade_success':     return parseGemUpgradeSuccess(text, upper, lines);
    case 'gem_upgrade_fail':        return parseGemUpgradeFail(text, upper, lines);
    case 'shoe_mint_cost':          return parseShoeMintCost(text, upper, lines);
    case 'shoe_mint_result':        return parseShoeMintResult(text, upper, lines);
    case 'shoe_enhance':            return parseShoeEnhance(text, upper, lines);
    case 'mystery_box_open':        return parseMysteryBoxOpen(text, upper, lines);
    case 'spending_withdraw':       return parseSpendingWithdraw(text, upper, lines);
    case 'spending_deposit':        return parseSpendingDeposit(text, upper, lines);
    case 'marketplace_buy':         return parseMarketplaceBuy(text, upper, lines);
    case 'marketplace_listing':     return parseMarketplaceListing(text, upper, lines);
    case 'success_rate_increment':  return parseSuccessRateIncrement(text, upper, lines);
    case 'point_redistribution':    return parsePointRedistribution(text, upper, lines);
    case 'home':                    return parseHome(text, upper, lines);
    case 'vip_membership':          return parseVipMembership(text, upper, lines);
    default:
      return { confidence: 0, warnings: ['カテゴリ判定不可'] };
  }
}

// ─────────────────────────────────────────
// ユーティリティ関数
// ─────────────────────────────────────────

/** "1,234.56 GST" → 1234.56 */
function extractNumber(str) {
  if (!str) return null;
  const m = str.replace(/,/g, '').match(/[\d]+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

/** テキストから最初の数値を返す */
function firstNum(str) {
  const m = str.replace(/,/g, '').match(/[\d]+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

/** "XXX GST" パターンから数値を返す */
function extractGst(text) {
  const m = text.replace(/,/g, '').match(/([\d]+(?:\.\d+)?)\s*GST/i);
  return m ? parseFloat(m[1]) : null;
}

/** "XXX GMT" パターンから数値を返す */
function extractGmt(text) {
  const m = text.replace(/,/g, '').match(/([\d]+(?:\.\d+)?)\s*GMT/i);
  return m ? parseFloat(m[1]) : null;
}

/** 靴ID（#XXXXX or GXXXXX）を抽出 */
function extractShoeId(text) {
  const m = text.match(/#\s*(\d+)|G\s*(\d+)/);
  if (!m) return null;
  return m[1] ? `#${m[1]}` : `G${m[2]}`;
}

/** Genesis靴かどうか */
function isGenesis(shoeId) {
  return shoeId ? shoeId.startsWith('G') : false;
}

/** makeResult ヘルパー */
function makeResult(fields) {
  return {
    success:             false,
    confidence:          0,
    category:            'unknown',
    type:                'info',
    gst_amount:          0,
    gmt_amount:          0,
    chain:               null,
    needs_chain_confirm: false,
    extra:               {},
    warnings:            [],
    rawText:             '',
    ...fields,
  };
}

// ─────────────────────────────────────────
// 各カテゴリのパーサー
// ─────────────────────────────────────────

// ── 1. move_result ──────────────────────
function parseMoveResult(text, upper, lines) {
  const warnings = [];
  const extra = {};

  // アーンモード
  const isGst = upper.includes('GST/MIN');
  const isGmt = upper.includes('GMT/MIN');
  extra.earn_mode = isGmt ? 'GMT' : 'GST';

  // 獲得量（+の直後の数値・最後のものを取る）
  const plusMatches = [...text.matchAll(/\+\s*([\d,]+(?:\.\d+)?)/g)];
  const earnAmount = plusMatches.length
    ? parseFloat(plusMatches[plusMatches.length - 1][1].replace(/,/g, ''))
    : null;
  extra.earn_amount = earnAmount;
  if (!earnAmount) warnings.push('earn_amount取得失敗');

  // 日時（DD/MM/YYYY HH:MM形式）
  const dateM = text.match(/(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/);
  if (dateM) extra.move_date = dateM[1];

  // 時間（HH:MM:SS）
  const durM = text.match(/(\d{2}:\d{2}:\d{2})/);
  if (durM) extra.duration = durM[1];

  // 距離（Kmラベル付近）
  const kmM = text.match(/([\d.]+)\s*Km/i);
  if (kmM) extra.distance_km = parseFloat(kmM[1]);

  // EN消費（- X.X パターン）
  const enM = text.match(/-\s*([\d.]+)\s*(?:EN)?/);
  if (enM) extra.en_used = parseFloat(enM[1]);

  // MB取得フラグ
  extra.mb_obtained = !upper.includes('YOUR SLOTS ARE FULL');
  if (extra.mb_obtained) {
    extra.mb_level = null; // App.js側でユーザー手動入力
    extra.mb_quality = null;
  }

  const confidence = earnAmount ? 1.0 : 0.4;
  return {
    gst_amount: isGst ? (earnAmount ?? 0) : 0,
    gmt_amount: isGmt ? (earnAmount ?? 0) : 0,
    extra, confidence, warnings,
  };
}

// ── 2. repair_hp ────────────────────────
function parseRepairHp(text, upper, lines) {
  const warnings = [];
  const extra = {};

  // GSTコスト（Token consumption 優先）
  let gstCost = null;
  const tokenM = text.match(/Token\s+consumption\s+([\d,]+(?:\.\d+)?)\s*GST/i);
  if (tokenM) {
    gstCost = parseFloat(tokenM[1].replace(/,/g, ''));
  } else {
    gstCost = extractGst(text);
  }
  if (!gstCost) warnings.push('gst_cost取得失敗');

  // HP変化（XX.XX% > YY.YY%）
  const hpM = text.match(/([\d.]+)\s*%\s*[>→]\s*([\d.]+)\s*%/);
  if (hpM) {
    extra.hp_before = parseFloat(hpM[1]);
    extra.hp_after  = parseFloat(hpM[2]);
  } else {
    warnings.push('HP変化取得失敗');
  }

  // HP増加量（+X.XX%）
  const hpGainM = text.match(/\+\s*([\d.]+)\s*%/);
  if (hpGainM) extra.hp_gained = parseFloat(hpGainM[1]);

  // 靴ID
  const shoeId = extractShoeId(text);
  if (shoeId) {
    extra.shoe_id   = shoeId;
    extra.is_genesis = isGenesis(shoeId);
  }

  const confidence = (gstCost && hpM) ? 1.0 : gstCost ? 0.7 : 0.4;
  return { gst_amount: gstCost ?? 0, gmt_amount: 0, extra, confidence, warnings };
}

// ── 3. repair_durability ────────────────
function parseRepairDurability(text, upper, lines) {
  const warnings = [];
  const extra = {};

  // GSTコスト
  const gstCost = extractGst(text);
  if (!gstCost) warnings.push('gst_cost取得失敗');

  // Durability値（Durability:XX/100）
  const durM = text.match(/Durability\s*:\s*(\d+)\s*\/\s*100/i);
  if (durM) {
    extra.durability_before = parseInt(durM[1], 10);
    extra.durability_after  = 100;
  } else {
    warnings.push('Durability値取得失敗');
  }

  // 靴ID
  const shoeId = extractShoeId(text);
  if (shoeId) {
    extra.shoe_id    = shoeId;
    extra.is_genesis = isGenesis(shoeId);
  }

  const confidence = (gstCost && durM) ? 1.0 : gstCost ? 0.7 : 0.4;
  return { gst_amount: gstCost ?? 0, gmt_amount: 0, extra, confidence, warnings };
}

// ── 4. level_up ─────────────────────────
function parseLevelUp(text, upper, lines) {
  const warnings = [];
  const extra = {};

  // アップ後レベル（Level up to LvX）
  const lvM = text.match(/Level\s+up\s+to\s+Lv\s*(\d+)/i)
           || text.match(/Lv\s*(\d+)/i)
           || text.match(/Ly\s*(\d+)/i); // 誤認識対応
  const levelAfter = lvM ? parseInt(lvM[1], 10) : null;
  if (levelAfter) extra.level_after = levelAfter;
  else warnings.push('level_after取得失敗');

  // コスト3パターン判定
  const gstCost = extractGst(text) ?? 0;
  const gmtCost = extractGmt(text) ?? 0;

  // 待機時間（XXX mins）
  const waitM = text.match(/(\d+)\s*mins/i);
  if (waitM) extra.wait_mins = parseInt(waitM[1], 10);

  const confidence = levelAfter ? 1.0 : 0.4;
  return { gst_amount: gstCost, gmt_amount: gmtCost, extra, confidence, warnings };
}

// ── 5. socket_unlock ────────────────────
function parseSocketUnlock(text, upper, lines) {
  const warnings = [];
  const extra = {};

  // socket_type判別（タイトルの先頭ワード）
  let socketType = null;
  if (upper.includes('EFFICIENCY SOCKET')) socketType = 'efficiency';
  else if (upper.includes('LUCK SOCKET'))  socketType = 'luck';
  else if (upper.includes('COMFORT SOCKET')) socketType = 'comfort';
  else if (upper.includes('RESILIENCE SOCKET')) socketType = 'resilience';
  extra.socket_type = socketType;
  if (!socketType) warnings.push('socket_type判別失敗');

  // GSTコスト（OPENボタンの数値）
  const gstCost = extractGst(text);
  if (!gstCost) warnings.push('gst_cost取得失敗');

  // shoe_rarity（gst_costからテーブル逆引き）
  if (gstCost) {
    extra.shoe_rarity = SOCKET_COST_TO_RARITY[gstCost] ?? null;
  }
  extra.shoe_id = null; // ポップアップに隠れて取得不可

  const confidence = (gstCost && socketType) ? 1.0 : 0.4;
  return { gst_amount: gstCost ?? 0, gmt_amount: 0, extra, confidence, warnings };
}

// ── 6. gem_upgrade_confirm（CONFIRM画面のみ・結果不明） ──
function parseGemUpgradeConfirm(text, upper, lines) {
  const warnings = [];
  const extra = {};

  // コスト
  const gstCost = extractGst(text) ?? 0;
  const gmtCost = extractGmt(text) ?? 0;
  if (!gstCost && !gmtCost) warnings.push('コスト取得失敗');

  // Rainbow Gem Chance
  extra.rainbow_gem_chance = upper.includes('RAINBOW GEM CHANCE: ON');

  // 結果は不明（App.js側でユーザーに確認する）
  extra.result = 'pending';
  warnings.push('結果画面未取込：App.js側でユーザー確認が必要');

  const confidence = (gstCost || gmtCost) ? 0.7 : 0.4;
  return { gst_amount: gstCost, gmt_amount: gmtCost, extra, confidence, warnings };
}

// ── 7. gem_upgrade_success ──────────────
function parseGemUpgradeSuccess(text, upper, lines) {
  const warnings = [];
  const extra = {};

  // gem_type（"Comfortability Gem" 等）
  let gemType = null;
  if (/Comfortability\s+Gem/i.test(text)) gemType = 'comfort';
  else if (/Luck\s+Gem/i.test(text))      gemType = 'luck';
  else if (/Efficiency\s+Gem/i.test(text)) gemType = 'efficiency';
  else if (/Resilience\s+Gem/i.test(text)) gemType = 'resilience';
  extra.gem_type = gemType;
  if (!gemType) warnings.push('gem_type判別失敗');

  // アップ後ジェムLv（"Lv 2" 形式）
  const lvM = text.match(/Lv\s*(\d+)/i);
  const levelAfter = lvM ? parseInt(lvM[1], 10) : null;
  extra.level_after  = levelAfter;
  extra.level_before = levelAfter ? levelAfter - 1 : null;
  if (!levelAfter) warnings.push('level_after取得失敗');

  // Rainbow Gem チェック（結果画面で虹色なら → App.js側で手動確認）
  extra.is_rainbow         = false; // デフォルト false（App.js側で更新可）
  extra.rainbow_gem_level  = null;
  extra.rainbow_gem_chance = upper.includes('RAINBOW GEM CHANCE: ON');

  // コスト（CONFIRM画面とセットで取り込む場合は引き継ぎ済み・ここでは参考取得）
  const gstCost = extractGst(text) ?? 0;
  const gmtCost = extractGmt(text) ?? 0;

  const confidence = (gemType && levelAfter) ? 1.0 : 0.7;
  return { gst_amount: gstCost, gmt_amount: gmtCost, extra, confidence, warnings };
}

// ── 8. gem_upgrade_fail ─────────────────
function parseGemUpgradeFail(text, upper, lines) {
  const warnings = [];
  const extra = {};

  // VIP特典発動チェック
  extra.vip_kept_gem       = /You\s+kept\s+1\s+Gem/i.test(text);
  extra.rainbow_gem_chance = upper.includes('RAINBOW GEM CHANCE: ON');
  extra.level_before       = null; // 失敗画面からは取れない

  // VIPジェム保持時 → ピクセル解析でジェム色を自動判別
  // App.js側で getKeptGemColor(uri) を呼ぶ
  if (extra.vip_kept_gem) {
    extra.gem_type         = null;  // ピクセル解析後に更新
    extra.needs_pixel_scan = true;  // App.js側へのフラグ
    extra.pixel_scan_type  = 'kept_gem'; // 解析種別を明示
  } else {
    extra.gem_type         = null;  // VIPなし→ジェム消失・記録不要
    extra.needs_pixel_scan = false;
  }

  // コスト（CONFIRM画面とセットで取り込む場合は引き継ぎ済み）
  const gstCost = extractGst(text) ?? 0;
  const gmtCost = extractGmt(text) ?? 0;

  const confidence = 1.0; // "Unsuccessful"で確実に失敗と判定できる
  return { gst_amount: gstCost, gmt_amount: gmtCost, extra, confidence, warnings };
}

// ── 9. shoe_mint_cost ───────────────────
function parseShoeMintCost(text, upper, lines) {
  const warnings = [];
  const extra = {};

  // コスト（Token consumption XXXX GST + XXXX GMT）
  const tokenM = text.match(/Token\s+consumption\s+([\d,]+(?:\.\d+)?)\s*GST\s*\+\s*([\d,]+(?:\.\d+)?)\s*GMT/i);
  let gstCost = 0, gmtCost = 0;
  if (tokenM) {
    gstCost = parseFloat(tokenM[1].replace(/,/g, ''));
    gmtCost = parseFloat(tokenM[2].replace(/,/g, ''));
  } else {
    gstCost = extractGst(text) ?? 0;
    gmtCost = extractGmt(text) ?? 0;
    if (!gstCost) warnings.push('gst_cost取得失敗');
  }

  // 親靴ID（2個）
  const shoeIds = [...text.matchAll(/(#\d+|G\d+)/g)].map((m) => m[1]);
  extra.parent1_id = shoeIds[0] ?? null;
  extra.parent2_id = shoeIds[1] ?? null;
  if (!extra.parent1_id) warnings.push('parent1_id取得失敗');

  // VIPミンスク保持チェック
  extra.vip_scroll_chance = /2%\s+to\s+keep\s+a\s+Minting\s+Scroll/i.test(text);

  // ダブルミント成功率
  const dmM = text.match(/Double\s+mint\s+success\s+rate.*?(\d+(?:\.\d+)?)\s*%/i);
  if (dmM) extra.double_mint_rate = parseFloat(dmM[1]);

  const confidence = (gstCost && gmtCost) ? 1.0 : 0.7;
  return { gst_amount: gstCost, gmt_amount: gmtCost, extra, confidence, warnings };
}

// ── 10. shoe_mint_result ────────────────
function parseShoeMintResult(text, upper, lines) {
  const warnings = [];
  const extra = {};

  // 双子判定（"CLICK TO COLLECT"が2回 or 靴箱が2個）
  const clickCount = (text.match(/CLICK\s+TO\s+COLLECT/gi) || []).length;
  extra.is_twin = clickCount >= 2;

  // 靴箱レアリティ（"XXX sneaker box"）
  const boxMatches = [...text.matchAll(/(Common|Uncommon|Rare|Epic|Legendary)\s+sneaker\s+box/gi)];
  extra.box1_rarity = boxMatches[0]?.[1] ?? null;
  extra.box2_rarity = boxMatches[1]?.[1] ?? null;
  if (!extra.box1_rarity) warnings.push('box_rarity取得失敗');

  // VIPミンスク保持
  extra.vip_kept_scroll = /You\s+kept\s+1\s+Minting\s+Scroll/i.test(text);

  const confidence = extra.box1_rarity ? 1.0 : 0.4;
  return { gst_amount: 0, gmt_amount: 0, extra, confidence, warnings };
}

// ── 11. shoe_enhance ────────────────────
function parseShoeEnhance(text, upper, lines) {
  const warnings = [];
  const extra = {};

  // CONFIRM画面のコスト
  const tokenM = text.match(/Token\s+consumption\s+([\d,]+(?:\.\d+)?)\s*GST.*?([\d,]+(?:\.\d+)?)\s*GMT/is);
  let gstCost = 0, gmtCost = 0;
  if (tokenM) {
    gstCost = parseFloat(tokenM[1].replace(/,/g, ''));
    gmtCost = parseFloat(tokenM[2].replace(/,/g, ''));
  } else {
    gstCost = extractGst(text) ?? 0;
    gmtCost = extractGmt(text) ?? 0;
    if (!gstCost) warnings.push('コスト取得失敗');
  }

  // Rainbow Sneaker Chance
  extra.rainbow_sneaker_chance = upper.includes('RAINBOW SNEAKER CHANCE: ON');

  // 結果画面が取り込まれた場合
  if (upper.includes('CLICK TO COLLECT')) {
    // 新靴ID
    const shoeId = extractShoeId(text);
    if (shoeId) {
      extra.result_shoe_id  = shoeId;
      extra.is_genesis      = isGenesis(shoeId);
    }
    // 靴タイプ
    const typeM = text.match(/\b(Jogger|Walker|Runner|Trainer)\b/i);
    if (typeM) extra.result_shoe_type = typeM[1];

    // 属性値
    const effM  = text.match(/Efficiency\s+([\d.]+)/i);
    const luckM = text.match(/Luck\s+([\d.]+)/i);
    const comM  = text.match(/Comfort\s+([\d.]+)/i);
    const resM  = text.match(/Resilience\s+([\d.]+)/i);
    if (effM)  extra.result_efficiency  = parseFloat(effM[1]);
    if (luckM) extra.result_luck        = parseFloat(luckM[1]);
    if (comM)  extra.result_comfort     = parseFloat(comM[1]);
    if (resM)  extra.result_resilience  = parseFloat(resM[1]);

    // enhance_result（通常/ダブルアップ/レインボー）
    // ※ App.js側でユーザー確認が望ましい
    extra.enhance_result = 'normal'; // デフォルト
  }

  extra.material_shoe_ids = null; // 素材靴スクショ取込はApp.js側で別途処理

  const confidence = (gstCost && gmtCost) ? 1.0 : 0.7;
  return { gst_amount: gstCost, gmt_amount: gmtCost, extra, confidence, warnings };
}

// ── 12. mystery_box_open ────────────────
function parseMysteryBoxOpen(text, upper, lines) {
  const warnings = [];
  const extra = {};

  // MBレベル（"LV 5"）
  const lvM = text.match(/LV\s*(\d+)/i)
           || text.match(/mystery\s+box\s+LV\s*(\d+)/i);
  const mbLevel = lvM ? parseInt(lvM[1], 10) : null;
  extra.mb_level   = mbLevel;
  extra.mb_quality = mbLevel ? (MB_LEVEL_TO_QUALITY[mbLevel] ?? null) : null;
  if (!mbLevel) warnings.push('mb_level取得失敗');

  // MBレアリティ（"Rare mystery box"）
  const rarityM = text.match(/(Damaged|Refurbished|Common|Uncommon|Rare|Epic|Legendary|Enchanted|Master|Satoshi)\s+mystery\s+box/i);
  extra.mb_rarity = rarityM ? rarityM[1] : null;

  // コスト（合計値）
  const totalM = text.replace(/,/g, '').match(/([\d]+(?:\.\d+)?)\s*GST\s+OPEN\s+NOW/i)
              || text.replace(/,/g, '').match(/([\d]+(?:\.\d+)?)\s*GST/i);
  const gstCost = totalM ? parseFloat(totalM[1]) : 0;
  if (!gstCost) warnings.push('gst_cost取得失敗');

  // Base cost / Boosting service 内訳
  const baseM    = text.replace(/,/g, '').match(/Base\s+cost\s*:\s*([\d.]+)\s*GST/i);
  const boostM   = text.replace(/,/g, '').match(/Boosting\s+service\s*:\s*([\d.]+)\s*GST/i);
  extra.base_cost     = baseM  ? parseFloat(baseM[1])  : null;
  extra.boosting_cost = boostM ? parseFloat(boostM[1]) : 0;

  // 開封待ち時間
  const timeM = text.match(/(\d+h\s*\d+min)/i);
  if (timeM) extra.unlock_time = timeM[1];

  // OCRで個数を取得（x3 / x10 等）
  const countMatches = [...text.matchAll(/x\s*(\d+)/gi)].map((m) => parseInt(m[1], 10));
  extra.reward_counts = countMatches.length ? countMatches : null;

  // 獲得アイテム：ピクセル解析はanalyzeScreenshotWithPixel()で別途実行
  // → reward_items は App.js側でgetMbRewardItems()を呼んで設定する
  extra.reward_items       = null;
  extra.needs_pixel_scan   = true; // App.js側へのフラグ

  const confidence = (mbLevel && gstCost) ? 1.0 : mbLevel ? 0.7 : 0.4;
  return { gst_amount: gstCost, gmt_amount: 0, extra, confidence, warnings };
}

// ── 13. spending_withdraw ───────────────
function parseSpendingWithdraw(text, upper, lines) {
  const warnings = [];
  const extra = {};

  // 送金額とトークン種別（You will transfer XXXX TOKEN）
  const transferM = text.replace(/,/g, '').match(/You\s+will\s+transfer\s+([\d.]+)\s*(GST|GMT)/i);
  const transferAmount = transferM ? parseFloat(transferM[1]) : null;
  const transferToken  = transferM ? transferM[2].toUpperCase() : null;
  extra.transfer_amount = transferAmount;
  extra.transfer_token  = transferToken;
  if (!transferAmount) warnings.push('transfer_amount取得失敗');

  // 手数料（Fee XXX GST）※変動・必ずOCRから読む
  const feeM = text.replace(/,/g, '').match(/Fee\s+([\d.]+)\s*(GST|GMT|SOL|BNB|POL)/i);
  extra.fee_amount = feeM ? parseFloat(feeM[1]) : null;
  extra.fee_token  = feeM ? feeM[2].toUpperCase() : null;
  if (!extra.fee_amount) warnings.push('fee_amount取得失敗（手数料は変動）');

  extra.from_wallet = 'Spending';
  extra.to_wallet   = 'Wallet';

  const gstAmount = (transferToken === 'GST') ? (transferAmount ?? 0) : 0;
  const gmtAmount = (transferToken === 'GMT') ? (transferAmount ?? 0) : 0;

  const confidence = (transferAmount && extra.fee_amount) ? 1.0 : 0.7;
  return { gst_amount: gstAmount, gmt_amount: gmtAmount, extra, confidence, warnings };
}

// ── 14. spending_deposit ────────────────
function parseSpendingDeposit(text, upper, lines) {
  const warnings = [];
  const extra = {};

  // 送金額とトークン種別
  const transferM = text.replace(/,/g, '').match(/You\s+will\s+transfer\s+([\d.]+)\s*(GST|GMT)/i);
  const transferAmount = transferM ? parseFloat(transferM[1]) : null;
  const transferToken  = transferM ? transferM[2].toUpperCase() : null;
  extra.transfer_amount = transferAmount;
  extra.transfer_token  = transferToken;
  if (!transferAmount) warnings.push('transfer_amount取得失敗');

  // 手数料（ネイティブトークン）
  const feeM = text.replace(/,/g, '').match(/Fee\s*[≈~]?\s*([\d.]+)\s*(SOL|BNB|POL|GST|GMT)/i);
  extra.fee_amount = feeM ? parseFloat(feeM[1]) : null;
  extra.fee_token  = feeM ? feeM[2].toUpperCase() : null;
  if (!extra.fee_amount) warnings.push('fee_amount取得失敗');

  // アカウント（メールアドレス）→ 即破棄（記録しない）
  // extra に account を入れないことで対応済み

  extra.from_wallet = 'Wallet';
  extra.to_wallet   = 'Spending';

  const gstAmount = (transferToken === 'GST') ? (transferAmount ?? 0) : 0;
  const gmtAmount = (transferToken === 'GMT') ? (transferAmount ?? 0) : 0;

  const confidence = (transferAmount && extra.fee_amount) ? 1.0 : 0.7;
  return { gst_amount: gstAmount, gmt_amount: gmtAmount, extra, confidence, warnings };
}

// ── 15. marketplace_buy ─────────────────
function parseMarketplaceBuy(text, upper, lines) {
  const warnings = [];
  const extra = {};

  // item_type判別（優先順）
  let itemType = 'badge';
  if (/Walker|Jogger|Runner|Trainer/i.test(text)) itemType = 'sneaker';
  else if (/minting\s+scroll/i.test(text))        itemType = 'scroll';
  else if (/Gem\s*\(Lv\.\s*\d+\)/i.test(text))   itemType = 'gem';
  extra.item_type = itemType;

  // 価格（Cost: XXXXX GMT）
  const costM = text.replace(/,/g, '').match(/Cost\s*:\s*([\d.]+)\s*GMT/i);
  const gmtCost = costM ? parseFloat(costM[1]) : (extractGmt(text) ?? 0);
  if (!gmtCost) warnings.push('price_gmt取得失敗');

  // item_type別フィールド
  if (itemType === 'sneaker') {
    const shoeId = extractShoeId(text);
    extra.shoe_id    = shoeId;
    extra.is_genesis = isGenesis(shoeId);
    const typeM = text.match(/\b(Jogger|Walker|Runner|Trainer)\b/i);
    extra.shoe_type = typeM ? typeM[1] : null;
    const lvM = text.match(/Level\s*:\s*(\d+)/i);
    extra.shoe_level = lvM ? parseInt(lvM[1], 10) : null;
  } else if (itemType === 'gem') {
    const lvM = text.match(/Gem\s*\(Lv\.\s*(\d+)\)/i);
    extra.gem_level = lvM ? parseInt(lvM[1], 10) : null;
    const attrM = text.match(/\+([\d]+)\s*(Luck|Efficiency|Comfort|Resilience)/i);
    if (attrM) {
      extra.gem_type      = attrM[2].toLowerCase();
      extra.gem_attribute = parseInt(attrM[1], 10);
    }
  } else if (itemType === 'scroll') {
    const rarityM = text.match(/(Common|Uncommon|Rare|Epic|Legendary)\s+minting\s+scroll/i);
    extra.scroll_rarity = rarityM ? rarityM[1] : null;
  }

  const confidence = (gmtCost && itemType !== 'badge') ? 1.0 : 0.7;
  return { gst_amount: 0, gmt_amount: gmtCost, extra, confidence, warnings };
}

// ── 16. marketplace_listing ─────────────
function parseMarketplaceListing(text, upper, lines) {
  const warnings = [];
  const extra = {};

  // item_type判別
  let itemType = 'badge';
  if (/minting\s+scroll/i.test(text))             itemType = 'scroll';
  else if (/Gem\s*\(Lv\.\s*\d+\)/i.test(text))   itemType = 'gem';
  else if (/Efficiency|Luck|Comfort|Resilience/i.test(text)) itemType = 'sneaker';
  extra.item_type = itemType;

  // 価格（XXXXX GMT）
  const priceM = text.replace(/,/g, '').match(/Price\s+([\d.]+)\s*GMT/i)
              || text.replace(/,/g, '').match(/([\d]+(?:\.\d+)?)\s*GMT/i);
  extra.price_gmt = priceM ? parseFloat(priceM[1]) : null;
  if (!extra.price_gmt) warnings.push('price_gmt取得失敗');

  // 出品日
  const dateM = text.match(/Date\s+(\d{4}-\d{2}-\d{2})/i)
             || text.match(/(\d{4}-\d{2}-\d{2})/);
  extra.listing_date = dateM ? dateM[1] : null;
  if (!extra.listing_date) warnings.push('listing_date取得失敗');

  // 靴IDなど
  if (itemType === 'sneaker') {
    const shoeId = extractShoeId(text);
    extra.shoe_id    = shoeId;
    extra.is_genesis = isGenesis(shoeId);
  } else if (itemType === 'gem') {
    const lvM = text.match(/Gem\s*\(Lv\.\s*(\d+)\)/i);
    extra.gem_level = lvM ? parseInt(lvM[1], 10) : null;
  } else if (itemType === 'scroll') {
    const rarityM = text.match(/(Common|Uncommon|Rare|Epic|Legendary)\s+minting\s+scroll/i);
    extra.scroll_rarity = rarityM ? rarityM[1] : null;
  }

  const confidence = (extra.price_gmt) ? 0.9 : 0.4;
  return { gst_amount: 0, gmt_amount: 0, extra, confidence, warnings };
}

// ── 17. success_rate_increment ──────────
function parseSuccessRateIncrement(text, upper, lines) {
  const warnings = [];
  const extra = {};

  // rate_type判別
  let rateType = null;
  if (upper.includes('DOUBLE MINT'))        rateType = 'double_mint';
  else if (upper.includes('GEM UPGRADE'))   rateType = 'gem_upgrade';
  else if (upper.includes('HIGHER QUALITY')) rateType = 'higher_quality_sneaker';
  extra.rate_type = rateType;
  if (!rateType) warnings.push('rate_type判別失敗');

  // GMTコスト
  const gmtCost = extractGmt(text) ?? 0;
  if (!gmtCost) warnings.push('gmt_cost取得失敗');

  // アップ後レベル
  const lvM = text.match(/Lv\s*(\d+)/i);
  extra.level_after  = lvM ? parseInt(lvM[1], 10) : null;
  extra.level_before = extra.level_after ? extra.level_after - 1 : null;

  const confidence = (gmtCost && rateType) ? 1.0 : 0.7;
  return { gst_amount: 0, gmt_amount: gmtCost, extra, confidence, warnings };
}

// ── 18. point_redistribution ────────────
function parsePointRedistribution(text, upper, lines) {
  const warnings = [];
  const extra = {};

  // GMTコスト（Token Consumption XXX GMT）
  const gmtCost = extractGmt(text) ?? 0;
  if (!gmtCost) warnings.push('gmt_cost取得失敗');

  // 振り直しポイント数（Point Re-distribution 100）
  const ptM = text.match(/Point\s+Re-?distribution\s+(\d+)/i);
  extra.points_redistributed = ptM ? parseInt(ptM[1], 10) : null;
  if (!extra.points_redistributed) warnings.push('points_redistributed取得失敗');

  // 1ポイントあたりコスト（算出）
  if (gmtCost && extra.points_redistributed) {
    extra.gmt_per_point = parseFloat((gmtCost / extra.points_redistributed).toFixed(2));
  }

  // スライダー最大値
  const sliderM = text.match(/(\d+)\s*$|\b240\b/);
  if (sliderM) extra.max_points = parseInt(sliderM[1] ?? sliderM[0], 10);

  const confidence = (gmtCost && extra.points_redistributed) ? 1.0 : 0.7;
  return { gst_amount: 0, gmt_amount: gmtCost, extra, confidence, warnings };
}

// ── 19. home ────────────────────────────
function parseHome(text, upper, lines) {
  const warnings = [];
  const extra = {};

  // ヘッダー残高（最初の2つの大きい数値）
  const balanceMatches = [...text.replace(/,/g, '').matchAll(/\b(\d{1,6}(?:\.\d{1,2})?)\b/g)]
    .map((m) => parseFloat(m[1]))
    .filter((n) => n > 0);
  extra.gst_balance = balanceMatches[0] ?? null;
  extra.gmt_balance = balanceMatches[1] ?? null;
  if (!extra.gst_balance) warnings.push('残高取得失敗');

  // earn_mode（STARTボタン右のトグル）
  // GMTトグルがゴールド → テキストに "GMT" が隣接している場合
  const isGmtMode = upper.includes('GMT') &&
    (text.includes('108') || /\d{5,}(?:\.\d+)?$/.test(text.replace(/,/g, '')));
  extra.earn_mode = isGmtMode ? 'GMT' : 'GST';

  // インジケーターバー
  if (extra.earn_mode === 'GST') {
    const barM = text.replace(/,/g, '').match(/([\d.]+)\s*\/\s*([\d.]+)/);
    if (barM) {
      extra.gst_daily_earned = parseFloat(barM[1]);
      extra.gst_daily_cap    = parseFloat(barM[2]);
    }
  } else {
    // GMTモードはスラッシュなし・大きい数値
    const gmtBarM = text.replace(/,/g, '').match(/\b(\d{5,}(?:\.\d+)?)\b/);
    if (gmtBarM) extra.gmt_total_earned = parseFloat(gmtBarM[1]);
  }

  // EN（X.X/20.0）
  const enM = text.match(/([\d.]+)\s*\/\s*([\d.]+)/g);
  if (enM) {
    for (const m of enM) {
      const [cur, max] = m.split('/').map(parseFloat);
      if (max >= 2 && max <= 60) { // ENの範囲
        extra.en_current = cur;
        extra.en_max     = max;
        break;
      }
    }
  }
  if (!extra.en_current) warnings.push('EN取得失敗');

  // Refill時間
  const refillM = text.match(/Refill\s+in\s+(\d+h\s*\d+min)/i);
  if (refillM) extra.en_refill_in = refillM[1];

  // 現在表示中の靴
  const shoeId = extractShoeId(text);
  if (shoeId) {
    extra.active_shoe_id  = shoeId;
    extra.is_genesis      = isGenesis(shoeId);
  }
  const typeM = text.match(/\b(Jogger|Walker|Runner|Trainer)\b/i);
  if (typeM) extra.active_shoe_type = typeM[1];
  const lvM = text.match(/Lv\s*(\d+)/i);
  if (lvM) extra.active_shoe_level = parseInt(lvM[1], 10);

  // VIPバッジ（プロフィールアイコンのVマーク）
  extra.is_vip = /\bV\b/.test(text);

  // チェーン補助判定（ヘッダーアイコン色）
  // App.js側で confirmDialog に「XXXチェーンですか？」と提案できる
  // ※ 確定ではなく「提案」として使う（手動選択が優先）
  extra.chain_suggestion   = null; // ピクセル解析後に更新
  extra.needs_pixel_scan   = true;
  extra.pixel_scan_type    = 'chain_header';

  const confidence = extra.gst_balance ? 0.9 : 0.4;
  return { gst_amount: 0, gmt_amount: 0, extra, confidence, warnings };
}

export { runParser, makeResult };
