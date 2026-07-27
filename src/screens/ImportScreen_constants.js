/**
 * ImportScreen_constants.js
 * ImportScreen 用の定数・ユーティリティ
 */

export const CHAIN_COLORS = {
  SOL: '#9FFB50',
  BNB: '#F3BA2F',
  POL: '#9063CD',
};
export const CHAIN_TEXT = { SOL: '#000', BNB: '#000', POL: '#fff' };

export const CATEGORY_LABELS = {
  move_result:            '🏃 ムーブ結果',
  level_up:               '⬆️ レベルアップ',
  repair_hp:              '❤️ HP修復',
  repair_durability:      '🔧 Durability修復',
  marketplace_buy:        '🛒 マーケット購入',
  marketplace_listing:    '🏷️ 出品中',
  marketplace_sell:       '💰 マーケット売却',
  spending_withdraw:      '📤 Spending出金',
  spending_deposit:       '📥 Spending入金',
  shoe_mint_cost:         '👟 ミントコスト',
  shoe_mint_result:       '👟 ミント結果',
  shoe_enhance:           '✨ エンハンスコスト',
  socket_unlock:          '🔓 ソケット解放',
  gem_upgrade_success:    '💎 ジェムUP成功',
  gem_upgrade_fail:       '💎 ジェムUP失敗',
  gem_upgrade_confirm:    '💎 ジェムUPコスト',
  mystery_box_open:       '📦 MBオープン（コスト）',
  mb_result:              '🎁 MB開封結果',
  success_rate_increment: '📈 成功率UP',
  point_redistribution:   '🔄 ポイント振直し',
  vip_membership:         '👑 VIPメンバー',
  home:                   '🏠 ホーム画面',
  unknown:                '❓ 不明',
};

// 大分類グループ。
//   キーは内部データ（income/expense/info/listing・言語非依存で不変）。
//   表示ラベルは i18n の t('group_' + key) で翻訳する。
export const CATEGORY_GROUPS = {
  income: ['move_result', 'spending_deposit', 'marketplace_sell'],
  expense: [
    'repair_hp', 'repair_durability', 'level_up', 'socket_unlock',
    'gem_upgrade_success', 'gem_upgrade_fail', 'gem_upgrade_confirm',
    'shoe_mint_cost', 'shoe_mint_result', 'shoe_enhance',
    'mystery_box_open', 'spending_withdraw', 'success_rate_increment',
    'point_redistribution', 'marketplace_buy', 'vip_membership',
  ],
  info: ['home'],
  listing: ['marketplace_listing'],
};

export const MB_QUALITY = {
  1: 'Damaged', 2: 'Refurbished', 3: 'Common',
  4: 'Uncommon', 5: 'Rare',      6: 'Epic',
  7: 'Legendary', 8: 'Enchanted', 9: 'Master', 10: 'Satoshi',
};

export const GEM_COLORS = {
  efficiency: { label: 'Efficiency', emoji: '🟡' },
  luck:       { label: 'Luck',       emoji: '🔵' },
  comfort:    { label: 'Comfort',    emoji: '🔴' },
  resilience: { label: 'Resilience', emoji: '🟣' },
};

// 信頼度スコア → { key, color }。
//   key は i18n の翻訳キー。表示は呼び出し側で t(key) する。
export function confLabel(score) {
  if (score >= 0.9) return { key: 'conf_high', color: '#00ff88' };
  if (score >= 0.6) return { key: 'conf_mid',  color: '#ffaa00' };
  if (score >  0)   return { key: 'conf_low',  color: '#ff4444' };
  return               { key: 'conf_none',     color: '#555' };
}
