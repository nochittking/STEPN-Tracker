/**
 * SettingsScreen.js  v3.4.0
 *
 * 設定画面
 * - Spending初期残高（チェーン別）
 * - 残高照合
 * - 取扱説明書リンク
 * - 言語切替（日本語 / English）
 * - Coming Soonプレースホルダー（テーマ・文字サイズ）
 *
 * v3.4.0 変更点：
 *   - 多言語対応（useI18n）を追加。全文言を t() 経由に変更。
 *   - 「今後のアップデート」にあった言語切替の Coming Soon 表示を廃止し、
 *     実際に動く言語セクションへ昇格（HomeScreen のトグルと Context で状態共有）。
 *   - バージョン表記を constants の APP_VERSION 参照に変更（ベタ書きのズレ防止）。
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StorageService } from '../services/StorageService';
import { APP_VERSION } from '../constants';
import { useI18n } from '../i18n/i18n';   // ★ 多言語対応

const CHAIN_COLORS = { SOL: '#9FFB50', BNB: '#F3BA2F', POL: '#9063CD' };
const LANGS = [
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' },
];

export default function SettingsScreen({ navigation }) {
  const { t, lang, setLang } = useI18n();   // ★ 多言語対応

  const [chain,   setChain]   = useState('SOL');
  const [loading, setLoading] = useState(false);

  // 初期残高
  const [initGst, setInitGst] = useState('');
  const [initGmt, setInitGmt] = useState('');
  const [saved,   setSaved]   = useState(false);

  // 残高照合
  const [calcGst,   setCalcGst]   = useState(null);
  const [calcGmt,   setCalcGmt]   = useState(null);
  const [actualGst, setActualGst] = useState('');
  const [actualGmt, setActualGmt] = useState('');
  const [verified,  setVerified]  = useState(false);
  const [diffGst,   setDiffGst]   = useState(null);
  const [diffGmt,   setDiffGmt]   = useState(null);

  // チェーン切替時に初期残高を読み込む
  useFocusEffect(
    useCallback(() => {
      loadSettings(chain);
    }, [chain]),
  );

  const loadSettings = async (c) => {
    setLoading(true);
    setSaved(false);
    setVerified(false);
    setActualGst('');
    setActualGmt('');
    setDiffGst(null);
    setDiffGmt(null);
    try {
      const settings = await StorageService.getSettings();
      const bal = settings?.initial_balances?.[c] ?? {};
      setInitGst(bal.gst != null ? String(bal.gst) : '0');
      setInitGmt(bal.gmt != null ? String(bal.gmt) : '0');

      // 計算残高を取得
      const calc = await StorageService.calcSpendingBalance(c);
      setCalcGst(calc.gst?.calculated ?? 0);
      setCalcGmt(calc.gmt?.calculated ?? 0);
    } catch (e) {
      console.error('[Settings] load error:', e);
    } finally {
      setLoading(false);
    }
  };

  // 初期残高保存
  const handleSaveBalance = async () => {
    const gst = parseFloat(initGst) || 0;
    const gmt = parseFloat(initGmt) || 0;
    try {
      await StorageService.setInitialBalance(chain, { gst, gmt });
      setSaved(true);
      // 計算残高も再取得
      const calc = await StorageService.calcSpendingBalance(chain);
      setCalcGst(calc.gst?.calculated ?? 0);
      setCalcGmt(calc.gmt?.calculated ?? 0);
      Alert.alert(t('set_save_done_title'), t('set_save_done_msg', chain));
    } catch (e) {
      Alert.alert(t('set_error_title'), t('set_save_fail_msg', e.message));
    }
  };

  // 残高照合
  const handleVerify = () => {
    const ag = parseFloat(actualGst) || 0;
    const am = parseFloat(actualGmt) || 0;
    const dg = ag - (calcGst ?? 0);
    const dm = am - (calcGmt ?? 0);
    setDiffGst(dg);
    setDiffGmt(dm);
    setVerified(true);
  };

  const fmtNum = (n) => (n != null && typeof n === 'number') ? n.toFixed(2) : '0.00';
  const diffIcon = (d) => {
    if (d == null) return '';
    return Math.abs(d) < 0.01 ? ' ✅' : ' ⚠️';
  };
  const diffColor = (d) => {
    if (d == null) return '#888';
    return Math.abs(d) < 0.01 ? '#00ff88' : '#ff4444';
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 60 }}
                  keyboardShouldPersistTaps="handled">

        <Text style={s.pageTitle}>{t('set_page_title')}</Text>

        {/* チェーン選択 */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('set_chain_title')}</Text>
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

        {/* 初期残高 */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>
            {t('set_init_title', chain)}
          </Text>
          <Text style={s.hint}>
            {t('set_init_hint')}
          </Text>

          {loading ? (
            <ActivityIndicator size="small" color="#555" style={{ marginVertical: 16 }} />
          ) : (
            <>
              <View style={s.fieldRow}>
                <Text style={s.fieldLabel}>GST</Text>
                <TextInput
                  style={s.fieldInput}
                  value={initGst}
                  onChangeText={(t) => { setInitGst(t); setSaved(false); }}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#555"
                />
              </View>
              <View style={s.fieldRow}>
                <Text style={s.fieldLabel}>GMT</Text>
                <TextInput
                  style={s.fieldInput}
                  value={initGmt}
                  onChangeText={(t) => { setInitGmt(t); setSaved(false); }}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#555"
                />
              </View>
              <TouchableOpacity style={s.saveBtn} onPress={handleSaveBalance}>
                <Text style={s.saveBtnText}>
                  {saved ? t('set_saved_btn') : t('set_save_btn')}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* 残高照合 */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('set_verify_title', chain)}</Text>
          <Text style={s.hint}>
            {t('set_verify_hint')}
          </Text>

          <View style={s.calcBox}>
            <Text style={s.calcLabel}>{t('set_calc_label')}</Text>
            <View style={s.calcRow}>
              <Text style={s.calcToken}>GST</Text>
              <Text style={s.calcValue}>{fmtNum(calcGst)}</Text>
            </View>
            <View style={s.calcRow}>
              <Text style={s.calcToken}>GMT</Text>
              <Text style={s.calcValue}>{fmtNum(calcGmt)}</Text>
            </View>
          </View>

          <Text style={[s.hint, { marginTop: 12 }]}>
            {t('set_actual_hint')}
          </Text>
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>GST</Text>
            <TextInput
              style={s.fieldInput}
              value={actualGst}
              onChangeText={(t) => { setActualGst(t); setVerified(false); }}
              keyboardType="numeric"
              placeholder={t('set_actual_gst_ph')}
              placeholderTextColor="#555"
            />
          </View>
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>GMT</Text>
            <TextInput
              style={s.fieldInput}
              value={actualGmt}
              onChangeText={(t) => { setActualGmt(t); setVerified(false); }}
              keyboardType="numeric"
              placeholder={t('set_actual_gmt_ph')}
              placeholderTextColor="#555"
            />
          </View>

          <TouchableOpacity style={s.verifyBtn} onPress={handleVerify}>
            <Text style={s.verifyBtnText}>{t('set_verify_btn')}</Text>
          </TouchableOpacity>

          {verified && (
            <View style={s.resultBox}>
              <Text style={s.resultTitle}>{t('set_result_title')}</Text>
              <View style={s.resultRow}>
                <Text style={s.resultLabel}>{t('set_diff_gst')}</Text>
                <Text style={[s.resultValue, { color: diffColor(diffGst) }]}>
                  {diffGst >= 0 ? '+' : ''}{fmtNum(diffGst)}{diffIcon(diffGst)}
                </Text>
              </View>
              <View style={s.resultRow}>
                <Text style={s.resultLabel}>{t('set_diff_gmt')}</Text>
                <Text style={[s.resultValue, { color: diffColor(diffGmt) }]}>
                  {diffGmt >= 0 ? '+' : ''}{fmtNum(diffGmt)}{diffIcon(diffGmt)}
                </Text>
              </View>
              {(Math.abs(diffGst) >= 0.01 || Math.abs(diffGmt) >= 0.01) && (
                <Text style={s.warnText}>
                  {t('set_warn_text')}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* 取扱説明書 */}
        <TouchableOpacity
          style={s.menuItem}
          onPress={() => navigation.navigate('Guide')}
        >
          <Text style={s.menuItemText}>{t('set_guide_menu')}</Text>
          <Text style={s.menuArrow}>›</Text>
        </TouchableOpacity>

        {/* 言語切替
            ※ HomeScreen 右上のトグルと同じ setLang を呼ぶ。
              言語は LanguageProvider の Context 1本で持っているため、
              どちらで切り替えても両画面が同時に更新される（状態のズレは起きない）。 */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('set_lang_title')}</Text>
          <Text style={s.hint}>{t('set_lang_hint')}</Text>
          <View style={s.langRow}>
            {LANGS.map((l) => {
              const active = lang === l.code;
              return (
                <TouchableOpacity
                  key={l.code}
                  style={[s.langBtn, active && s.langBtnActive]}
                  onPress={() => setLang(l.code)}
                >
                  <Text style={[s.langBtnText, active && s.langBtnTextActive]}>
                    {active ? '✅ ' : ''}{l.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Coming Soon */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('set_coming_title')}</Text>
          <View style={s.comingItem}>
            <Text style={s.comingIcon}>🎨</Text>
            <Text style={s.comingText}>{t('set_coming_theme')}</Text>
            <Text style={s.comingBadge}>{t('set_coming_badge')}</Text>
          </View>
          <View style={s.comingItem}>
            <Text style={s.comingIcon}>🔤</Text>
            <Text style={s.comingText}>{t('set_coming_fontsize')}</Text>
            <Text style={s.comingBadge}>{t('set_coming_badge')}</Text>
          </View>
        </View>

        {/* アプリ情報
            ※ 固有名詞・技術名は翻訳せず、ラベルのみ多言語化する方針 */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('set_app_info_title')}</Text>
          <Text style={s.infoText}>STEPN Tracker v{APP_VERSION}</Text>
          <Text style={s.infoText}>{t('set_dev_label')}のっち × Claude</Text>
          <Text style={s.infoText}>{t('set_tech_label')}React Native / Expo / ML Kit OCR</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#0a0a0a' },
  scroll:        { flex: 1, padding: 16 },
  pageTitle:     { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16 },

  section:       { backgroundColor: '#1a1a1a', borderRadius: 12,
                   padding: 14, marginBottom: 12 },
  sectionTitle:  { fontSize: 14, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  hint:          { fontSize: 11, color: '#555', marginBottom: 10 },

  // チェーン
  chainRow:      { flexDirection: 'row', gap: 10 },
  chainBtn:      { flex: 1, paddingVertical: 10, borderRadius: 8,
                   borderWidth: 1.5, alignItems: 'center' },
  chainBtnText:  { fontWeight: 'bold', fontSize: 13 },

  // フィールド
  fieldRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  fieldLabel:    { fontSize: 13, color: '#888', width: 50 },
  fieldInput:    { flex: 1, fontSize: 14, color: '#fff', borderWidth: 1,
                   borderColor: '#333', borderRadius: 8, paddingHorizontal: 12,
                   paddingVertical: 8, backgroundColor: '#111' },

  // 保存ボタン
  saveBtn:       { backgroundColor: '#00ff88', borderRadius: 10,
                   paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  saveBtnText:   { color: '#000', fontWeight: 'bold', fontSize: 14 },

  // 照合ボタン
  verifyBtn:     { backgroundColor: '#4488ff', borderRadius: 10,
                   paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  verifyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  // 計算残高
  calcBox:       { backgroundColor: '#111', borderRadius: 8, padding: 12, marginTop: 4 },
  calcLabel:     { fontSize: 11, color: '#555', marginBottom: 6 },
  calcRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  calcToken:     { fontSize: 12, color: '#888' },
  calcValue:     { fontSize: 14, color: '#fff', fontWeight: 'bold' },

  // 照合結果
  resultBox:     { backgroundColor: '#0d1a2a', borderRadius: 8,
                   padding: 12, marginTop: 12 },
  resultTitle:   { fontSize: 13, fontWeight: 'bold', color: '#4488ff', marginBottom: 8 },
  resultRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  resultLabel:   { fontSize: 12, color: '#888' },
  resultValue:   { fontSize: 14, fontWeight: 'bold' },
  warnText:      { fontSize: 11, color: '#ff8844', marginTop: 8, lineHeight: 16 },

  // メニュー項目
  menuItem:      { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16,
                   marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  menuItemText:  { fontSize: 14, color: '#fff', flex: 1 },
  menuArrow:     { fontSize: 18, color: '#555' },

  // 言語切替
  langRow:         { flexDirection: 'row', gap: 10 },
  langBtn:         { flex: 1, paddingVertical: 10, borderRadius: 8,
                     borderWidth: 1.5, borderColor: '#333',
                     backgroundColor: 'transparent', alignItems: 'center' },
  langBtnActive:   { borderColor: '#00ff88', backgroundColor: '#00ff8822' },
  langBtnText:     { fontWeight: 'bold', fontSize: 13, color: '#666' },
  langBtnTextActive: { color: '#00ff88' },

  // Coming Soon
  comingItem:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
                   borderBottomWidth: 1, borderBottomColor: '#222' },
  comingIcon:    { fontSize: 16, marginRight: 10 },
  comingText:    { flex: 1, fontSize: 13, color: '#666' },
  comingBadge:   { fontSize: 10, color: '#444', backgroundColor: '#222',
                   paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },

  // アプリ情報
  infoText:      { fontSize: 12, color: '#555', marginBottom: 3 },
});
