/**
 * src/i18n/i18n.js  v1.0.0
 * STEPN収支管理ツール - 多言語対応（日本語/英語）
 *
 * 【設計方針】
 *  - ネイティブライブラリ不使用（Dev Buildのリビルド不要）
 *  - React Context で言語を全画面共有 → トグルで即時反映
 *  - AsyncStorage に選択言語を保存 → 再起動しても復元
 *
 * 【辞書の2タイプ】
 *  タイプA（文字列）  : key → { ja: "文字列", en: "string" }
 *  タイプB（関数）    : key → { ja: (args)=>`...`, en: (args)=>`...` }
 *    ※ 変数（チェーン名・件数・年月など）が混じる文言に使う
 *
 * 【t関数の安全設計】
 *  - 辞書の中身が「関数」なら実行、「文字列」ならそのまま返す（型判定）
 *  - キーが存在しなければキー名をそのまま返す（フォールバック＝クラッシュ防止）
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANG_KEY = 'settings_lang';

// 英語の月名（年月ラベルの英語表記に使用）
const EN_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// ─────────────────────────────────────────
// 辞書（DICT）
//   ここに全画面の文言を集約していく（今回はHomeScreen分）
// ─────────────────────────────────────────

const DICT = {
  // ── 共通・期間ラベル ──
  // タイプB：年月（例 2026年6月 / Jun 2026）
  label_month_year: {
    ja: (year, month) => `${year}年${month}月`,
    en: (year, month) => `${EN_MONTHS[month - 1]} ${year}`,
  },
  // タイプB：年のみ（例 2026年 / 2026）
  label_year: {
    ja: (year) => `${year}年`,
    en: (year) => `${year}`,
  },
  // タイプA：全期間
  label_all: {
    ja: '全期間',
    en: 'All Time',
  },

  // ── HomeScreen : チェーン選択カード ──
  chain_select: {
    ja: '🔗 チェーン選択',
    en: '🔗 Select Chain',
  },
  chain_note: {
    ja: '※ 選択したチェーンは次回起動時も保持されるで',
    en: '※ Your selected chain will be remembered next time',
  },

  // ── HomeScreen : Spending残高カード ──
  // タイプB：チェーン名が入る
  spending_balance: {
    ja: (chain) => `💰 Spending残高（${chain}）`,
    en: (chain) => `💰 Spending Balance (${chain})`,
  },
  balance_hint: {
    ja: '初期残高 ＋ 収入 − 支出 の計算値',
    en: 'Initial + Income − Expense (calculated)',
  },

  // ── HomeScreen : 収支テーブルカード ──
  // タイプB：期間ラベルが入る
  period_summary: {
    ja: (label) => `📊 ${label}の収支`,
    en: (label) => `📊 ${label} Summary`,
  },
  // 期間切替タブ
  period_month: {
    ja: '今月',
    en: 'This Month',
  },
  period_year: {
    ja: '今年',
    en: 'This Year',
  },
  period_all: {
    ja: '全期間',
    en: 'All',
  },
  period_pick: {
    ja: '月指定',
    en: 'Pick',
  },
  // テーブル行ラベル
  income: {
    ja: '収入',
    en: 'Income',
  },
  expense: {
    ja: '支出',
    en: 'Expense',
  },
  total: {
    ja: '合計',
    en: 'Total',
  },

  // ── HomeScreen : 件数表示 ──
  // タイプB：チェーン名・件数・総件数が入る
  records_count: {
    ja: (chain, n, all) => `📝 ${chain}の記録：${n}件（総記録数：${all}件）`,
    en: (chain, n, all) => `📝 ${chain}: ${n} records (total: ${all})`,
  },

  // ── HomeScreen : ボタン類 ──
  import_button: {
    ja: '📸 スクショ取込',
    en: '📸 Import Screenshots',
  },
  manual_button: {
    ja: '✏️ 手動入力',
    en: '✏️ Manual Input',
  },
  // タイプB：件数が入る
  record_list_button: {
    ja: (all) => `📋 記録一覧（${all}件）`,
    en: (all) => `📋 Records (${all})`,
  },
  guide_button: {
    ja: '📖 使い方ガイド',
    en: '📖 How to Use',
  },
  csv_button: {
    ja: '📊 CSV出力',
    en: '📊 Export CSV',
  },

  // ─────────────────────────────────────────
  // カテゴリ名（cat_ プレフィックス）
  //   ※ CATEGORY_LABELS[category] を t('cat_' + category) で参照する
  //   ※ STEPN固有名詞（HP/Durability/Spending/MB/VIP等）は英語据え置き
  // ─────────────────────────────────────────
  cat_move_result:            { ja: '🏃 ムーブ結果',        en: '🏃 Move Result' },
  cat_level_up:               { ja: '⬆️ レベルアップ',      en: '⬆️ Level Up' },
  cat_repair_hp:              { ja: '❤️ HP修復',            en: '❤️ HP Repair' },
  cat_repair_durability:      { ja: '🔧 Durability修復',    en: '🔧 Durability Repair' },
  cat_marketplace_buy:        { ja: '🛒 マーケット購入',    en: '🛒 Market Buy' },
  cat_marketplace_listing:    { ja: '🏷️ 出品中',           en: '🏷️ Listing' },
  cat_marketplace_sell:       { ja: '💰 マーケット売却',    en: '💰 Market Sell' },
  cat_spending_withdraw:      { ja: '📤 Spending出金',      en: '📤 Spending Withdraw' },
  cat_spending_deposit:       { ja: '📥 Spending入金',      en: '📥 Spending Deposit' },
  cat_shoe_mint_cost:         { ja: '👟 ミントコスト',      en: '👟 Mint Cost' },
  cat_shoe_mint_result:       { ja: '👟 ミント結果',        en: '👟 Mint Result' },
  cat_shoe_enhance:           { ja: '✨ エンハンスコスト',  en: '✨ Enhance Cost' },
  cat_socket_unlock:          { ja: '🔓 ソケット解放',      en: '🔓 Socket Unlock' },
  cat_gem_upgrade_success:    { ja: '💎 ジェムUP成功',      en: '💎 Gem Up Success' },
  cat_gem_upgrade_fail:       { ja: '💎 ジェムUP失敗',      en: '💎 Gem Up Fail' },
  cat_gem_upgrade_confirm:    { ja: '💎 ジェムUPコスト',    en: '💎 Gem Up Cost' },
  cat_mystery_box_open:       { ja: '📦 MBオープン（コスト）', en: '📦 MB Open (Cost)' },
  cat_mb_result:              { ja: '🎁 MB開封結果',        en: '🎁 MB Result' },
  cat_success_rate_increment: { ja: '📈 成功率UP',          en: '📈 Success Rate Up' },
  cat_point_redistribution:   { ja: '🔄 ポイント振直し',    en: '🔄 Point Redistribution' },
  cat_vip_membership:         { ja: '👑 VIPメンバー',       en: '👑 VIP Member' },
  cat_home:                   { ja: '🏠 ホーム画面',        en: '🏠 Home' },
  cat_unknown:                { ja: '❓ 不明',              en: '❓ Unknown' },

  // ─────────────────────────────────────────
  // カテゴリ大分類グループ（group_ プレフィックス）
  //   ※ 内部キーは income/expense/info/listing（データとして不変）
  //   ※ 表示のみ t('group_' + key) で翻訳
  // ─────────────────────────────────────────
  group_income:  { ja: '💚 収入',    en: '💚 Income' },
  group_expense: { ja: '🔴 支出',    en: '🔴 Expense' },
  group_info:    { ja: '⚪ 情報',    en: '⚪ Info' },
  group_listing: { ja: '🏷️ 売却中',  en: '🏷️ Listing' },

  // ─────────────────────────────────────────
  // 信頼度ラベル（conf_ プレフィックス）
  // ─────────────────────────────────────────
  conf_high: { ja: '✅ 信頼度高',   en: '✅ High' },
  conf_mid:  { ja: '⚠️ 要確認',    en: '⚠️ Check' },
  conf_low:  { ja: '❓ 要手動確認', en: '❓ Manual' },
  conf_none: { ja: '❌ 判定不可',   en: '❌ Unknown' },

  // ─────────────────────────────────────────
  // ImportScreen : SELECT / ANALYZING フェーズ
  // ─────────────────────────────────────────
  select_title: { ja: 'スクショを選んでや',       en: 'Select screenshots' },
  select_sub:   { ja: '最大20枚まで選択できるで', en: 'Up to 20 images' },
  select_open:  { ja: '📂 カメラロールを開く',    en: '📂 Open Camera Roll' },
  analyzing_title: { ja: 'OCR解析中...',          en: 'Analyzing (OCR)...' },
  // タイプB：進捗（○ / ○ 枚）
  analyzing_count: {
    ja: (done, total) => `${done} / ${total} 枚`,
    en: (done, total) => `${done} / ${total} imgs`,
  },

  // 権限エラー Alert
  alert_perm_title: { ja: '権限エラー',                       en: 'Permission Error' },
  alert_perm_msg:   { ja: 'カメラロールへのアクセスを許可してや！', en: 'Please allow camera roll access!' },

  // ─────────────────────────────────────────
  // ImportScreen : CONFIRM フェーズ（一括バー・保存バー）
  // ─────────────────────────────────────────
  bulk_label: { ja: '一括選択：', en: 'Bulk: ' },
  // タイプB：全て{c}
  bulk_all: {
    ja: (c) => `全て${c}`,
    en: (c) => `All ${c}`,
  },
  // タイプB：重複スキップ件数
  skip_hint: {
    ja: (n) => `🔄 重複スキップ：${n}件（タップで解除可能）`,
    en: (n) => `🔄 Skipped duplicates: ${n} (tap to unskip)`,
  },
  // タイプB：仮保存件数
  pending_hint: {
    ja: (n) => `※ チェーン未選択の ${n} 件は仮保存になるで`,
    en: (n) => `※ ${n} without a chain will be saved as pending`,
  },
  // タイプB：カテゴリ未選択件数
  unknown_hint: {
    ja: (n) => `⚠️ カテゴリ未選択の ${n} 件はスキップされるで`,
    en: (n) => `⚠️ ${n} without a category will be skipped`,
  },
  saving: { ja: '💾 保存中...', en: '💾 Saving...' },
  // タイプB：保存ボタン（確定件数＋仮保存件数で分岐）
  save_btn: {
    ja: (chained, pending) =>
      `💾 保存する（${chained}件${pending > 0 ? ` + 仮保存${pending}件` : ''}）`,
    en: (chained, pending) =>
      `💾 Save (${chained}${pending > 0 ? ` + ${pending} pending` : ''})`,
  },

  // ─────────────────────────────────────────
  // ImportScreen_item : ConfirmItem（確認カード）
  // ─────────────────────────────────────────
  // タイプB：重複バナー（スキップ状態で文言が変わる）
  dup_exact: {
    ja: (isSkipped) => `⛔ この画像は取込済みやで（${isSkipped ? 'スキップする' : 'タップでスキップ解除'}）`,
    en: (isSkipped) => `⛔ Already imported (${isSkipped ? 'skipping' : 'tap to unskip'})`,
  },
  dup_similar: {
    ja: (isSkipped) => `⚠️ 似たレコードがあるで（${isSkipped ? 'タップでスキップ解除' : 'タップでスキップ'}）`,
    en: (isSkipped) => `⚠️ Similar record exists (${isSkipped ? 'tap to unskip' : 'tap to skip'})`,
  },
  thumb_zoom:  { ja: '🔍 拡大',   en: '🔍 Zoom' },
  date_unknown:{ ja: '日時不明',  en: 'No date' },
  // タイプB：move_result の日時表示
  move_date_display: {
    ja: (dateStr) => `📅 ${dateStr} ✏️`,
    en: (dateStr) => `📅 ${dateStr} ✏️`,
  },
  time_placeholder: { ja: '14:32（任意）', en: '14:32 (optional)' },
  date_confirm:     { ja: '✅ 確定',       en: '✅ OK' },
  alert_input_title:{ ja: '入力エラー',    en: 'Input Error' },
  alert_input_msg:  { ja: '日付を入力してや！', en: 'Please enter a date!' },

  // サブタイプ表示（marketplace_buy/listing）
  // タイプB：括弧の中身は有無で分岐
  subtype_sneaker: {
    ja: (type) => `👟 スニーカー${type ? `（${type}）` : ''}`,
    en: (type) => `👟 Sneaker${type ? ` (${type})` : ''}`,
  },
  subtype_gem: {
    ja: (color, lv) => `💎 ジェム${color ? `（${color} Lv${lv ?? '?'}）` : ''}`,
    en: (color, lv) => `💎 Gem${color ? ` (${color} Lv${lv ?? '?'})` : ''}`,
  },
  subtype_scroll: {
    ja: (rarity) => `📜 ミンスク${rarity ? `（${rarity}）` : ''}`,
    en: (rarity) => `📜 Scroll${rarity ? ` (${rarity})` : ''}`,
  },
  subtype_badge: { ja: '🏅 バッジ', en: '🏅 Badge' },

  // MB結果の紐付けUI
  mb_link_title: { ja: '📦 対応するMBコストを選んでや', en: '📦 Select the matching MB cost' },
  // タイプB：MBコストボタン（-XX GST）
  mb_link_btn: {
    ja: (idx, gst) => `#${idx} MBコスト（-${gst} GST）`,
    en: (idx, gst) => `#${idx} MB Cost (-${gst} GST)`,
  },
  mb_link_hint: { ja: '※ 後で記録一覧から紐付けもできるで', en: '※ You can also link it later from Records' },
  mb_link_none: {
    ja: '📦 MBコストのスクショは別タイミングで取込済み\n→ 記録一覧から後で紐付けできるで',
    en: '📦 The MB cost screenshot was imported separately\n→ You can link it later from Records',
  },

  // チェーン提案・チェーン選択
  // タイプB：チェーン提案
  chain_suggest: {
    ja: (chain) => `💡 ${chain}チェーンの可能性があるで`,
    en: (chain) => `💡 This might be the ${chain} chain`,
  },
  chain_label:  { ja: 'チェーン：',       en: 'Chain: ' },
  chain_unset:  { ja: '← 未選択=仮保存',  en: '← unset = pending' },
  image_close:  { ja: 'タップで閉じる',   en: 'Tap to close' },

  // ─────────────────────────────────────────
  // ImportScreen_item : ManualCategoryPicker
  // ─────────────────────────────────────────
  manual_cat_title: { ja: '📂 カテゴリを選んでや', en: '📂 Select a category' },

  // ─────────────────────────────────────────
  // ImportScreen_item : MbSlotEditor
  // ─────────────────────────────────────────
  mb_slot_title: { ja: '🎁 MB開封内容を確認してや', en: '🎁 Confirm MB contents' },
  // タイプB：スロットヘッダー
  slot_scroll: {
    ja: (q) => `ミンスク × ${q}`,
    en: (q) => `Scroll × ${q}`,
  },
  slot_gem: {
    ja: (lv, q) => `Lv${lv} × ${q}`,
    en: (lv, q) => `Lv${lv} × ${q}`,
  },
  rarity_label: { ja: 'レアリティ：', en: 'Rarity: ' },
  color_label:  { ja: '色：',        en: 'Color: ' },
  slot_confirm:      { ja: '✅ 確定する',        en: '✅ Confirm' },
  slot_confirm_wait: { ja: '⚠️ 色を全て選択してや', en: '⚠️ Select all colors' },
  // ジェム色4択ラベル（色名は日本語補足のみ翻訳）
  gem_color_e: { ja: 'E (黄)', en: 'E (Yel)' },
  gem_color_l: { ja: 'L (青)', en: 'L (Blu)' },
  gem_color_c: { ja: 'C (赤)', en: 'C (Red)' },
  gem_color_r: { ja: 'R (紫)', en: 'R (Pur)' },

  // ─────────────────────────────────────────
  // ImportScreen_item : SpecialFlow（特殊フロー）
  // ─────────────────────────────────────────
  gem_result_q: { ja: '💎 結果はどうでしたか？', en: '💎 What was the result?' },
  result_success: { ja: '✅ 成功', en: '✅ Success' },
  result_fail:    { ja: '❌ 失敗', en: '❌ Fail' },
  mb_level_q:  { ja: '📦 MBのレベルは？',  en: '📦 What MB level?' },
  enhance_q:   { ja: '✨ 強化結果は？',    en: '✨ Enhance result?' },
  enhance_normal:  { ja: '通常 1ランクUP', en: 'Normal +1 rank' },
  enhance_double:  { ja: '🎉 2段階UP！',   en: '🎉 +2 ranks!' },
  enhance_rainbow: { ja: '🌈 レインボー！', en: '🌈 Rainbow!' },
  // タイプB：保持ジェム色の質問（自動判定の補足つき）
  kept_gem_q: {
    ja: (auto) => `💎 保持したジェムの色は？${auto ? `（自動判定：${auto}）` : ''}`,
    en: (auto) => `💎 Which gem color was kept?${auto ? ` (auto: ${auto})` : ''}`,
  },

  // ─────────────────────────────────────────
  // ImportScreen_item : SpecialFlowDone（完了バッジ）
  // ─────────────────────────────────────────
  done_gem_success: { ja: '✅ 成功として記録', en: '✅ Recorded as success' },
  done_gem_fail:    { ja: '❌ 失敗として記録', en: '❌ Recorded as fail' },
  // タイプB：MB Lv（品質つき）
  done_mb_level: {
    ja: (lv, quality) => `📦 MB Lv${lv}（${quality}）`,
    en: (lv, quality) => `📦 MB Lv${lv} (${quality})`,
  },
  // タイプB：MB開封結果サマリー（summaryは呼び出し側で組む）
  done_mb_result: {
    ja: (summary) => `🎁 ${summary}`,
    en: (summary) => `🎁 ${summary}`,
  },
  enhance_label_normal: { ja: '通常UP',     en: 'Normal Up' },
  enhance_label_double: { ja: '2段階UP',    en: '+2 Up' },
  enhance_label_rainbow:{ ja: 'レインボー', en: 'Rainbow' },
  // タイプB：エンハンス完了
  done_enhance: {
    ja: (label) => `✨ ${label}`,
    en: (label) => `✨ ${label}`,
  },
  // タイプB：保持ジェム完了（gemStrは呼び出し側で組む）
  done_kept_gem: {
    ja: (gemStr) => `💎 ${gemStr}を保持`,
    en: (gemStr) => `💎 Kept ${gemStr}`,
  },

  // ─────────────────────────────────────────
  // ImportScreen_item : DonePhase（保存完了）
  // ─────────────────────────────────────────
  done_title: { ja: '保存完了！', en: 'Saved!' },
  // タイプB：正式保存件数
  done_saved: {
    ja: (n) => `✅ 正式保存：${n}件`,
    en: (n) => `✅ Saved: ${n}`,
  },
  // タイプB：仮保存件数
  done_pending: {
    ja: (n) => `⚠️ 仮保存（チェーン未確定）：${n}件`,
    en: (n) => `⚠️ Pending (no chain): ${n}`,
  },
  done_pending_hint: {
    ja: '仮保存分は記録一覧の「仮保存」タブから\nチェーンを選んで正式保存してや！',
    en: 'For pending items, go to the "Pending" tab in Records,\nselect a chain, and save them properly!',
  },
  done_home: { ja: '🏠 ホームに戻る', en: '🏠 Back to Home' },

  // ─────────────────────────────────────────
  // ナビゲーションヘッダー名（nav_ プレフィックス）
  //   各画面が navigation.setOptions で自分のヘッダーをセットする際に使う。
  //   ※ 中身を英語化した画面から順に適用していく（未対応画面は
  //     App.js の固定タイトル＝日本語のまま据え置き）。
  // ─────────────────────────────────────────
  nav_import:       { ja: '📸 スクショ取込',   en: '📸 Import' },
  nav_recordlist:   { ja: '📋 記録一覧',       en: '📋 Records' },
  nav_recorddetail: { ja: '📄 レコード詳細',   en: '📄 Record Detail' },
  nav_manualinput:  { ja: '✏️ 手動入力',       en: '✏️ Manual Input' },
  nav_settings:     { ja: '⚙️ 設定',           en: '⚙️ Settings' },
  nav_guide:        { ja: '📖 使い方ガイド',   en: '📖 How to Use' },
  nav_back:         { ja: '戻る',              en: 'Back' },

  // ─────────────────────────────────────────
  // RecordListScreen : タブ名（tab_ プレフィックス）
  // ─────────────────────────────────────────
  tab_all:      { ja: '📋 ALL',     en: '📋 All' },
  tab_income:   { ja: '💚 収入',    en: '💚 Income' },
  tab_expense:  { ja: '🔴 支出',    en: '🔴 Expense' },
  tab_info:     { ja: '⚪ 情報',    en: '⚪ Info' },
  tab_listing:  { ja: '🏷️ 売却中', en: '🏷️ Listing' },
  tab_pending:  { ja: '⚠️ 仮保存', en: '⚠️ Pending' },
  tab_history:  { ja: '📝 修正履歴', en: '📝 History' },

  // ─────────────────────────────────────────
  // RecordListScreen : 本文・操作バー
  // ─────────────────────────────────────────
  history_placeholder: { ja: '修正履歴は実装予定やで！', en: 'History feature coming soon!' },
  sort_newest: { ja: '🕐 新しい順', en: '🕐 Newest' },
  sort_oldest: { ja: '🕐 古い順',   en: '🕐 Oldest' },
  // タイプB：件数表示
  count_pending: {
    ja: (n) => `仮保存：${n}件`,
    en: (n) => `Pending: ${n}`,
  },
  count_records: {
    ja: (n) => `${n}件`,
    en: (n) => `${n} records`,
  },
  select_mode_btn:   { ja: '☑️ 選択',      en: '☑️ Select' },
  select_cancel_btn: { ja: '✕ キャンセル', en: '✕ Cancel' },
  select_all_btn:    { ja: '全て選択',     en: 'Select All' },
  // タイプB：選択削除ボタン
  delete_selected_btn: {
    ja: (n) => `🗑️ ${n}件削除`,
    en: (n) => `🗑️ Delete ${n}`,
  },
  loading_text:   { ja: '読込中...',        en: 'Loading...' },
  empty_records:  { ja: 'レコードがないで！', en: 'No records!' },

  // アラート（削除・仮保存の正式保存）
  alert_error_title: { ja: 'エラー', en: 'Error' },
  alert_done_title:  { ja: '完了',   en: 'Done' },
  btn_cancel: { ja: 'キャンセル', en: 'Cancel' },
  btn_delete: { ja: '削除する',   en: 'Delete' },
  alert_delete_title: { ja: '削除確認', en: 'Delete Confirm' },
  // タイプB：削除確認メッセージ
  alert_delete_msg: {
    ja: (n) => `選択した ${n} 件を削除しますか？\nこの操作は取り消せません。`,
    en: (n) => `Delete ${n} selected? This cannot be undone.`,
  },
  delete_fail_msg: { ja: '削除に失敗したで', en: 'Failed to delete' },
  chain_required_msg: { ja: 'チェーンを選択してや！', en: 'Please select a chain!' },
  // タイプB：仮保存の正式保存完了メッセージ
  confirm_pending_success: {
    ja: (chain) => `${chain}チェーンで正式保存したで！`,
    en: (chain) => `Saved with ${chain} chain!`,
  },
  save_fail_msg: { ja: '保存に失敗したで', en: 'Failed to save' },
  delete_pending_confirm_msg: { ja: 'この仮保存レコードを削除しますか？', en: 'Delete this pending record?' },

  // PendingCard
  pending_select_chain_label: { ja: 'チェーンを選んでや：', en: 'Select a chain:' },
  confirm_pending_btn: { ja: '✅ 正式保存', en: '✅ Confirm Save' },
  delete_btn:          { ja: '🗑️ 削除',    en: '🗑️ Delete' },
};

// ─────────────────────────────────────────
// Context 本体
// ─────────────────────────────────────────

const LanguageContext = createContext({
  lang: 'ja',
  setLang: () => {},
  t: (key) => key,
});

/**
 * LanguageProvider
 *   App.js でアプリ全体を包む。
 *   起動時に AsyncStorage から言語を読み、state で全画面に配る。
 */
export function LanguageProvider({ children }) {
  // 初期値 'ja'（AsyncStorage読み込み完了までの一瞬も空白にならない）
  const [lang, setLangState] = useState('ja');

  // 起動時に保存済み言語を復元
  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY)
      .then((saved) => {
        if (saved === 'ja' || saved === 'en') setLangState(saved);
      })
      .catch(() => {});
  }, []);

  // 言語を切り替えて保存
  const setLang = (next) => {
    setLangState(next);
    AsyncStorage.setItem(LANG_KEY, next).catch(() => {});
  };

  /**
   * t関数 : キーから現在言語の文言を取り出す
   * @param {string} key  辞書のキー
   * @param {...any} args タイプB（関数）に渡す引数
   */
  const t = (key, ...args) => {
    const entry = DICT[key];

    // フォールバック①：キーが辞書に無い → キー名をそのまま返す（クラッシュ防止）
    if (!entry) return key;

    // 現在言語の値を取得。無ければ ja にフォールバック
    const value = entry[lang] ?? entry.ja;

    // 型判定：関数なら実行、文字列ならそのまま返す
    if (typeof value === 'function') return value(...args);
    return value;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * useI18n : 各画面で言語機能を使うためのフック
 *   const { lang, setLang, t } = useI18n();
 */
export function useI18n() {
  return useContext(LanguageContext);
}
