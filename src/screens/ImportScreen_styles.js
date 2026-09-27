/**
 * ImportScreen_styles.js
 * ImportScreen 用スタイルシート
 *
 * ※ テーマ対応のため makeStyles(colors) 形式。
 *   画面側で useMemo(() => makeStyles(colors), [colors]) して使う。
 */

import { StyleSheet } from 'react-native';

export const makeStyles = (c) => StyleSheet.create({
  container:   { flex: 1, backgroundColor: c.bg },
  centerBox:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  // phase共通
  phaseEmoji:  { fontSize: 56, marginBottom: 16 },
  phaseTitle:  { fontSize: 22, fontWeight: 'bold', color: c.textPrimary, marginBottom: 8 },
  phaseSub:    { fontSize: 14, color: c.textHint, marginBottom: 24 },

  // プログレス
  progressBar: { width: '100%', height: 6, backgroundColor: c.bgCard, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill:{ height: '100%', backgroundColor: c.income, borderRadius: 3 },
  progressPct: { color: c.income, fontSize: 13, fontWeight: 'bold' },

  // ボタン
  primaryBtn:     { backgroundColor: c.income, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, marginTop: 16 },
  primaryBtnText: { fontSize: 15, fontWeight: 'bold', color: c.onPrimary },

  // 一括バー
  bulkBar:      { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: c.bgInput, borderBottomWidth: 1, borderBottomColor: c.bgSubtle },
  bulkLabel:    { color: c.textHint, fontSize: 12, marginRight: 8 },
  bulkBtn:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 6 },
  bulkBtnText:  { fontSize: 12, fontWeight: 'bold' },

  // アイテムカード
  itemCard:     { backgroundColor: c.bgCard, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: c.border },

  // サムネイル
  itemTopRow:   { flexDirection: 'row', gap: 10, marginBottom: 8 },
  thumbnail:    { width: 60, height: 80, borderRadius: 6, backgroundColor: c.bgInput },
  thumbnailHint:{ color: c.textHint, fontSize: 9, textAlign: 'center', marginTop: 2 },
  itemRight:    { flex: 1 },

  itemHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 4 },
  itemIndex:    { color: c.textHint, fontSize: 12, width: 24 },
  itemCategory: { flex: 1, color: c.textPrimary, fontSize: 13, fontWeight: 'bold' },
  confBadge:    { borderRadius: 6, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  confBadgeText:{ fontSize: 10, fontWeight: 'bold' },

  // 日時表示・編集
  moveDateText: { color: c.textSecondary, fontSize: 12, marginTop: 4 },
  dateEditBox:  { marginTop: 6, gap: 6 },
  dateInput:    {
    backgroundColor: c.bgInput, borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 6, color: c.textPrimary, fontSize: 12,
    borderWidth: 1, borderColor: c.borderLight,
  },
  dateSaveBtn:  { backgroundColor: c.accentBgSolid, borderRadius: 8, paddingVertical: 6, alignItems: 'center', borderWidth: 1, borderColor: c.income },
  dateSaveBtnText: { color: c.income, fontSize: 12, fontWeight: 'bold' },

  // 画像拡大モーダル
  imageModalOverlay: { flex: 1, backgroundColor: c.overlayStrong, justifyContent: 'center', alignItems: 'center' },
  imageModalFull:    { width: '90%', height: '80%' },
  imageModalHint:    { color: c.textHint, fontSize: 12, marginTop: 12 },

  subTypeRow:   { backgroundColor: c.bgInput, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 6, alignSelf: 'flex-start' },
  subTypeText:  { color: c.textSecondary, fontSize: 12 },

  // MB紐付け
  mbLinkBox:       { backgroundColor: c.infoBg, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.infoBorder },
  mbLinkTitle:     { color: c.textSecondary, fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
  mbLinkBtn:       { backgroundColor: c.bgInput, borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: c.borderLight },
  mbLinkBtnActive: { backgroundColor: c.accentBgSolid, borderColor: c.income },
  mbLinkBtnText:   { color: c.textSecondary, fontSize: 12 },
  mbLinkHint:      { color: c.textHint, fontSize: 11, marginTop: 4, lineHeight: 18 },

  // 金額
  amountRow:    { flexDirection: 'row', gap: 12, marginBottom: 8, flexWrap: 'wrap' },
  amount:       { fontSize: 15, fontWeight: 'bold' },

  // 提案バナー
  suggestionBanner: { backgroundColor: c.suggestionSurface, borderRadius: 8, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: c.info },
  suggestionText:   { color: c.info, fontSize: 12 },

  // ワーニング
  warningBox:   { backgroundColor: c.warningSurface, borderRadius: 8, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: c.warning },
  warningText:  { color: c.warning, fontSize: 11 },

  // チェーン選択
  chainRow:     { flexDirection: 'row', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 6 },
  chainLabel:   { color: c.textHint, fontSize: 12 },
  chainBtn:     { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5 },
  chainBtnText: { fontWeight: 'bold', fontSize: 12,
                  textShadowColor: c.chainTextShadow,
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: c.chainTextShadowRadius },
  chainUnset:   { color: c.pending, fontSize: 11 },

  // 手動カテゴリ選択
  manualBox:       { backgroundColor: c.bgInput, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.borderLight },
  manualTitle:     { color: c.textSecondary, fontSize: 13, marginBottom: 10 },
  manualGroupRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  manualGroupBtn:  { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.borderLight },
  manualGroupText: { color: c.textSecondary, fontSize: 12 },
  manualCatWrap:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  manualCatBtn:    { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.borderLight },
  manualCatText:   { color: c.textSecondary, fontSize: 11 },

  // 特殊フロー
  specialBox:    { backgroundColor: c.specialSurface, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.specialBorder },
  specialTitle:  { color: c.textSecondary, fontSize: 13, marginBottom: 10, fontWeight: 'bold' },
  specialSub:    { color: c.textHint, fontSize: 12, marginBottom: 8 },
  specialRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  specialCol:    { gap: 8 },
  specialBtn:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, flex: 1, alignItems: 'center' },
  specialBtnText:{ fontSize: 13, fontWeight: 'bold', color: c.textPrimary },
  specialOkBtn:  { backgroundColor: c.accentBgSolid, borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: c.income },
  specialOkText: { color: c.income, fontWeight: 'bold' },

  // MB Lvグリッド
  mbGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mbBtn:         { backgroundColor: c.bgInput, borderRadius: 8, padding: 8, alignItems: 'center', width: '22%', borderWidth: 1, borderColor: c.borderLight },
  mbBtnLv:       { color: c.textSecondary, fontSize: 11 },
  mbBtnName:     { color: c.textPrimary, fontSize: 10, fontWeight: 'bold' },

  // MBアイテム
  mbItemsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  mbItemBadge:   { backgroundColor: c.bgInput, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: c.borderLight },
  mbItemText:    { color: c.textPrimary, fontSize: 12, fontWeight: 'bold' },

  // 完了バッジ
  doneBadge:     { backgroundColor: c.accentBgSolid, borderRadius: 8, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: c.income },
  doneText:      { color: c.income, fontSize: 12, fontWeight: 'bold' },

  // 保存バー
  saveBar:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: c.bg, padding: 12, borderTopWidth: 1, borderTopColor: c.bgSubtle },
  saveHint:      { color: c.warning, fontSize: 11, textAlign: 'center', marginBottom: 6 },
  saveBtn:       { backgroundColor: c.income, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveBtnText:   { fontSize: 15, fontWeight: 'bold', color: c.onPrimary },

  // DONE
  doneStats:     { backgroundColor: c.bgCard, borderRadius: 12, padding: 16, marginBottom: 16, width: '100%' },
  doneStatText:  { color: c.income, fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  doneHint:      { color: c.textHint, fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
});
