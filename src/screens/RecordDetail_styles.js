/**
 * RecordDetail_styles.js
 * RecordDetail 画面用スタイルシート
 */

import { StyleSheet } from 'react-native';

export const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0a0a0a' },
  scroll:       { flex: 1, padding: 16 },

  // ヘッダーカード
  headerCard:   { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 12 },
  categoryRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  categoryText: { fontSize: 18, fontWeight: 'bold', color: '#fff', flex: 1 },
  confBadge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  confText:     { fontSize: 11, fontWeight: 'bold' },
  amountText:   { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  warningText:  { fontSize: 11, color: '#ff4444', marginTop: 4 },

  // セクション
  section:      { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 12, color: '#555', marginBottom: 10, letterSpacing: 1 },

  // フィールド行
  fieldRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
                  borderBottomWidth: 1, borderBottomColor: '#222' },
  fieldLabel:   { fontSize: 13, color: '#888', width: 120 },
  fieldValue:   { fontSize: 13, color: '#fff', flex: 1 },
  fieldInput:   { flex: 1, fontSize: 13, color: '#fff', borderWidth: 1, borderColor: '#444',
                  borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#111' },
  fieldNull:    { fontSize: 13, color: '#444', flex: 1 },

  // チェーン選択（編集時）
  chainRow:     { flexDirection: 'row', gap: 8, flex: 1 },
  chainBtn:     { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8,
                  borderWidth: 1.5, alignItems: 'center' },
  chainBtnText: { fontSize: 13, fontWeight: 'bold' },

  // カテゴリ選択（編集時）
  catScroll:    { flex: 1 },
  catBtn:       { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                  borderWidth: 1, borderColor: '#444', marginRight: 6, marginBottom: 4 },
  catBtnActive: { borderColor: '#00ff88', backgroundColor: '#001a0e' },
  catBtnText:   { fontSize: 11, color: '#888' },
  catBtnTextActive: { color: '#00ff88' },

  // ボトムボタンエリア
  bottomBar:    { padding: 16, backgroundColor: '#0a0a0a',
                  borderTopWidth: 1, borderTopColor: '#222', gap: 10 },
  editBtn:      { backgroundColor: '#1a3a2a', borderRadius: 12, paddingVertical: 14,
                  alignItems: 'center', borderWidth: 1, borderColor: '#00ff88' },
  editBtnText:  { color: '#00ff88', fontWeight: 'bold', fontSize: 15 },
  saveBtn:      { backgroundColor: '#00ff88', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText:  { color: '#000', fontWeight: 'bold', fontSize: 15 },
  cancelBtn:    { backgroundColor: '#1a1a1a', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText:{ color: '#888', fontSize: 15 },
  deleteBtn:    { padding: 8 },
  deleteBtnText:{ color: '#ff4444', fontSize: 13 },

  // boolean トグル行
  toggleRow:    { flexDirection: 'row', alignItems: 'center',
                  justifyContent: 'space-between', paddingVertical: 8,
                  borderBottomWidth: 1, borderBottomColor: '#222' },
});
