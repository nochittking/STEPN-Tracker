/**
 * ImportScreen_styles.js
 * ImportScreen 用スタイルシート
 */

import { StyleSheet } from 'react-native';

export const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0a0a0a' },
  centerBox:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  // phase共通
  phaseEmoji:  { fontSize: 56, marginBottom: 16 },
  phaseTitle:  { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  phaseSub:    { fontSize: 14, color: '#555', marginBottom: 24 },

  // プログレス
  progressBar: { width: '100%', height: 6, backgroundColor: '#1a1a1a', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill:{ height: '100%', backgroundColor: '#00ff88', borderRadius: 3 },
  progressPct: { color: '#00ff88', fontSize: 13, fontWeight: 'bold' },

  // ボタン
  primaryBtn:     { backgroundColor: '#00ff88', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, marginTop: 16 },
  primaryBtnText: { fontSize: 15, fontWeight: 'bold', color: '#000' },

  // 一括バー
  bulkBar:      { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: '#222' },
  bulkLabel:    { color: '#555', fontSize: 12, marginRight: 8 },
  bulkBtn:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 6 },
  bulkBtnText:  { fontSize: 12, fontWeight: 'bold' },

  // アイテムカード
  itemCard:     { backgroundColor: '#1a1a1a', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#2a2a2a' },

  // サムネイル
  itemTopRow:   { flexDirection: 'row', gap: 10, marginBottom: 8 },
  thumbnail:    { width: 60, height: 80, borderRadius: 6, backgroundColor: '#111' },
  thumbnailHint:{ color: '#555', fontSize: 9, textAlign: 'center', marginTop: 2 },
  itemRight:    { flex: 1 },

  itemHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 4 },
  itemIndex:    { color: '#555', fontSize: 12, width: 24 },
  itemCategory: { flex: 1, color: '#fff', fontSize: 13, fontWeight: 'bold' },
  confBadge:    { borderRadius: 6, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  confBadgeText:{ fontSize: 10, fontWeight: 'bold' },

  // 日時表示・編集
  moveDateText: { color: '#aaa', fontSize: 12, marginTop: 4 },
  dateEditBox:  { marginTop: 6, gap: 6 },
  dateInput:    {
    backgroundColor: '#111', borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 6, color: '#fff', fontSize: 12,
    borderWidth: 1, borderColor: '#333',
  },
  dateSaveBtn:  { backgroundColor: '#003322', borderRadius: 8, paddingVertical: 6, alignItems: 'center', borderWidth: 1, borderColor: '#00ff88' },
  dateSaveBtnText: { color: '#00ff88', fontSize: 12, fontWeight: 'bold' },

  // 画像拡大モーダル
  imageModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  imageModalFull:    { width: '90%', height: '80%' },
  imageModalHint:    { color: '#555', fontSize: 12, marginTop: 12 },

  subTypeRow:   { backgroundColor: '#111', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 6, alignSelf: 'flex-start' },
  subTypeText:  { color: '#aaa', fontSize: 12 },

  // MB紐付け
  mbLinkBox:       { backgroundColor: '#0d1a2a', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#1a4a6a' },
  mbLinkTitle:     { color: '#aaa', fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
  mbLinkBtn:       { backgroundColor: '#111', borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: '#333' },
  mbLinkBtnActive: { backgroundColor: '#003322', borderColor: '#00ff88' },
  mbLinkBtnText:   { color: '#aaa', fontSize: 12 },
  mbLinkHint:      { color: '#555', fontSize: 11, marginTop: 4, lineHeight: 18 },

  // 金額
  amountRow:    { flexDirection: 'row', gap: 12, marginBottom: 8, flexWrap: 'wrap' },
  amount:       { fontSize: 15, fontWeight: 'bold' },

  // 提案バナー
  suggestionBanner: { backgroundColor: '#002244', borderRadius: 8, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: '#4488ff' },
  suggestionText:   { color: '#4488ff', fontSize: 12 },

  // ワーニング
  warningBox:   { backgroundColor: '#1a1500', borderRadius: 8, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: '#ffaa00' },
  warningText:  { color: '#ffaa00', fontSize: 11 },

  // チェーン選択
  chainRow:     { flexDirection: 'row', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 6 },
  chainLabel:   { color: '#555', fontSize: 12 },
  chainBtn:     { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5 },
  chainBtnText: { fontWeight: 'bold', fontSize: 12 },
  chainUnset:   { color: '#ff8800', fontSize: 11 },

  // 手動カテゴリ選択
  manualBox:       { backgroundColor: '#111', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#333' },
  manualTitle:     { color: '#aaa', fontSize: 13, marginBottom: 10 },
  manualGroupRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  manualGroupBtn:  { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333' },
  manualGroupText: { color: '#aaa', fontSize: 12 },
  manualCatWrap:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  manualCatBtn:    { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333' },
  manualCatText:   { color: '#aaa', fontSize: 11 },

  // 特殊フロー
  specialBox:    { backgroundColor: '#0d1a0d', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#1a4a1a' },
  specialTitle:  { color: '#aaa', fontSize: 13, marginBottom: 10, fontWeight: 'bold' },
  specialSub:    { color: '#555', fontSize: 12, marginBottom: 8 },
  specialRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  specialCol:    { gap: 8 },
  specialBtn:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, flex: 1, alignItems: 'center' },
  specialBtnText:{ fontSize: 13, fontWeight: 'bold', color: '#fff' },
  specialOkBtn:  { backgroundColor: '#003322', borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#00ff88' },
  specialOkText: { color: '#00ff88', fontWeight: 'bold' },

  // MB Lvグリッド
  mbGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mbBtn:         { backgroundColor: '#111', borderRadius: 8, padding: 8, alignItems: 'center', width: '22%', borderWidth: 1, borderColor: '#333' },
  mbBtnLv:       { color: '#aaa', fontSize: 11 },
  mbBtnName:     { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  // MBアイテム
  mbItemsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  mbItemBadge:   { backgroundColor: '#111', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#333' },
  mbItemText:    { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  // 完了バッジ
  doneBadge:     { backgroundColor: '#003322', borderRadius: 8, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: '#00ff88' },
  doneText:      { color: '#00ff88', fontSize: 12, fontWeight: 'bold' },

  // 保存バー
  saveBar:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#0a0a0a', padding: 12, borderTopWidth: 1, borderTopColor: '#222' },
  saveHint:      { color: '#ffaa00', fontSize: 11, textAlign: 'center', marginBottom: 6 },
  saveBtn:       { backgroundColor: '#00ff88', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveBtnText:   { fontSize: 15, fontWeight: 'bold', color: '#000' },

  // DONE
  doneStats:     { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 16, width: '100%' },
  doneStatText:  { color: '#00ff88', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  doneHint:      { color: '#555', fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
});
