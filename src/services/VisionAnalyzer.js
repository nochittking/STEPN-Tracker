/**
 * VisionAnalyzer.js  v3.2.3
 *
 * STEPN 収支管理ツール - OCR解析・カテゴリ判定（メインエントリー）
 *
 * 分割構成：
 *   VisionAnalyzer.js         ← このファイル（司令塔・約200行）
 *   VisionAnalyzer_parsers.js ← 全パーサー・ユーティリティ（約750行）
 *   VisionAnalyzer_pixel.js   ← ピクセル解析（約475行）
 *
 * 外部からのimportは変更不要：
 *   import { analyzeScreenshot } from './VisionAnalyzer';
 *   import { getChainSuggestion } from './VisionAnalyzer';
 */

import TextRecognition from '@react-native-ml-kit/text-recognition';
import { runParser, makeResult } from './VisionAnalyzer_parsers';
import { detectMbResultByPixel, getMbRewardItems } from './VisionAnalyzer_pixel';

// ピクセル解析関数を re-export（App.js側のimport変更不要）
export { getKeptGemColor, getChainSuggestion, getMbRewardItems } from './VisionAnalyzer_pixel';

// ─────────────────────────────────────────
// 定数
// ─────────────────────────────────────────

const NEEDS_CHAIN_CONFIRM = new Set([
  'repair_hp', 'repair_durability', 'level_up', 'socket_unlock',
  'gem_upgrade_success', 'gem_upgrade_fail', 'gem_upgrade_confirm',
  'shoe_enhance', 'spending_withdraw', 'point_redistribution',
  'success_rate_increment', 'shoe_mint_cost', 'shoe_mint_result',
]);

// ─────────────────────────────────────────
// メイン関数
// ─────────────────────────────────────────

export async function analyzeScreenshot(uri, chain = null) {
  let rawText = '';
  try {
    const result = await TextRecognition.recognize(uri);
    rawText = result.blocks.map((b) => b.text).join('\n');
  } catch (err) {
    return makeResult({ success: false, confidence: 0, category: 'unknown',
      warnings: [`OCR失敗: ${err.message}`], rawText });
  }

  const ocrResult = analyze(rawText, chain);

  if (ocrResult.category === 'needs_pixel_scan') {
    const isMbResult = await detectMbResultByPixel(uri);
    const category = isMbResult ? 'mb_result' : 'home';

    let mbRewardItems = [];
    if (isMbResult) {
      // OCRテキストから個数情報を抽出（"x 10", "x5" 等）
      const countMatches = rawText.match(/x\s*(\d+)/gi) || [];
      const counts = countMatches.map((m) => parseInt(m.replace(/x\s*/i, ''), 10));
      console.log('[VisionAnalyzer] mb_result counts from OCR:', counts);
      mbRewardItems = await getMbRewardItems(uri, counts);
    }

    return makeResult({
      ...ocrResult,
      category,
      type:    category === 'mb_result' ? 'income' : 'info',
      success: isMbResult,
      confidence: mbRewardItems.length > 0 ? 0.8 : 0.5,
      extra:   {
        ...ocrResult.extra,
        needs_pixel_scan: true,
        pixel_scan_type: 'mb_result_slots',
        mb_reward_items: mbRewardItems,
      },
    });
  }

  return ocrResult;
}

export function analyze(ocrText, chain = null) {
  const text  = ocrText || '';
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const upper = text.toUpperCase();

  const category = detectCategory(text, upper, lines);
  const parsed   = runParser(category, text, upper, lines, chain);

  return makeResult({
    success:             category !== 'unknown',
    confidence:          parsed.confidence ?? 1.0,
    category,
    type:                getCategoryType(category),
    gst_amount:          parsed.gst_amount  ?? 0,
    gmt_amount:          parsed.gmt_amount  ?? 0,
    chain:               chain ?? null,
    needs_chain_confirm: NEEDS_CHAIN_CONFIRM.has(category),
    extra:               parsed.extra       ?? {},
    warnings:            parsed.warnings    ?? [],
    rawText:             text,
  });
}

// ─────────────────────────────────────────
// カテゴリ判定（優先順厳守）
// ─────────────────────────────────────────

function detectCategory(text, upper, lines) {
  if (upper.includes('HP RESTORATION')) return 'repair_hp';
  if (upper.includes('TOKEN CONSUMPTION') && upper.includes('RAINBOW GEM CHANCE'))
    return 'gem_upgrade_confirm';
  if (upper.includes('CLICK TO COLLECT') && /\bLv\s*\d+/i.test(text) &&
      /gem/i.test(text) && !upper.includes('SNEAKER BOX'))
    return 'gem_upgrade_success';
  if (upper.includes('UNSUCCESSFUL') && upper.includes('TRY AGAIN'))
    return 'gem_upgrade_fail';
  if (upper.includes('TOKEN CONSUMPTION') && upper.includes('RAINBOW SNEAKER CHANCE'))
    return 'shoe_enhance';
  if (upper.includes('CLICK TO COLLECT') && upper.includes('EFFICIENCY') &&
      upper.includes('LUCK') && upper.includes('COMFORT') &&
      upper.includes('RESILIENCE') && !upper.includes('SNEAKER BOX'))
    return 'shoe_enhance';
  if (upper.includes('SHOE MINT') && upper.includes('TOKEN CONSUMPTION'))
    return 'shoe_mint_cost';
  if (upper.includes('SHOE MINT') &&
      (upper.includes('SNEAKER BOX') || upper.includes('OPEN NOW') ||
       upper.includes('CLICK TO COLLECT')))
    return 'shoe_mint_result';
  if (upper.includes('GST/MIN') || upper.includes('GMT/MIN'))
    return 'move_result';
  if (/Durability\s*:\s*\d+/i.test(text))
    return 'repair_durability';
  if (upper.includes('LEVEL UP') && upper.includes('TIME'))
    return 'level_up';
  if (upper.includes('BUY') && (upper.includes('GMT') || upper.includes('GST')) &&
      !upper.includes('REVOKE') && !upper.includes('SELLING'))
    return 'marketplace_buy';
  if (upper.includes('REVOKE') || upper.includes('SELLING'))
    return 'marketplace_listing';
  if (upper.includes('TRANSFER') && upper.includes('SPENDING') && upper.includes('WALLET')) {
    const fromSpending = /From\s+Spending/i.test(text);
    const fromWallet   = /From\s+Wallet/i.test(text);
    if (fromSpending) return 'spending_withdraw';
    if (fromWallet)   return 'spending_deposit';
    return upper.indexOf('SPENDING') < upper.indexOf('WALLET') ? 'spending_withdraw' : 'spending_deposit';
  }
  if (/SOCKET/.test(upper) && upper.includes('OPEN') &&
      (upper.includes('EFFICIENCY SOCKET') || upper.includes('LUCK SOCKET') ||
       upper.includes('COMFORT SOCKET')    || upper.includes('RESILIENCE SOCKET')))
    return 'socket_unlock';
  if (/mystery\s+box/i.test(text) && /LV\s*\d+/i.test(text))
    return 'mystery_box_open';
  if (upper.includes('SUCCESS RATE INCREMENT'))
    return 'success_rate_increment';
  if (upper.includes('POINT RE-DISTRIBUTION') || upper.includes('POINT REDISTRIBUTION'))
    return 'point_redistribution';
  if (upper.includes('START'))
    return 'needs_pixel_scan';
  if (upper.includes('MEMBERSHIP') && upper.includes('VIP PROGRAM'))
    return 'vip_membership';
  return 'unknown';
}

function getCategoryType(category) {
  const map = {
    move_result: 'income', spending_deposit: 'income', marketplace_sell: 'income',
    repair_hp: 'expense', repair_durability: 'expense', level_up: 'expense',
    socket_unlock: 'expense', gem_upgrade_success: 'expense', gem_upgrade_fail: 'expense',
    gem_upgrade_confirm: 'expense', shoe_mint_cost: 'expense', shoe_mint_result: 'expense',
    shoe_enhance: 'expense', mystery_box_open: 'expense', spending_withdraw: 'expense',
    success_rate_increment: 'expense', point_redistribution: 'expense',
    marketplace_buy: 'expense', vip_membership: 'expense',
    home: 'info', mb_result: 'income', marketplace_listing: 'listing',
  };
  return map[category] ?? 'info';
}
