/**
 * src/screens/HomeScreen.js  v3.4.0
 * ホーム画面 - チェーン選択・Spending残高・収支テーブル
 *
 * v3.4.0 変更点：
 *   - 多言語対応（useI18n）。全文言を t(...) 経由に置き換え。
 *   - 右上に 🌐 言語トグル（日本語/英語）を追加。
 *   - 期間ラベル生成を makePeriodLabel(t, ...) に分離（t で翻訳するため）。
 *   - 期間タブ .map の引数 t → tab にリネーム（翻訳関数 t との名前衝突を回避）。
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { StorageService } from '../services/StorageService';
import CsvExportModal from './CsvExportModal';
import { useI18n } from '../i18n/i18n';   // ★ 多言語対応
import { useTheme } from '../theme/theme';   // ★ テーマ対応

const LAST_CHAIN_KEY = 'settings_last_chain';

// 期間の from / to を返す（label は makePeriodLabel で別途生成する）
const getPeriodRange = (period, pickYear, pickMonth) => {
  const now = new Date();
  switch (period) {
    case 'month':
      return {
        from: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)),
        to:   new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)),
      };
    case 'year':
      return {
        from: new Date(Date.UTC(now.getFullYear(), 0, 1)),
        to:   new Date(Date.UTC(now.getFullYear(), 11, 31, 23, 59, 59)),
      };
    case 'all':
      return {
        from: new Date(Date.UTC(2020, 0, 1)),
        to:   new Date(Date.UTC(2099, 11, 31, 23, 59, 59)),
      };
    case 'pick':
      return {
        from: new Date(Date.UTC(pickYear, pickMonth - 1, 1)),
        to:   new Date(Date.UTC(pickYear, pickMonth, 0, 23, 59, 59)),
      };
    default:
      return {
        from: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)),
        to:   new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)),
      };
  }
};

// 期間ラベルを翻訳付きで生成（t は useI18n の翻訳関数）
const makePeriodLabel = (t, period, pickYear, pickMonth) => {
  const now = new Date();
  switch (period) {
    case 'month':
      return t('label_month_year', now.getFullYear(), now.getMonth() + 1);
    case 'year':
      return t('label_year', now.getFullYear());
    case 'all':
      return t('label_all');
    case 'pick':
      return t('label_month_year', pickYear, pickMonth);
    default:
      return t('label_month_year', now.getFullYear(), now.getMonth() + 1);
  }
};

const fmt = (n, type) => {
  if (n == null || n === 0) return '0.00';
  const abs = Math.abs(n).toFixed(2);
  return type === 'income' ? `+${abs}` : `-${abs}`;
};

const fmtBal = (n) => (n != null && typeof n === 'number') ? n.toFixed(2) : '0.00';

export default function HomeScreen({ navigation }) {
  const { lang, setLang, t } = useI18n();   // ★ 多言語対応
  const { colors, theme, chainColors } = useTheme();   // ★ テーマ対応
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [chain, setChain] = useState('BNB');
  const [summary, setSummary] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [allCount,   setAllCount]   = useState(0);
  const [loading, setLoading] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);

  // 期間選択
  const [period,     setPeriod]     = useState('month');
  const [pickYear,   setPickYear]   = useState(new Date().getFullYear());
  const [pickMonth,  setPickMonth]  = useState(new Date().getMonth() + 1);

  // Spending残高
  const [spendGst, setSpendGst] = useState(0);
  const [spendGmt, setSpendGmt] = useState(0);

  React.useEffect(() => {
    AsyncStorage.getItem(LAST_CHAIN_KEY).then((saved) => {
      if (saved) setChain(saved);
    }).catch(() => {});
  }, []);

  const handleChainChange = (c) => {
    setChain(c);
    AsyncStorage.setItem(LAST_CHAIN_KEY, c).catch(() => {});
  };

  const loadSummary = useCallback(async (targetChain, targetPeriod, targetPickYear, targetPickMonth) => {
    setLoading(true);
    try {
      const { from, to } = getPeriodRange(targetPeriod, targetPickYear, targetPickMonth);
      // ※ 変数名に s は使わないこと。スタイルの s を隠してしまう
      const [summaryData, counts, bal, allCounts] = await Promise.all([
        StorageService.calcSummary({ chain: targetChain, from, to }),
        StorageService.getRecordCounts(targetChain),
        StorageService.calcSpendingBalance(targetChain),
        StorageService.getRecordCounts(),  // 全チェーン
      ]);
      setSummary(summaryData);
      setTotalCount(counts.total);
      setAllCount(allCounts.total);
      setSpendGst(bal.gst?.calculated ?? 0);
      setSpendGmt(bal.gmt?.calculated ?? 0);
    } catch (e) {
      console.error('[HomeScreen] loadSummary error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSummary(chain, period, pickYear, pickMonth);
    }, [chain, period, pickYear, pickMonth, loadSummary]),
  );

  const gstIncome  = summary?.gst?.income  ?? 0;
  const gstExpense = summary?.gst?.expense  ?? 0;
  const gstNet     = summary?.gst?.net      ?? 0;
  const gmtIncome  = summary?.gmt?.income  ?? 0;
  const gmtExpense = summary?.gmt?.expense  ?? 0;
  const gmtNet     = summary?.gmt?.net      ?? 0;

  const netGstColor = gstNet >= 0 ? colors.income : colors.expense;
  const netGmtColor = gmtNet >= 0 ? colors.income : colors.expense;

  // 現在の期間ラベル（翻訳済み）
  const periodLabel = makePeriodLabel(t, period, pickYear, pickMonth);

  // 期間タブの定義（label は翻訳キーで持つ）
  const PERIOD_TABS = [
    { key: 'month', tkey: 'period_month' },
    { key: 'year',  tkey: 'period_year'  },
    { key: 'all',   tkey: 'period_all'   },
    { key: 'pick',  tkey: 'period_pick'  },
  ];

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={s.scroll}>

        {/* ヘッダー + 言語トグル + 設定ボタン右上 */}
        <View style={s.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={[s.title, { color: chainColors[chain], textShadowColor: colors.chainTextShadow, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: colors.chainTextShadowRadius }]}>
              ⚡ STEPN Tracker
            </Text>
            <Text style={s.sub}>  v3.4</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* 🌐 言語トグル（押すと切り替わる先を表示） */}
            <TouchableOpacity
              style={s.langBtn}
              onPress={() => setLang(lang === 'ja' ? 'en' : 'ja')}
            >
              <Text style={s.langBtnText}>
                {lang === 'ja' ? '🌐 EN' : '🌐 JA'}
              </Text>
            </TouchableOpacity>
            {/* ⚙️ 設定 */}
            <TouchableOpacity
              style={s.settingsBtn}
              onPress={() => navigation.navigate('Settings')}
            >
              <Text style={s.settingsBtnText}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* チェーン選択 */}
        <View style={s.card}>
          <Text style={s.cardTitle}>{t('chain_select')}</Text>
          <View style={s.chainRow}>
            {['SOL', 'BNB', 'POL'].map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  s.chainBtn,
                  { backgroundColor: chain === c ? chainColors[c] : colors.bgInput,
                    borderColor:     chain === c ? chainColors[c] : colors.borderLight },
                ]}
                onPress={() => handleChainChange(c)}
              >
                <Text style={[s.chainBtnText, { color: chain === c ? colors.onPrimary : colors.textHint }]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.chainNote}>{t('chain_note')}</Text>
        </View>

        {/* Spending残高 */}
        <View style={s.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={s.cardTitle}>{t('spending_balance', chain)}</Text>
            {loading && <ActivityIndicator size="small" color={colors.textHint} />}
          </View>
          <Text style={s.balHint}>{t('balance_hint')}</Text>
          <View style={s.balRow}>
            <Text style={s.balToken}>GST</Text>
            <Text style={[s.balValue, { color: spendGst >= 0 ? colors.textPrimary : colors.expense }]}>
              {fmtBal(spendGst)}
            </Text>
          </View>
          <View style={s.balRow}>
            <Text style={s.balToken}>GMT</Text>
            <Text style={[s.balValue, { color: spendGmt >= 0 ? colors.textPrimary : colors.expense }]}>
              {fmtBal(spendGmt)}
            </Text>
          </View>
        </View>

        {/* 収支テーブル */}
        <View style={s.card}>
          {/* 期間ラベル + ローディング */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={s.cardTitle}>
              {t('period_summary', periodLabel)}
            </Text>
            {loading && <ActivityIndicator size="small" color={colors.textHint} />}
          </View>

          {/* 期間選択タブ */}
          <View style={s.periodTabs}>
            {PERIOD_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[s.periodTab, period === tab.key && s.periodTabActive]}
                onPress={() => setPeriod(tab.key)}
              >
                <Text style={[s.periodTabText, period === tab.key && s.periodTabTextActive]}>
                  {t(tab.tkey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 月指定ピッカー */}
          {period === 'pick' && (
            <View style={s.monthPicker}>
              <TouchableOpacity
                style={s.arrowBtn}
                onPress={() => {
                  if (pickMonth === 1) { setPickMonth(12); setPickYear((y) => y - 1); }
                  else setPickMonth((m) => m - 1);
                }}
              >
                <Text style={s.arrowBtnText}>◀</Text>
              </TouchableOpacity>
              <Text style={s.monthPickerLabel}>
                {t('label_month_year', pickYear, pickMonth)}
              </Text>
              <TouchableOpacity
                style={s.arrowBtn}
                onPress={() => {
                  if (pickMonth === 12) { setPickMonth(1); setPickYear((y) => y + 1); }
                  else setPickMonth((m) => m + 1);
                }}
              >
                <Text style={s.arrowBtnText}>▶</Text>
              </TouchableOpacity>
            </View>
          )}



          <View style={s.tableRow}>
            <Text style={s.tableLabel}> </Text>
            <Text style={s.tableToken}>GST</Text>
            <Text style={s.tableToken}>GMT</Text>
          </View>
          <View style={s.divider} />

          <View style={s.tableRow}>
            <Text style={s.tableLabel}>{t('income')}</Text>
            <Text style={[s.tableValue, { color: colors.income }]}>
              {fmt(gstIncome, 'income')}
            </Text>
            <Text style={[s.tableValue, { color: colors.income }]}>
              {fmt(gmtIncome, 'income')}
            </Text>
          </View>

          <View style={s.tableRow}>
            <Text style={s.tableLabel}>{t('expense')}</Text>
            <Text style={[s.tableValue, { color: colors.expense }]}>
              {fmt(gstExpense, 'expense')}
            </Text>
            <Text style={[s.tableValue, { color: colors.expense }]}>
              {fmt(gmtExpense, 'expense')}
            </Text>
          </View>

          <View style={s.divider} />

          <View style={s.tableRow}>
            <Text style={[s.tableLabel, { fontWeight: 'bold' }]}>{t('total')}</Text>
            <Text style={[s.tableValue, { color: netGstColor, fontWeight: 'bold' }]}>
              {fmt(gstNet, gstNet >= 0 ? 'income' : 'expense')}
            </Text>
            <Text style={[s.tableValue, { color: netGmtColor, fontWeight: 'bold' }]}>
              {fmt(gmtNet, gmtNet >= 0 ? 'income' : 'expense')}
            </Text>
          </View>
        </View>

        <Text style={s.countText}>
          {t('records_count', chain, totalCount, allCount)}
        </Text>

        {/* 取込ボタン */}
        <TouchableOpacity
          style={s.importBtn}
          onPress={() => navigation.navigate('Import', { chain })}
        >
          <Text style={s.importBtnText}>{t('import_button')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.subBtn}
          onPress={() => navigation.navigate('ManualInput', { chain })}
        >
          <Text style={s.subBtnText}>{t('manual_button')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.subBtn}
          onPress={() => navigation.navigate('RecordList', {})}
        >
          <Text style={s.subBtnText}>{t('record_list_button', allCount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.subBtn}
          onPress={() => navigation.navigate('Guide')}
        >
          <Text style={s.subBtnText}>{t('guide_button')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.csvBtn}
          onPress={() => setShowCsvModal(true)}
        >
          <Text style={s.csvBtnText}>{t('csv_button')}</Text>
        </TouchableOpacity>

        <Text style={s.footer}>STEPN Tracker v3.4 · {chain} Chain</Text>

      </ScrollView>

      <CsvExportModal
        visible={showCsvModal}
        onClose={() => setShowCsvModal(false)}
      />
    </SafeAreaView>
  );
}

const makeStyles = (c) => StyleSheet.create({
  container:    { flex: 1, backgroundColor: c.bg },
  scroll:       { padding: 16, paddingBottom: 48 },
  headerRow:    { flexDirection: 'row', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 20, paddingTop: 24 },
  title:        { fontSize: 24, fontWeight: 'bold', letterSpacing: 1 },
  sub:          { fontSize: 12, color: c.textHint },
  settingsBtn:  { padding: 8, backgroundColor: c.bgCard, borderRadius: 10,
                  borderWidth: 1, borderColor: c.borderLight },
  settingsBtnText: { fontSize: 20 },

  // 🌐 言語トグル
  langBtn:      { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: c.bgCard,
                  borderRadius: 10, borderWidth: 1, borderColor: c.borderLight,
                  justifyContent: 'center' },
  langBtnText:  { fontSize: 13, fontWeight: 'bold', color: c.textSecondary },

  card:         { backgroundColor: c.bgCard, borderRadius: 16, padding: 16,
                  marginBottom: 16, borderWidth: 1, borderColor: c.border },
  cardTitle:    { fontSize: 15, fontWeight: 'bold', color: c.textPrimary },
  chainRow:     { flexDirection: 'row', gap: 8, marginBottom: 8, marginTop: 14 },
  chainBtn:     { flex: 1, paddingVertical: 10, borderRadius: 10,
                  borderWidth: 1.5, alignItems: 'center' },
  chainBtnText: { fontWeight: 'bold', fontSize: 14 },
  chainNote:    { color: c.textFaint, fontSize: 11, textAlign: 'center' },

  // Spending残高
  balHint:      { color: c.textFaint, fontSize: 10, marginTop: 6, marginBottom: 10 },
  balRow:       { flexDirection: 'row', justifyContent: 'space-between',
                  paddingVertical: 4 },
  balToken:     { fontSize: 13, color: c.textMuted },
  balValue:     { fontSize: 16, fontWeight: 'bold' },

  // 収支テーブル
  tableRow:     { flexDirection: 'row', paddingVertical: 5 },
  tableLabel:   { flex: 2, color: c.textSecondary, fontSize: 13 },
  tableToken:   { flex: 3, textAlign: 'right', color: c.textHint, fontSize: 12, fontWeight: 'bold' },
  tableValue:   { flex: 3, textAlign: 'right', fontSize: 13 },
  divider:      { height: 1, backgroundColor: c.border, marginVertical: 6 },
  countText:    { color: c.textHint, fontSize: 13, textAlign: 'center', marginBottom: 16 },
  importBtn:    { backgroundColor: c.accentSurface, borderRadius: 14, paddingVertical: 18,
                  alignItems: 'center', marginBottom: 12, borderWidth: 1.5, borderColor: c.income },
  importBtnText:{ fontSize: 15, fontWeight: 'bold', color: c.textPrimary },
  csvBtn:       { backgroundColor: c.infoSurface, borderRadius: 14, paddingVertical: 14,
                  alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: c.info },
  csvBtnText:   { fontSize: 14, fontWeight: 'bold', color: c.info },
  subBtn:       { backgroundColor: c.bgCard, borderRadius: 14, paddingVertical: 14,
                  alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: c.border },
  subBtnText:   { fontSize: 15, fontWeight: 'bold', color: c.textSecondary },
  footer:       { color: c.textFaintest, fontSize: 11, textAlign: 'center', marginTop: 16 },

  // 期間選択タブ
  periodTabs:       { flexDirection: 'row', gap: 6, marginBottom: 10 },
  periodTab:        { flex: 1, paddingVertical: 6, borderRadius: 8,
                      backgroundColor: c.bgInput, borderWidth: 1, borderColor: c.borderLight,
                      alignItems: 'center' },
  periodTabActive:  { backgroundColor: c.accentSurfaceOn, borderColor: c.income },
  periodTabText:    { fontSize: 11, color: c.textHint, fontWeight: 'bold' },
  periodTabTextActive: { color: c.income },

  // 月指定ピッカー
  monthPicker:      { flexDirection: 'row', alignItems: 'center',
                      justifyContent: 'center', gap: 16,
                      paddingVertical: 8, marginBottom: 6 },
  monthPickerLabel: { fontSize: 14, color: c.textPrimary, fontWeight: 'bold', minWidth: 100, textAlign: 'center' },
  arrowBtn:         { padding: 8, backgroundColor: c.bgSubtle, borderRadius: 8,
                      borderWidth: 1, borderColor: c.textFaint },
  arrowBtnText:     { fontSize: 16, color: c.income },
});
