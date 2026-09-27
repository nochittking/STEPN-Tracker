/**
 * RecordDetail_styles.js
 * RecordDetail 画面用スタイルシート
 *
 * ※ テーマ対応のため makeStyles(colors) 形式。
 *   画面側で useMemo(() => makeStyles(colors), [colors]) して使う。
 */

import { StyleSheet } from 'react-native';

export const makeStyles = (c) => StyleSheet.create({
  container:    { flex: 1, backgroundColor: c.bg },
  scroll:       { flex: 1, padding: 16 },

  // ヘッダーカード
  headerCard:   { backgroundColor: c.bgCard, borderRadius: 12, padding: 16, marginBottom: 12 },
  categoryRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  categoryText: { fontSize: 18, fontWeight: 'bold', color: c.textPrimary, flex: 1 },
  confBadge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  confText:     { fontSize: 11, fontWeight: 'bold' },
  amountText:   { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  warningText:  { fontSize: 11, color: c.expense, marginTop: 4 },

  // セクション
  section:      { backgroundColor: c.bgCard, borderRadius: 12, padding: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 12, color: c.textHint, marginBottom: 10, letterSpacing: 1 },

  // フィールド行
  fieldRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
                  borderBottomWidth: 1, borderBottomColor: c.bgSubtle },
  fieldLabel:   { fontSize: 13, color: c.textMuted, width: 120 },
  fieldValue:   { fontSize: 13, color: c.textPrimary, flex: 1 },
  fieldInput:   { flex: 1, fontSize: 13, color: c.textPrimary, borderWidth: 1, borderColor: c.textFaint,
                  borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: c.bgInput },
  fieldNull:    { fontSize: 13, color: c.textFaint, flex: 1 },

  // チェーン選択（編集時）
  chainRow:     { flexDirection: 'row', gap: 8, flex: 1 },
  chainBtn:     { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8,
                  borderWidth: 1.5, alignItems: 'center' },
  chainBtnText: { fontSize: 13, fontWeight: 'bold',
                  textShadowColor: c.chainTextShadow,
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: c.chainTextShadowRadius },

  // カテゴリ選択（編集時）
  catScroll:    { flex: 1 },
  catBtn:       { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                  borderWidth: 1, borderColor: c.textFaint, marginRight: 6, marginBottom: 4 },
  catBtnActive: { borderColor: c.income, backgroundColor: c.selectedSurface },
  catBtnText:   { fontSize: 11, color: c.textMuted },
  catBtnTextActive: { color: c.income },

  // ボトムボタンエリア
  bottomBar:    { padding: 16, backgroundColor: c.bg,
                  borderTopWidth: 1, borderTopColor: c.bgSubtle, gap: 10 },
  editBtn:      { backgroundColor: c.accentSurfaceOn, borderRadius: 12, paddingVertical: 14,
                  alignItems: 'center', borderWidth: 1, borderColor: c.income },
  editBtnText:  { color: c.income, fontWeight: 'bold', fontSize: 15 },
  saveBtn:      { backgroundColor: c.income, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText:  { color: c.onPrimary, fontWeight: 'bold', fontSize: 15 },
  cancelBtn:    { backgroundColor: c.bgCard, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText:{ color: c.textMuted, fontSize: 15 },
  deleteBtn:    { padding: 8 },
  deleteBtnText:{ color: c.expense, fontSize: 13 },

  // boolean トグル行
  toggleRow:    { flexDirection: 'row', alignItems: 'center',
                  justifyContent: 'space-between', paddingVertical: 8,
                  borderBottomWidth: 1, borderBottomColor: c.bgSubtle },
});
