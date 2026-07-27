/**
 * ManualInput.js
 *
 * 手動入力画面
 * - 大分類 → 細分類の2段階カテゴリ選択
 * - チェーン・金額・日時・メモを入力
 * - StorageService.saveRecord で保存
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, SafeAreaView,
} from 'react-native';
import { StorageService } from '../services/StorageService';
import { CATEGORY_LABELS } from './ImportScreen_constants';

// ─────────────────────────────────────────
// 定数
// ─────────────────────────────────────────

const CHAIN_COLORS = { SOL: '#9FFB50', BNB: '#F3BA2F', POL: '#9063CD' };

/** 手動入力用カテゴリグループ */
const MANUAL_GROUPS = {
  '💚 収入':     ['move_result', 'mb_result', 'marketplace_sell', 'spending_deposit'],
  '🔧 修復・強化': ['repair_hp', 'repair_durability', 'level_up', 'socket_unlock', 'shoe_enhance'],
  '💎 ジェム':   ['gem_upgrade_success', 'gem_upgrade_fail', 'gem_upgrade_confirm'],
  '👟 ミント':   ['shoe_mint_cost', 'shoe_mint_result'],
  '📦 MB':      ['mystery_box_open'],
  '🏪 マーケット':['marketplace_buy', 'marketplace_listing'],
  '💸 送金':    ['spending_withdraw'],
  '⚙️ その他':  ['success_rate_increment', 'point_redistribution', 'vip_membership', 'home'],
};

/** カテゴリ → 種別マッピング */
const CATEGORY_TYPE = {
  move_result: 'income', mb_result: 'income',
  marketplace_sell: 'income', spending_deposit: 'income',
  repair_hp: 'expense', repair_durability: 'expense',
  level_up: 'expense', socket_unlock: 'expense', shoe_enhance: 'expense',
  gem_upgrade_success: 'expense', gem_upgrade_fail: 'expense', gem_upgrade_confirm: 'expense',
  shoe_mint_cost: 'expense', shoe_mint_result: 'expense',
  mystery_box_open: 'expense', spending_withdraw: 'expense',
  success_rate_increment: 'expense', point_redistribution: 'expense',
  marketplace_buy: 'expense', vip_membership: 'expense',
  marketplace_listing: 'listing', home: 'info',
};

const TYPE_LABELS = {
  income: '💚 収入', expense: '🔴 支出', info: '⚪ 情報', listing: '🏷️ 売却中',
};

/** 現在時刻を "YYYY/MM/DD HH:MM" 形式で返す */
const nowStr = () => {
  const d = new Date();
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  const h  = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${mo}/${da} ${h}:${mi}`;
};

/** "YYYY/MM/DD HH:MM" → ISO文字列（パース失敗時はnull） */
const parseDateTime = (str) => {
  const m = str.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2])-1, Number(m[3]), Number(m[4]), Number(m[5]));
  return isNaN(d.getTime()) ? null : d.toISOString();
};

// ─────────────────────────────────────────
// メイン画面
// ─────────────────────────────────────────

export default function ManualInput({ navigation, route }) {
  const initChain = route.params?.chain ?? 'SOL';

  const [selectedGroup,    setSelectedGroup]    = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedType,     setSelectedType]     = useState('expense');
  const [chain,            setChain]            = useState(initChain);
  const [gst,              setGst]              = useState('0');
  const [gmt,              setGmt]              = useState('0');
  const [dateStr,          setDateStr]          = useState(nowStr());
  const [memo,             setMemo]             = useState('');

  const isSavingRef = useRef(false);

  // カテゴリを選択したら種別を自動設定
  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    setSelectedType(CATEGORY_TYPE[cat] ?? 'expense');
  };

  // 保存
  const handleSave = async () => {
    if (isSavingRef.current) return;

    // バリデーション
    if (!selectedCategory) {
      Alert.alert('入力エラー', 'カテゴリを選んでや！'); return;
    }
    if (!chain) {
      Alert.alert('入力エラー', 'チェーンを選んでや！'); return;
    }
    const ts = parseDateTime(dateStr);
    if (!ts) {
      Alert.alert('入力エラー', '日時は YYYY/MM/DD HH:MM 形式で入力してや\n例：2026/06/11 14:30'); return;
    }

    isSavingRef.current = true;
    try {
      await StorageService.saveRecord({
        category:   selectedCategory,
        type:       selectedType,
        chain,
        gst_amount: Math.abs(parseFloat(gst) || 0),
        gmt_amount: Math.abs(parseFloat(gmt) || 0),
        timestamp:  ts,
        confidence: 1.0,
        memo,
        extra:      {},
      });
      Alert.alert('保存完了', '記録を保存したで！', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('エラー', `保存に失敗したで：${e.message}`);
    } finally {
      isSavingRef.current = false;
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 120 }}
                  keyboardShouldPersistTaps="handled">

        {/* ── カテゴリ選択（大分類） ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>カテゴリ</Text>

          {/* 大分類ボタン */}
          <View style={s.groupRow}>
            {Object.keys(MANUAL_GROUPS).map((grp) => (
              <TouchableOpacity
                key={grp}
                style={[s.groupBtn, selectedGroup === grp && s.groupBtnActive]}
                onPress={() => { setSelectedGroup(grp); setSelectedCategory(null); }}
              >
                <Text style={[s.groupBtnText, selectedGroup === grp && s.groupBtnTextActive]}>
                  {grp}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 細分類ボタン */}
          {selectedGroup && (
            <View style={s.catRow}>
              {MANUAL_GROUPS[selectedGroup].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[s.catBtn, selectedCategory === cat && s.catBtnActive]}
                  onPress={() => handleSelectCategory(cat)}
                >
                  <Text style={[s.catBtnText, selectedCategory === cat && s.catBtnTextActive]}>
                    {CATEGORY_LABELS[cat] ?? cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 選択中カテゴリ表示 */}
          {selectedCategory && (
            <View style={s.selectedBadge}>
              <Text style={s.selectedBadgeText}>
                ✅ {CATEGORY_LABELS[selectedCategory]}
                {'  '}
                <Text style={{ color: '#888', fontSize: 11 }}>
                  {TYPE_LABELS[selectedType]}
                </Text>
              </Text>
            </View>
          )}
        </View>

        {/* ── チェーン ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>チェーン</Text>
          <View style={s.chainRow}>
            {['SOL', 'BNB', 'POL'].map((c) => (
              <TouchableOpacity
                key={c}
                style={[s.chainBtn, {
                  borderColor: CHAIN_COLORS[c],
                  backgroundColor: chain === c ? CHAIN_COLORS[c] + '33' : 'transparent',
                }]}
                onPress={() => setChain(c)}
              >
                <Text style={[s.chainBtnText, { color: CHAIN_COLORS[c] }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── 金額 ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>金額</Text>
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>GST</Text>
            <TextInput
              style={s.fieldInput}
              value={gst}
              onChangeText={setGst}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#555"
            />
          </View>
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>GMT</Text>
            <TextInput
              style={s.fieldInput}
              value={gmt}
              onChangeText={setGmt}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#555"
            />
          </View>
        </View>

        {/* ── 日時 ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>日時</Text>
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>日時</Text>
            <TextInput
              style={s.fieldInput}
              value={dateStr}
              onChangeText={setDateStr}
              placeholder="2026/06/11 14:30"
              placeholderTextColor="#555"
            />
          </View>
          <Text style={s.hint}>形式：YYYY/MM/DD HH:MM</Text>
        </View>

        {/* ── メモ ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>メモ（任意）</Text>
          <TextInput
            style={[s.fieldInput, { minHeight: 60, textAlignVertical: 'top', padding: 10 }]}
            value={memo}
            onChangeText={setMemo}
            placeholder="メモを入力（任意）"
            placeholderTextColor="#555"
            multiline
          />
        </View>

      </ScrollView>

      {/* 保存ボタン（固定） */}
      <View style={s.bottomBar}>
        <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
          <Text style={s.saveBtnText}>💾 保存する</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────
// スタイル
// ─────────────────────────────────────────

const s = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#0a0a0a' },
  scroll:            { flex: 1, padding: 16 },
  section:           { backgroundColor: '#1a1a1a', borderRadius: 12,
                       padding: 14, marginBottom: 12 },
  sectionTitle:      { fontSize: 12, color: '#555', marginBottom: 10, letterSpacing: 1 },

  // 大分類
  groupRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  groupBtn:          { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
                       borderWidth: 1, borderColor: '#333' },
  groupBtnActive:    { borderColor: '#00ff88', backgroundColor: '#00ff8822' },
  groupBtnText:      { fontSize: 12, color: '#666' },
  groupBtnTextActive:{ color: '#00ff88' },

  // 細分類
  catRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  catBtn:            { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
                       borderWidth: 1, borderColor: '#333' },
  catBtnActive:      { borderColor: '#4af', backgroundColor: '#4af2' },
  catBtnText:        { fontSize: 12, color: '#888' },
  catBtnTextActive:  { color: '#4af' },

  // 選択中バッジ
  selectedBadge:     { backgroundColor: '#0d2a1a', borderRadius: 8,
                       padding: 8, marginTop: 4 },
  selectedBadgeText: { color: '#00ff88', fontSize: 13, fontWeight: 'bold' },

  // チェーン
  chainRow:          { flexDirection: 'row', gap: 10 },
  chainBtn:          { flex: 1, paddingVertical: 10, borderRadius: 8,
                       borderWidth: 1.5, alignItems: 'center' },
  chainBtnText:      { fontWeight: 'bold', fontSize: 13 },

  // フィールド
  fieldRow:          { flexDirection: 'row', alignItems: 'center',
                       marginBottom: 8 },
  fieldLabel:        { fontSize: 13, color: '#888', width: 50 },
  fieldInput:        { flex: 1, fontSize: 14, color: '#fff', borderWidth: 1,
                       borderColor: '#333', borderRadius: 8, paddingHorizontal: 12,
                       paddingVertical: 8, backgroundColor: '#111' },
  hint:              { fontSize: 11, color: '#444', marginTop: 2 },

  // ボトムバー
  bottomBar:         { padding: 16, backgroundColor: '#0a0a0a',
                       borderTopWidth: 1, borderTopColor: '#222' },
  saveBtn:           { backgroundColor: '#00ff88', borderRadius: 12,
                       paddingVertical: 16, alignItems: 'center' },
  saveBtnText:       { color: '#000', fontWeight: 'bold', fontSize: 16 },
});
