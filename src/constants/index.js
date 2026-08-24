/**
 * src/constants/index.js
 * STEPN収支管理ツール - 定数・共通スタイル定義
 */

// ─────────────────────────────────────────
// アプリ情報
//   ※ 画面表示用のバージョンはここ一箇所で管理する。
//     各画面にベタ書きすると更新漏れでズレる（HomeScreen v3.4 に対して
//     SettingsScreen が v3.2 のまま、という事例が実際にあった）。
//     expo-constants は未導入（入れると Dev Build 再ビルドが必要）のため
//     app.json の version は参照せず、UI表示用の値として手動管理する。
// ─────────────────────────────────────────

export const APP_VERSION = '3.4';

// ─────────────────────────────────────────
// チェーン定数
// ─────────────────────────────────────────

export const CHAINS = ['SOL', 'BNB', 'POL'];

export const CHAIN_COLORS = {
  SOL: '#9FFB50', // STEPN Green（PANTONEコラボ公式カラー）
  BNB: '#F3BA2F', // BNB Chain Yellow
  POL: '#9063CD', // STEPN GO Purple（PANTONE 265）
};

export const CHAIN_TEXT_COLORS = {
  SOL: '#000000', // 明るい背景なので黒テキスト
  BNB: '#000000',
  POL: '#FFFFFF', // 暗い背景なので白テキスト
};

// ─────────────────────────────────────────
// カテゴリ定数
// ─────────────────────────────────────────

export const CATEGORY_LABELS = {
  move_result:             '🏃 ムーブ結果',
  level_up:                '⬆️ レベルアップ',
  repair_hp:               '❤️ HP修復',
  repair_durability:       '🔧 Durability修復',
  marketplace_buy:         '🛒 マーケット購入',
  marketplace_listing:     '🏷️ 出品中',
  marketplace_sell:        '💰 マーケット売却',
  spending_withdraw:       '📤 Spending出金',
  spending_deposit:        '📥 Spending入金',
  shoe_mint_cost:          '👟 ミントコスト',
  shoe_mint_result:        '👟 ミント結果',
  shoe_enhance:            '✨ シューズ強化',
  socket_unlock:           '🔓 ソケット解放',
  gem_upgrade_success:     '💎 ジェムUP成功',
  gem_upgrade_fail:        '💎 ジェムUP失敗',
  gem_upgrade_confirm:     '💎 ジェムUP（結果待ち）',
  mystery_box_open:        '📦 MBオープン',
  success_rate_increment:  '📈 成功率UP',
  point_redistribution:    '🔄 ポイント振り直し',
  vip_membership:          '👑 VIPメンバーシップ',
  home:                    '🏠 ホーム画面',
  achievement:             '🏆 アチーブメント',
  leaderboard:             '📋 リーダーボード',
  profile_settings:        '⚙️ プロフィール',
  unknown:                 '❓ 不明',
};

export const CATEGORY_TYPES = {
  income:  ['move_result', 'spending_deposit', 'marketplace_sell', 'achievement', 'leaderboard'],
  expense: [
    'repair_hp', 'repair_durability', 'level_up', 'socket_unlock',
    'gem_upgrade_success', 'gem_upgrade_fail', 'gem_upgrade_confirm',
    'shoe_mint_cost', 'shoe_mint_result', 'shoe_enhance',
    'mystery_box_open', 'spending_withdraw', 'success_rate_increment',
    'point_redistribution', 'marketplace_buy', 'vip_membership',
  ],
  info:    ['home', 'profile_settings'],
  listing: ['marketplace_listing'],
};

/** カテゴリ → type の逆引き */
export function getCategoryType(category) {
  for (const [type, cats] of Object.entries(CATEGORY_TYPES)) {
    if (cats.includes(category)) return type;
  }
  return 'info';
}

// ─────────────────────────────────────────
// アプリカラーパレット
// ─────────────────────────────────────────

export const COLORS = {
  // 背景
  bg:           '#0a0a0a',
  bgCard:       '#1a1a1a',
  bgInput:      '#111111',
  bgModal:      '#0a0a0a',

  // ボーダー
  border:       '#2a2a2a',
  borderLight:  '#333333',

  // テキスト
  textPrimary:  '#ffffff',
  textSecondary:'#aaaaaa',
  textMuted:    '#555555',
  textHint:     '#444444',

  // アクション
  income:       '#00ff88', // 収入・成功・OK
  expense:      '#ff4444', // 支出・エラー
  warning:      '#ffaa00', // 警告・法定通貨
  pending:      '#ff8800', // 仮保存
  info:         '#4488ff', // 情報

  // ボタン
  btnPrimary:   '#00ff88',
  btnSecondary: '#1a1a1a',
  btnDanger:    '#ff4444',
  btnDisabled:  '#1a4a33',

  // 信頼度
  confHigh:     '#00ff88', // 1.0
  confMid:      '#ffaa00', // 0.7
  confLow:      '#ff4444', // 0.4
  confUnknown:  '#555555', // 0.0
};

// ─────────────────────────────────────────
// 共通スタイル
// ─────────────────────────────────────────

export const COMMON_STYLES = {
  // カード
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 14,
  },

  // ボタン
  btnPrimary: {
    backgroundColor: '#00ff88',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000000',
  },
  btnSecondary: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#aaaaaa',
  },
  btnDanger: {
    backgroundColor: '#2a0000',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  btnDangerText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ff4444',
  },

  // セパレーター
  divider: {
    height: 1,
    backgroundColor: '#2a2a2a',
    marginVertical: 12,
  },

  // テキスト
  label: {
    fontSize: 12,
    color: '#555555',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  hint: {
    fontSize: 11,
    color: '#444444',
    textAlign: 'center',
    marginTop: 6,
  },
};

// ─────────────────────────────────────────
// MBレベル → 品質変換
// ─────────────────────────────────────────

export const MB_QUALITY = {
  1: 'Damaged',    2: 'Refurbished', 3: 'Common',
  4: 'Uncommon',   5: 'Rare',        6: 'Epic',
  7: 'Legendary',  8: 'Enchanted',   9: 'Master',
  10: 'Satoshi',
};

// ─────────────────────────────────────────
// ジェム定数
// ─────────────────────────────────────────

export const GEM_TYPES = {
  efficiency: { label: 'Efficiency', color: '#F3BA2F', emoji: '🟡' },
  luck:       { label: 'Luck',       color: '#4af',    emoji: '🔵' },
  comfort:    { label: 'Comfort',    color: '#ff4444', emoji: '🔴' },
  resilience: { label: 'Resilience', color: '#9063CD', emoji: '🟣' },
  rainbow:    { label: 'Rainbow',    color: '#ff88ff', emoji: '🌈' },
};

// ─────────────────────────────────────────
// 信頼度スコア → ラベル・カラー変換
// ─────────────────────────────────────────

export function getConfidenceInfo(score) {
  if (score >= 0.9) return { label: '✅ 信頼度：高',   color: '#00ff88', needsCheck: false };
  if (score >= 0.6) return { label: '⚠️ 要確認',      color: '#ffaa00', needsCheck: true  };
  if (score >  0)   return { label: '❓ 要手動確認',   color: '#ff4444', needsCheck: true  };
  return               { label: '❌ 判定不可',        color: '#555555', needsCheck: true  };
}

// ─────────────────────────────────────────
// 数値フォーマット
// ─────────────────────────────────────────

/** 1234567.89 → "1,234,567.89" */
export function formatNumber(num, decimals = 2) {
  if (num == null || isNaN(num)) return '0.00';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** 日時を "2026/05/19 21:30" 形式に */
export function formatDateTime(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "YYYY_MM" 形式を "2026年5月" に */
export function formatYm(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('_');
  return `${y}年${parseInt(m, 10)}月`;
}

/** 現在の "YYYY_MM" を返す */
export function currentYm() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}_${m}`;
}
