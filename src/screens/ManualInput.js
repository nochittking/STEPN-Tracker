/**
 * ManualInput.js  v3.4.0
 *
 * 手動入力画面
 * - 大分類 → 細分類の2段階カテゴリ選択
 * - チェーン・金額・日時・メモを入力
 * - StorageService.saveRecord で保存
 *
 * v3.4.0 変更点：
 *   - 多言語対応（useI18n）を追加。
 *   - MANUAL_GROUPS のキーが日本語（'💚 収入' 等）で表示ラベルを兼ねていたため、
 *     安定キー + 辞書キーを持つ配列構造に変更した。
 *     （selectedGroup が保持する値も日本語文字列から安定キーに変わっている）
 *   - カテゴリ名は ImportScreen_constants の CATEGORY_LABELS ではなく
 *     i18n の cat_* を参照するように変更。
 */

import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, SafeAreaView,
} from 'react-native';
import { StorageService } from '../services/StorageService';
import { useI18n } from '../i18n/i18n';   // ★ 多言語対応
import { useTheme } from '../theme/theme';   // ★ テーマ対応

// ─────────────────────────────────────────
// 定数
// ─────────────────────────────────────────


/** 手動入力用カテゴリグループ（8大分類 → 22カテゴリ）
 *  key      : 内部用の安定キー（selectedGroup が保持する値）
 *  labelKey : i18n の辞書キー
 *  cats     : そのグループに属するカテゴリ
 *  ※ カテゴリの構成は引き継ぎドキュメントの MANUAL_GROUPS が正典。変更しないこと。 */
const MANUAL_GROUPS = [
  { key: 'income',   labelKey: 'group_income',    cats: ['move_result', 'mb_result', 'marketplace_sell', 'spending_deposit'] },
  { key: 'repair',   labelKey: 'mgroup_repair',   cats: ['repair_hp', 'repair_durability', 'level_up', 'socket_unlock', 'shoe_enhance'] },
  { key: 'gem',      labelKey: 'mgroup_gem',      cats: ['gem_upgrade_success', 'gem_upgrade_fail', 'gem_upgrade_confirm'] },
  { key: 'mint',     labelKey: 'mgroup_mint',     cats: ['shoe_mint_cost', 'shoe_mint_result'] },
  { key: 'mb',       labelKey: 'mgroup_mb',       cats: ['mystery_box_open'] },
  { key: 'market',   labelKey: 'mgroup_market',   cats: ['marketplace_buy', 'marketplace_listing'] },
  { key: 'transfer', labelKey: 'mgroup_transfer', cats: ['spending_withdraw'] },
  { key: 'other',    labelKey: 'mgroup_other',    cats: ['success_rate_increment', 'point_redistribution', 'vip_membership', 'home'] },
];

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

/** 種別 → i18n辞書キー（RecordListScreen のタブと共通のキーを再利用） */
const TYPE_LABEL_KEYS = {
  income: 'group_income', expense: 'group_expense',
  info:   'group_info',   listing: 'group_listing',
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
  const { t } = useI18n();   // ★ 多言語対応
  const { colors, chainColors } = useTheme();   // ★ テーマ対応
  const s = useMemo(() => makeStyles(colors), [colors]);

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
      Alert.alert(t('mi_err_title'), t('mi_err_no_cat')); return;
    }
    if (!chain) {
      Alert.alert(t('mi_err_title'), t('chain_required_msg')); return;
    }
    const ts = parseDateTime(dateStr);
    if (!ts) {
      Alert.alert(t('mi_err_title'), t('mi_err_datetime')); return;
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
      Alert.alert(t('set_save_done_title'), t('mi_saved_msg'), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert(t('set_error_title'), t('set_save_fail_msg', e.message));
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
          <Text style={s.sectionTitle}>{t('mi_sec_category')}</Text>

          {/* 大分類ボタン */}
          <View style={s.groupRow}>
            {MANUAL_GROUPS.map((g) => (
              <TouchableOpacity
                key={g.key}
                style={[s.groupBtn, selectedGroup === g.key && s.groupBtnActive]}
                onPress={() => { setSelectedGroup(g.key); setSelectedCategory(null); }}
              >
                <Text style={[s.groupBtnText, selectedGroup === g.key && s.groupBtnTextActive]}>
                  {t(g.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 細分類ボタン */}
          {selectedGroup && (
            <View style={s.catRow}>
              {(MANUAL_GROUPS.find((g) => g.key === selectedGroup)?.cats ?? []).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[s.catBtn, selectedCategory === cat && s.catBtnActive]}
                  onPress={() => handleSelectCategory(cat)}
                >
                  <Text style={[s.catBtnText, selectedCategory === cat && s.catBtnTextActive]}>
                    {t('cat_' + cat)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 選択中カテゴリ表示 */}
          {selectedCategory && (
            <View style={s.selectedBadge}>
              <Text style={s.selectedBadgeText}>
                ✅ {t('cat_' + selectedCategory)}
                {'  '}
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                  {t(TYPE_LABEL_KEYS[selectedType] ?? 'group_expense')}
                </Text>
              </Text>
            </View>
          )}
        </View>

        {/* ── チェーン ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('mi_sec_chain')}</Text>
          <View style={s.chainRow}>
            {['SOL', 'BNB', 'POL'].map((c) => (
              <TouchableOpacity
                key={c}
                style={[s.chainBtn, {
                  borderColor: chainColors[c],
                  backgroundColor: chain === c ? chainColors[c] + '33' : 'transparent',
                }]}
                onPress={() => setChain(c)}
              >
                <Text style={[s.chainBtnText, { color: chainColors[c] }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── 金額 ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('mi_sec_amount')}</Text>
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>GST</Text>
            <TextInput
              style={s.fieldInput}
              value={gst}
              onChangeText={setGst}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textHint}
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
              placeholderTextColor={colors.textHint}
            />
          </View>
        </View>

        {/* ── 日時 ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('mi_sec_datetime')}</Text>
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>{t('mi_field_datetime')}</Text>
            <TextInput
              style={s.fieldInput}
              value={dateStr}
              onChangeText={setDateStr}
              placeholder="2026/06/11 14:30"
              placeholderTextColor={colors.textHint}
            />
          </View>
          <Text style={s.hint}>{t('mi_datetime_hint')}</Text>
        </View>

        {/* ── メモ ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('mi_sec_memo')}</Text>
          <TextInput
            style={[s.fieldInput, { minHeight: 60, textAlignVertical: 'top', padding: 10 }]}
            value={memo}
            onChangeText={setMemo}
            placeholder={t('mi_memo_ph')}
            placeholderTextColor={colors.textHint}
            multiline
          />
        </View>

      </ScrollView>

      {/* 保存ボタン（固定） */}
      <View style={s.bottomBar}>
        <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
          <Text style={s.saveBtnText}>{t('set_save_btn')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────
// スタイル
// ─────────────────────────────────────────

const makeStyles = (c) => StyleSheet.create({
  container:         { flex: 1, backgroundColor: c.bg },
  scroll:            { flex: 1, padding: 16 },
  section:           { backgroundColor: c.bgCard, borderRadius: 12,
                       padding: 14, marginBottom: 12 },
  sectionTitle:      { fontSize: 12, color: c.textHint, marginBottom: 10, letterSpacing: 1 },

  // 大分類
  groupRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  groupBtn:          { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
                       borderWidth: 1, borderColor: c.borderLight },
  groupBtnActive:    { borderColor: c.income, backgroundColor: c.accentBg },
  groupBtnText:      { fontSize: 12, color: c.textDim },
  groupBtnTextActive:{ color: c.income },

  // 細分類
  catRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  catBtn:            { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
                       borderWidth: 1, borderColor: c.borderLight },
  catBtnActive:      { borderColor: c.infoAlt, backgroundColor: c.infoAltBg },
  catBtnText:        { fontSize: 12, color: c.textMuted },
  catBtnTextActive:  { color: c.infoAlt },

  // 選択中バッジ
  selectedBadge:     { backgroundColor: c.badgeSurface, borderRadius: 8,
                       padding: 8, marginTop: 4 },
  selectedBadgeText: { color: c.income, fontSize: 13, fontWeight: 'bold' },

  // チェーン
  chainRow:          { flexDirection: 'row', gap: 10 },
  chainBtn:          { flex: 1, paddingVertical: 10, borderRadius: 8,
                       borderWidth: 1.5, alignItems: 'center' },
  chainBtnText:      { fontWeight: 'bold', fontSize: 13,
                       textShadowColor: c.chainTextShadow,
                       textShadowOffset: { width: 0, height: 0 },
                       textShadowRadius: c.chainTextShadowRadius },
  // フィールド
  fieldRow:          { flexDirection: 'row', alignItems: 'center',
                       marginBottom: 8 },
  fieldLabel:        { fontSize: 13, color: c.textMuted, width: 50 },
  fieldInput:        { flex: 1, fontSize: 14, color: c.textPrimary, borderWidth: 1,
                       borderColor: c.borderLight, borderRadius: 8, paddingHorizontal: 12,
                       paddingVertical: 8, backgroundColor: c.bgInput },
  hint:              { fontSize: 11, color: c.textFaint, marginTop: 2 },

  // ボトムバー
  bottomBar:         { padding: 16, backgroundColor: c.bg,
                       borderTopWidth: 1, borderTopColor: c.bgSubtle },
  saveBtn:           { backgroundColor: c.income, borderRadius: 12,
                       paddingVertical: 16, alignItems: 'center' },
  saveBtnText:       { color: c.onPrimary, fontWeight: 'bold', fontSize: 16 },
});
