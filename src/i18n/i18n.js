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

  // ─────────────────────────────────────────
  // SettingsScreen
  // ─────────────────────────────────────────

  set_page_title:  { ja: '⚙️ 設定',    en: '⚙️ Settings' },
  set_chain_title: { ja: '🔗 チェーン', en: '🔗 Chain' },

  // ── 初期残高セクション ──
  // タイプB：チェーン名が入る
  set_init_title: {
    ja: (chain) => `💰 Spending初期残高（${chain}）`,
    en: (chain) => `💰 Initial Spending Balance (${chain})`,
  },
  set_init_hint: {
    ja: 'このアプリで記録を始める前の残高を入力してや',
    en: 'Enter your balance from before you started tracking with this app',
  },
  set_save_btn:  { ja: '💾 保存する', en: '💾 Save' },
  set_saved_btn: { ja: '✅ 保存済み', en: '✅ Saved' },

  // Alert（保存結果）
  set_save_done_title: { ja: '保存完了', en: 'Saved' },
  // タイプB：チェーン名が入る
  set_save_done_msg: {
    ja: (chain) => `${chain}チェーンの初期残高を保存したで！`,
    en: (chain) => `Saved the initial balance for the ${chain} chain!`,
  },
  set_error_title: { ja: 'エラー', en: 'Error' },
  // タイプB：エラーメッセージが入る
  set_save_fail_msg: {
    ja: (msg) => `保存に失敗したで：${msg}`,
    en: (msg) => `Failed to save: ${msg}`,
  },

  // ── 残高照合セクション ──
  // タイプB：チェーン名が入る
  set_verify_title: {
    ja: (chain) => `🔍 Spending残高照合（${chain}）`,
    en: (chain) => `🔍 Verify Spending Balance (${chain})`,
  },
  set_verify_hint: {
    ja: 'STEPNアプリのSpending残高と比較して、差異をチェックするで',
    en: 'Compare with the Spending balance in the STEPN app to check for differences',
  },
  set_calc_label: {
    ja: '📊 計算残高（初期残高 + 収入 − 支出）',
    en: '📊 Calculated Balance (Initial + Income − Expense)',
  },
  set_actual_hint: {
    ja: 'STEPNアプリの実際の残高を入力してや',
    en: 'Enter the actual balance shown in the STEPN app',
  },
  set_actual_gst_ph: { ja: '実際のGST残高', en: 'Actual GST balance' },
  set_actual_gmt_ph: { ja: '実際のGMT残高', en: 'Actual GMT balance' },
  set_verify_btn:    { ja: '🔍 照合する',  en: '🔍 Verify' },
  set_result_title:  { ja: '照合結果',     en: 'Result' },
  set_diff_gst:      { ja: 'GST 差異',     en: 'GST Diff' },
  set_diff_gmt:      { ja: 'GMT 差異',     en: 'GMT Diff' },
  set_warn_text: {
    ja: '⚠️ 差異がある場合、未記録の取引がある可能性があるで。手動入力やスクショ取込で補完してみてや！',
    en: '⚠️ A difference may mean some transactions are not recorded yet. Try adding them via manual input or screenshot import!',
  },

  // ── 取扱説明書 ──
  set_guide_menu: { ja: '📖 取扱説明書（使い方ガイド）', en: '📖 User Guide' },

  // ── 言語セクション（Coming Soon から実装済みに昇格） ──
  set_lang_title: { ja: '🌐 言語 / Language', en: '🌐 Language / 言語' },
  set_lang_hint: {
    ja: '選んだ言語は次回起動時も保持されるで',
    en: 'Your choice is kept the next time you open the app',
  },

  // ── テーマセクション（Coming Soon から実装済みに昇格） ──
  set_theme_title: { ja: '🎨 テーマ', en: '🎨 Theme' },
  set_theme_hint: {
    ja: '選んだテーマは次回起動時も保持されるで',
    en: 'Your choice is kept the next time you open the app',
  },
  set_theme_dark:  { ja: 'ダーク', en: 'Dark' },
  set_theme_light: { ja: 'ライト', en: 'Light' },

  // ── 今後のアップデート ──
  set_coming_title:    { ja: '🚀 今後のアップデート',    en: '🚀 Coming Updates' },
  set_coming_theme:    { ja: 'テーマ（ダーク / ライト）',  en: 'Theme (Dark / Light)' },
  set_coming_fontsize: { ja: '文字サイズ（小 / 中 / 大）', en: 'Font Size (S / M / L)' },
  set_coming_badge:    { ja: 'Coming Soon',             en: 'Coming Soon' },

  // ── アプリ情報 ──
  //   ※ 固有名詞・技術名は翻訳せず、ラベルのみ多言語化する方針
  set_app_info_title: { ja: '📱 アプリ情報', en: '📱 App Info' },
  set_dev_label:      { ja: '開発：',        en: 'Developer: ' },
  set_tech_label:     { ja: '技術：',        en: 'Tech: ' },

  // ─────────────────────────────────────────
  // CsvExportModal
  //   ※ ここにあるのは「画面UI」の文言のみ。
  //     CSVファイルの中身（28列ヘッダー・カテゴリ名・ファイル名）は
  //     言語設定にかかわらず常に日本語固定とする。
  //     理由：確定申告用の出力であり、言語を切り替えた前後で列名が変わると
  //           過去に出力したCSVと結合したときに集計が壊れるため。
  //     → CsvExportModal.js の buildCsv / CATEGORY_LABELS / buildFilename は
  //       t() を通さないこと。
  // ─────────────────────────────────────────

  csv_title:          { ja: '📊 CSV出力',    en: '📊 Export CSV' },
  csv_section_chain:  { ja: '── チェーン ──', en: '── Chain ──' },
  csv_section_period: { ja: '── 期間 ──',    en: '── Period ──' },

  // チェーン選択
  csv_chain_all: { ja: '全チェーン', en: 'All Chains' },
  // タイプB：チェーン名が入る（SOL のみ / SOL only）
  csv_chain_only: {
    ja: (chain) => `${chain} のみ`,
    en: (chain) => `${chain} only`,
  },

  // 期間選択
  //   ※ 「全期間」は既存の label_all を再利用するため、ここでは定義しない
  // タイプB：年月が入る
  csv_period_this_month: {
    ja: (year, month) => `今月（${year}年${month}月）`,
    en: (year, month) => `This Month (${EN_MONTHS[month - 1]} ${year})`,
  },
  // タイプB：年が入る
  csv_period_this_year: {
    ja: (year) => `今年（${year}年）`,
    en: (year) => `This Year (${year})`,
  },
  csv_period_custom: { ja: '月を指定', en: 'Pick a Month' },

  // ボタン
  csv_cancel:     { ja: 'キャンセル', en: 'Cancel' },
  csv_export_btn: { ja: '出力する',   en: 'Export' },

  // Alert
  //   ※ 「エラー」タイトルは既存の set_error_title を再利用する
  csv_err_range:     { ja: '期間の取得に失敗したで', en: 'Failed to determine the period' },
  csv_no_data_title: { ja: 'データなし',            en: 'No Data' },
  csv_no_data_msg:   { ja: '該当するレコードがなかったで', en: 'No matching records found' },
  csv_no_share:      {
    ja: 'このデバイスでは共有機能が使えへんみたいやで',
    en: 'Sharing does not seem to be available on this device',
  },
  // タイプB：エラーメッセージが入る
  csv_fail_msg: {
    ja: (msg) => `CSV出力に失敗したで：${msg}`,
    en: (msg) => `Failed to export CSV: ${msg}`,
  },
  // タイプB：ファイル名が入る（共有シートのタイトル）
  csv_share_dialog: {
    ja: (filename) => `${filename} を共有`,
    en: (filename) => `Share ${filename}`,
  },

  // ─────────────────────────────────────────
  // ManualInput
  // ─────────────────────────────────────────

  // ── 手動入力の8大分類 ──
  //   ※ 「💚 収入」は既存の group_income を再利用するため、ここでは定義しない
  mgroup_repair:   { ja: '🔧 修復・強化', en: '🔧 Repair & Upgrade' },
  mgroup_gem:      { ja: '💎 ジェム',     en: '💎 Gems' },
  mgroup_mint:     { ja: '👟 ミント',     en: '👟 Minting' },
  mgroup_mb:       { ja: '📦 MB',        en: '📦 MB' },
  mgroup_market:   { ja: '🏪 マーケット',  en: '🏪 Marketplace' },
  mgroup_transfer: { ja: '💸 送金',       en: '💸 Transfer' },
  mgroup_other:    { ja: '⚙️ その他',     en: '⚙️ Other' },

  // ── セクション見出し ──
  mi_sec_category: { ja: 'カテゴリ',      en: 'CATEGORY' },
  mi_sec_chain:    { ja: 'チェーン',      en: 'CHAIN' },
  mi_sec_amount:   { ja: '金額',          en: 'AMOUNT' },
  mi_sec_datetime: { ja: '日時',          en: 'DATE & TIME' },
  mi_sec_memo:     { ja: 'メモ（任意）',  en: 'MEMO (OPTIONAL)' },

  // ── 入力欄 ──
  mi_field_datetime: { ja: '日時',        en: 'When' },
  mi_datetime_hint:  { ja: '形式：YYYY/MM/DD HH:MM', en: 'Format: YYYY/MM/DD HH:MM' },
  mi_memo_ph:        { ja: 'メモを入力（任意）',      en: 'Enter a memo (optional)' },

  // ── Alert ──
  //   ※ 「保存完了」は set_save_done_title、「エラー」は set_error_title、
  //     「保存に失敗したで：」は set_save_fail_msg、
  //     「チェーンを選んでや！」は chain_required_msg を再利用する
  mi_err_title:    { ja: '入力エラー',          en: 'Input Error' },
  mi_err_no_cat:   { ja: 'カテゴリを選んでや！', en: 'Please select a category!' },
  mi_err_datetime: {
    ja: '日時は YYYY/MM/DD HH:MM 形式で入力してや\n例：2026/06/11 14:30',
    en: 'Enter the date and time as YYYY/MM/DD HH:MM\ne.g. 2026/06/11 14:30',
  },
  mi_saved_msg:    { ja: '記録を保存したで！',   en: 'Record saved!' },

  // ─────────────────────────────────────────
  // RecordDetail
  // ─────────────────────────────────────────

  // ── 画面UI ──
  //   ※ 「🗑️ 削除」は delete_btn、「💾 保存する」は set_save_btn、
  //     「キャンセル」は csv_cancel、信頼度バッジは conf_high/mid/low を再利用する
  rd_title:        { ja: 'レコード詳細',       en: 'Record Detail' },
  rd_back:         { ja: '← 戻る',            en: '← Back' },
  rd_thumb_close:  { ja: '✕ タップで閉じる',   en: '✕ Tap to close' },
  rd_thumb_zoom:   { ja: '🔍 拡大',           en: '🔍 Zoom' },
  rd_sec_basic:    { ja: '基本情報',          en: 'Basic Info' },
  rd_sec_detail:   { ja: '詳細情報',          en: 'Details' },
  rd_field_chain:  { ja: 'チェーン',          en: 'Chain' },
  rd_chain_none:   { ja: '未選択',            en: 'Not set' },
  rd_field_datetime: { ja: '日時',            en: 'Date & Time' },
  rd_field_gst:    { ja: 'GST金額',           en: 'GST Amount' },
  rd_field_gmt:    { ja: 'GMT金額',           en: 'GMT Amount' },
  rd_field_category: { ja: 'カテゴリ',        en: 'Category' },
  rd_field_type:   { ja: '種別',              en: 'Type' },
  rd_edit_btn:     { ja: '✏️ 編集する',        en: '✏️ Edit' },
  rd_bool_yes:     { ja: '✅ はい',            en: '✅ Yes' },
  rd_bool_no:      { ja: '❌ いいえ',          en: '❌ No' },

  // ── Alert ──
  rd_save_fail:    { ja: '保存失敗',          en: 'Save Failed' },
  rd_delete_fail:  { ja: '削除失敗',          en: 'Delete Failed' },
  rd_del_title:    { ja: '削除確認',          en: 'Confirm Delete' },
  rd_del_msg: {
    ja: 'このレコードを削除してええ？\nこの操作は元に戻せへんで。',
    en: 'Delete this record?\nThis cannot be undone.',
  },
  rd_del_action:   { ja: '削除',              en: 'Delete' },

  // ── 詳細フィールド名（extra の各キー） ──
  //   ※ STEPN の専門用語（GST/GMT/EN/MB/HP/Durability/Genesis/VIP）は訳さない
  fld_earn_mode:        { ja: 'アーンモード',  en: 'Earn Mode' },
  fld_earn_amount:      { ja: '獲得量',        en: 'Earned' },
  fld_move_date:        { ja: 'ムーブ日時',    en: 'Move Date' },
  fld_duration:         { ja: '時間',          en: 'Duration' },
  fld_distance_km:      { ja: '距離(km)',      en: 'Distance (km)' },
  fld_en_used:          { ja: 'EN消費',        en: 'EN Used' },
  fld_mb_obtained:      { ja: 'MB取得',        en: 'MB Obtained' },
  fld_mb_level:         { ja: 'MBレベル',      en: 'MB Level' },
  fld_mb_quality:       { ja: 'MB品質',        en: 'MB Quality' },
  fld_hp_before:        { ja: 'HP修復前',      en: 'HP Before' },
  fld_hp_after:         { ja: 'HP修復後',      en: 'HP After' },
  fld_hp_gained:        { ja: 'HP増加',        en: 'HP Gained' },
  fld_durability_before:{ ja: 'Durability修復前', en: 'Durability Before' },
  fld_durability_after: { ja: 'Durability修復後', en: 'Durability After' },
  fld_shoe_id:          { ja: '靴ID',          en: 'Shoe ID' },
  fld_is_genesis:       { ja: 'Genesis靴',     en: 'Genesis' },
  fld_level_after:      { ja: 'レベル(後)',    en: 'Level (After)' },
  fld_level_before:     { ja: 'レベル(前)',    en: 'Level (Before)' },
  fld_wait_mins:        { ja: '待機時間(分)',  en: 'Wait (min)' },
  fld_socket_type:      { ja: 'ソケットタイプ', en: 'Socket Type' },
  fld_shoe_rarity:      { ja: '靴レアリティ',  en: 'Shoe Rarity' },
  fld_gem_type:         { ja: 'ジェムタイプ',  en: 'Gem Type' },
  fld_is_rainbow:       { ja: 'レインボー',    en: 'Rainbow' },
  fld_rainbow_gem_chance: { ja: 'レインボー確率', en: 'Rainbow Gem Chance' },
  fld_vip_kept_gem:     { ja: 'VIPジェム保持', en: 'VIP Gem Kept' },
  fld_vip_kept_scroll:  { ja: 'VIPミンスク保持', en: 'VIP Scroll Kept' },
  fld_parent1_id:       { ja: '親靴1',         en: 'Parent 1' },
  fld_parent2_id:       { ja: '親靴2',         en: 'Parent 2' },
  fld_double_mint_rate: { ja: 'ダブルミント率', en: 'Double Mint Rate' },
  fld_vip_scroll_chance:{ ja: 'VIPミンスク確率', en: 'VIP Scroll Chance' },
  fld_is_twin:          { ja: '双子',          en: 'Twin' },
  fld_box1_rarity:      { ja: '靴箱1レアリティ', en: 'Box 1 Rarity' },
  fld_box2_rarity:      { ja: '靴箱2レアリティ', en: 'Box 2 Rarity' },
  fld_mb_rarity:        { ja: 'MBレアリティ',  en: 'MB Rarity' },
  fld_base_cost:        { ja: 'ベースコスト',  en: 'Base Cost' },
  fld_boosting_cost:    { ja: 'ブースティング', en: 'Boosting' },
  fld_unlock_time:      { ja: '開封時間',      en: 'Unlock Time' },
  fld_transfer_amount:  { ja: '送金額',        en: 'Amount' },
  fld_transfer_token:   { ja: 'トークン',      en: 'Token' },
  fld_fee_amount:       { ja: '手数料',        en: 'Fee' },
  fld_fee_token:        { ja: '手数料トークン', en: 'Fee Token' },
  fld_from_wallet:      { ja: '送金元',        en: 'From' },
  fld_to_wallet:        { ja: '送金先',        en: 'To' },
  fld_item_type:        { ja: 'アイテムタイプ', en: 'Item Type' },
  fld_gem_level:        { ja: 'ジェムLv',      en: 'Gem Lv' },
  fld_gem_attribute:    { ja: 'ジェムバフ値',  en: 'Gem Buff' },
  fld_scroll_rarity:    { ja: 'ミンスクレアリティ', en: 'Scroll Rarity' },
  fld_shoe_type:        { ja: '靴タイプ',      en: 'Shoe Type' },
  fld_shoe_level:       { ja: '靴レベル',      en: 'Shoe Level' },
  fld_price_gmt:        { ja: '出品価格(GMT)', en: 'Price (GMT)' },
  fld_listing_date:     { ja: '出品日',        en: 'Listed On' },
  fld_rate_type:        { ja: 'レートタイプ',  en: 'Rate Type' },
  fld_rainbow_sneaker_chance: { ja: 'レインボー靴確率', en: 'Rainbow Sneaker Chance' },
  fld_enhance_result:   { ja: '強化結果',      en: 'Enhance Result' },
  fld_gst_balance:      { ja: 'GST残高',       en: 'GST Balance' },
  fld_gmt_balance:      { ja: 'GMT残高',       en: 'GMT Balance' },
  fld_en_current:       { ja: 'EN現在',        en: 'EN Current' },
  fld_en_max:           { ja: 'EN最大',        en: 'EN Max' },
  fld_en_refill_in:     { ja: 'EN補充まで',    en: 'EN Refill In' },
  fld_active_shoe_id:   { ja: '使用中靴ID',    en: 'Active Shoe ID' },
  fld_active_shoe_type: { ja: '靴タイプ',      en: 'Active Shoe Type' },
  fld_active_shoe_level:{ ja: '靴レベル',      en: 'Active Shoe Level' },
  fld_is_vip:           { ja: 'VIP',           en: 'VIP' },
  fld_valid_until:      { ja: 'VIP有効期限',   en: 'Valid Until' },
  fld_points_redistributed: { ja: '振り直しポイント', en: 'Points Redistributed' },
  fld_gmt_per_point:    { ja: 'GMT/ポイント',  en: 'GMT per Point' },
  fld_needs_pixel_scan: { ja: 'ピクセル解析',  en: 'Pixel Scan' },
  fld_pixel_scan_type:  { ja: '解析タイプ',    en: 'Scan Type' },
  fld_result:           { ja: '結果',          en: 'Result' },

  // ─────────────────────────────────────────
  // SettingsScreen_guide（使い方ガイド）
  // ─────────────────────────────────────────

  guide_title: { ja: '📖 STEPN Tracker 使い方ガイド', en: '📖 STEPN Tracker User Guide' },

  guide_home_t: { ja: '🏠 ホーム画面', en: '🏠 Home' },
  guide_home_b: {
    ja: `チェーン（SOL/BNB/POL）を切り替えて、今月の収支サマリーを確認できるで。

チェーン選択は次回起動時も保持される。

ボタンの説明：
・📸 スクショ取込 → STEPNのスクショから自動でデータ読み取り
・✏️ 手動入力 → 手動でレコードを追加
・📋 記録一覧 → 保存済みレコードの確認・編集・削除
・⚙️ 設定 → 初期残高・残高照合・このガイド
・📊 CSV出力 → 確定申告用のCSVファイルを共有`,
    en: `Switch between chains (SOL/BNB/POL) to see this month's summary.

Your chain selection is kept the next time you open the app.

Buttons:
・📸 Import → Read data automatically from STEPN screenshots
・✏️ Manual Input → Add a record by hand
・📋 Records → View, edit and delete saved records
・⚙️ Settings → Initial balance, balance check, this guide
・📊 Export CSV → Share a CSV file for tax filing`,
  },

  guide_import_t: { ja: '📸 スクショ取込', en: '📸 Import' },
  guide_import_b: {
    ja: `カメラロールからSTEPNのスクショを最大20枚まで選択。

ML Kit OCRで自動解析して、カテゴリ・金額を自動判定するで。

対応カテゴリ（自動判定）：
・ムーブ結果（GST/GMT獲得）
・Durability修復 / HP修復
・レベルアップ
・ジェムアップグレード
・ミントコスト / ミント結果
・マーケット購入 / 出品
・MBオープン / MB開封結果
・Spending出金 / 入金
・エンハンスコスト
・成功率UP / ポイント振直し
など

チェーンはスクショのアイコン色から自動判定を試みるけど、
確認画面で手動変更もできるで。`,
    en: `Pick up to 20 STEPN screenshots from your camera roll.

ML Kit OCR analyses them and detects the category and amounts automatically.

Auto-detected categories:
・Move result (GST/GMT earned)
・Durability repair / HP repair
・Level up
・Gem upgrade
・Mint cost / Mint result
・Marketplace buy / listing
・MB open / MB contents
・Spending withdraw / deposit
・Enhancement cost
・Success rate up / Point redistribution
and more

The chain is guessed from the icon colour in the screenshot,
but you can change it by hand on the confirmation screen.`,
  },

  guide_manual_t: { ja: '✏️ 手動入力', en: '✏️ Manual Input' },
  guide_manual_b: {
    ja: `スクショが撮れへんかった取引を手動で記録できる。

大分類 → 細分類の2段階でカテゴリを選んで、
チェーン・金額・日時・メモを入力して保存するだけ。

種別（収入/支出/情報）はカテゴリに応じて自動設定されるで。`,
    en: `Record transactions you could not capture in a screenshot.

Pick a category in two steps (group → category),
then enter the chain, amounts, date and memo, and save.

The type (income/expense/info) is set automatically from the category.`,
  },

  guide_list_t: { ja: '📋 記録一覧', en: '📋 Records' },
  guide_list_b: {
    ja: `保存済みのレコードを一覧表示。

タブ切替：ALL / 収入 / 支出 / 情報 / 売却中 / 仮保存
チェーンフィルタ：ALL / SOL / BNB / POL
ソート：新しい順 / 古い順

レコードをタップ → 詳細画面で編集・メモ追加
選択ボタン → 複数選択してまとめて削除`,
    en: `Lists every saved record.

Tabs: ALL / Income / Expense / Info / Listing / Pending
Chain filter: ALL / SOL / BNB / POL
Sort: Newest first / Oldest first

Tap a record → edit it and add a memo on the detail screen
Select button → choose several and delete them at once`,
  },

  guide_csv_t: { ja: '📊 CSV出力', en: '📊 Export CSV' },
  guide_csv_b: {
    ja: `確定申告用にCSVファイルを出力できる。

出力条件：
・チェーン：全チェーン / SOL / BNB / POL
・期間：今月 / 今年 / 全期間 / 月を指定

出力後はAndroidの共有シートが開くから、
Gmail・Googleドライブ・LINE等で自由に共有してや。

ファイル名の例：stepn_SOL_2026-06.csv

※ CSVの中身（列名・カテゴリ名）は確定申告で使う前提なので、
　 アプリを英語表示にしても常に日本語で出力されるで。
　 言語で列名が変わると、過去に出したCSVと結合したときに集計が壊れるからや。`,
    en: `Export a CSV file for tax filing.

Options:
・Chain: All chains / SOL / BNB / POL
・Period: This month / This year / All time / Pick a month

The Android share sheet opens after the export, so you can send it
through Gmail, Google Drive, LINE or anything else.

Example file name: stepn_SOL_2026-06.csv

※ The contents of the CSV (column names and category names) are always
   written in Japanese, even when the app is set to English, because the
   file is meant for Japanese tax filing. Keeping the columns fixed means
   a new export can still be combined with ones you exported earlier.`,
  },

  guide_balance_t: { ja: '💰 Spending残高照合', en: '💰 Balance Check' },
  guide_balance_b: {
    ja: `設定画面から残高照合ができるで。

仕組み：
  初期残高 ＋ 収入合計 − 支出合計 ＝ 計算残高

この計算残高とSTEPNアプリの実際の残高を比較して、
差異があれば未記録の取引がある可能性を通知する。

差異が0なら ✅、差異があれば ⚠️ で表示。`,
    en: `You can check your balance from the Settings screen.

How it works:
  Initial balance ＋ total income − total expense ＝ calculated balance

It compares that with the actual balance in the STEPN app and warns you
when a difference suggests some transactions are not recorded yet.

✅ when the difference is zero, ⚠️ when there is one.`,
  },

  guide_chain_t: { ja: '🔗 チェーンについて', en: '🔗 About Chains' },
  guide_chain_b: {
    ja: `STEPNは3つのチェーンで動いてる：

・SOL（Solana） → STEPN Greenカラー
・BNB（BNB Smart Chain） → BNB黄色
・POL（Polygon） → STEPN GO紫

GST（ユーティリティトークン）はチェーン別に独立。
GMT（ガバナンストークン）は全チェーン共通。

収支はチェーン別に分けて集計されるで。`,
    en: `STEPN runs on three chains:

・SOL (Solana) → STEPN Green
・BNB (BNB Smart Chain) → BNB Yellow
・POL (Polygon) → STEPN GO Purple

GST (utility token) is separate per chain.
GMT (governance token) is shared across all chains.

Income and expenses are totalled separately for each chain.`,
  },

  guide_notes_t: { ja: '⚠️ 注意事項', en: '⚠️ Notes' },
  guide_notes_b: {
    ja: `・元のスクショは取込後に破棄。ただし一覧表示用に幅300pxのサムネイルを
　端末内に保存する（1枚約50KB）。レコードを消せばサムネイルも消える
・OCR解析は100%正確ではないので、確認画面で必ずチェック
・Spending→Wallet出金手数料は変動するので都度確認
・確定申告の最終判断は税理士に相談してな
・データはAsyncStorage（端末ローカル）に保存
・アプリを削除するとデータも消えるので注意`,
    en: `・The original screenshot is discarded after import, but a 300px-wide
　thumbnail is kept on the device for the list view (about 50KB each).
　Deleting a record also deletes its thumbnail
・OCR is not 100% accurate — always check the confirmation screen
・Spending→Wallet withdrawal fees vary, so check them each time
・Consult a tax accountant for final decisions on your tax return
・Data is stored in AsyncStorage (locally on the device)
・Deleting the app also deletes your data`,
  },

  guide_about_t: { ja: '📱 アプリ情報', en: '📱 App Info' },
  // タイプB：バージョンが入る
  guide_about_b: {
    ja: (version) => `STEPN Tracker v${version}
開発：のっち × Claude
技術：React Native / Expo / ML Kit OCR
対応：Android（Development Build）

お問い合わせやフィードバックは開発者まで。`,
    en: (version) => `STEPN Tracker v${version}
Developer: のっち × Claude
Tech: React Native / Expo / ML Kit OCR
Platform: Android (Development Build)

Please send questions and feedback to the developer.`,
  },
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
