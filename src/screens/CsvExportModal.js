/**
 * CsvExportModal.js  v3.4.0
 *
 * CSV出力モーダル
 * - チェーン選択（全/SOL/BNB/POL）
 * - 期間選択（今月/今年/全期間/月指定）
 * - CSV生成 → Android共有シートで共有
 *
 * v3.4.0 変更点：
 *   - 画面UIを多言語対応（useI18n）。
 *   - ★ CSVファイルの中身は多言語化していない。
 *     buildCsv の28列ヘッダー・CATEGORY_LABELS・buildFilename は
 *     言語設定にかかわらず常に日本語（およびASCII）のまま固定する。
 *     理由：確定申告用の出力であり、言語を切り替えた前後で列名が変わると
 *           過去に出力したCSVと結合したときに集計が壊れるため。
 *     → 以下の3つは t() を通さないこと。
 *
 * 必要パッケージ（未インストールの場合）:
 *   npx expo install expo-file-system expo-sharing
 */

import React, { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing   from 'expo-sharing';
import { StorageService } from '../services/StorageService';
import { useI18n } from '../i18n/i18n';   // ★ 多言語対応

// ─────────────────────────────────────────
// 定数
//   ※ ラベルは t() が必要なため、ここではキーのみ保持し、
//     表示文字列はコンポーネント内で組み立てる
//     （モジュールスコープでは t() を呼べないため）
// ─────────────────────────────────────────

const CHAIN_KEYS  = ['ALL', 'SOL', 'BNB', 'POL'];
const PERIOD_KEYS = ['thisMonth', 'thisYear', 'allTime', 'custom'];

// ★ CSV本文用：言語設定にかかわらず常に日本語。t() を通さないこと。
const CATEGORY_LABELS = {
  move_result: 'ムーブ結果', level_up: 'レベルアップ',
  repair_hp: 'HP修復', repair_durability: 'Durability修復',
  marketplace_buy: 'マーケット購入', marketplace_listing: '出品中',
  marketplace_sell: 'マーケット売却', spending_withdraw: 'Spending出金',
  spending_deposit: 'Spending入金', shoe_mint_cost: 'ミントコスト',
  shoe_mint_result: 'ミント結果', shoe_enhance: 'エンハンスコスト',
  socket_unlock: 'ソケット解放', gem_upgrade_success: 'ジェムUP成功',
  gem_upgrade_fail: 'ジェムUP失敗', gem_upgrade_confirm: 'ジェムUPコスト',
  mystery_box_open: 'MBオープン', mb_result: 'MB開封結果',
  success_rate_increment: '成功率UP', point_redistribution: 'ポイント振直し',
  vip_membership: 'VIPメンバー', home: 'ホーム画面', unknown: '不明',
};

// ─────────────────────────────────────────
// 期間計算
// ─────────────────────────────────────────

const getPeriodRange = (periodKey, customYear, customMonthNum) => {
  const now = new Date();
  switch (periodKey) {
    case 'thisMonth':
      return {
        from: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)),
        to:   new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)),
      };
    case 'thisYear':
      return {
        from: new Date(Date.UTC(now.getFullYear(), 0, 1)),
        to:   new Date(Date.UTC(now.getFullYear(), 11, 31, 23, 59, 59)),
      };
    case 'allTime':
      return { from: null, to: null };
    case 'custom':
      return {
        from: new Date(Date.UTC(customYear, customMonthNum - 1, 1)),
        to:   new Date(Date.UTC(customYear, customMonthNum, 0, 23, 59, 59)),
      };
    default:
      return { from: null, to: null };
  }
};

// ─────────────────────────────────────────
// CSVセルエスケープ
// ─────────────────────────────────────────

const esc = (val) => {
  const s = val == null ? '' : String(val);
  if (s.includes(',') || s.includes('\n') || s.includes('"'))
    return `"${s.replace(/"/g, '""')}"`;
  return s;
};

// ─────────────────────────────────────────
// CSV生成
// ─────────────────────────────────────────

const buildCsv = (records) => {
  const headers = [
    '取込日時', 'カテゴリ', '種別', 'チェーン',
    'GST金額', 'GMT金額', '信頼度',
    '靴ID', 'Genesis靴',
    'Durability前', 'Durability後',
    'HP前', 'HP後',
    'MBレベル', 'MB品質',
    'アーンモード', '獲得量',
    'レベル後', '距離km', 'EN消費',
    '手数料金額', '手数料トークン',
    '出品価格GMT', 'ジェムタイプ', 'ジェムLv',
    '待機時間(分)', 'メモ',
    '詳細JSON（その他）',
  ];

  const rows = records.map((r) => {
    const e = r.extra ?? {};
    // extraのうち主要フィールド以外をJSONで出力
    const knownKeys = new Set([
      'shoe_id','is_genesis','durability_before','durability_after',
      'hp_before','hp_after','mb_level','mb_quality','earn_mode','earn_amount',
      'level_after','distance_km','en_used','fee_amount','fee_token',
      'price_gmt','gem_type','gem_level','wait_mins',
      'needs_pixel_scan','pixel_scan_type',
    ]);
    const rest = Object.fromEntries(
      Object.entries(e).filter(([k]) => !knownKeys.has(k))
    );

    return [
      r.timestamp ?? '',
      CATEGORY_LABELS[r.category] ?? r.category ?? '',
      r.type ?? '',
      r.chain ?? '',
      r.gst_amount ?? 0,
      r.gmt_amount ?? 0,
      r.confidence != null ? r.confidence.toFixed(2) : '',
      e.shoe_id ?? '',
      e.is_genesis != null ? (e.is_genesis ? '是' : '否') : '',
      e.durability_before ?? '',
      e.durability_after  ?? '',
      e.hp_before ?? '',
      e.hp_after  ?? '',
      e.mb_level  ?? '',
      e.mb_quality ?? '',
      e.earn_mode  ?? '',
      e.earn_amount ?? '',
      e.level_after ?? '',
      e.distance_km ?? '',
      e.en_used ?? '',
      e.fee_amount ?? '',
      e.fee_token  ?? '',
      e.price_gmt  ?? '',
      e.gem_type   ?? '',
      e.gem_level  ?? '',
      e.wait_mins  ?? '',
      r.memo ?? '',
      Object.keys(rest).length > 0 ? JSON.stringify(rest) : '',
    ].map(esc).join(',');
  });

  // BOM付きUTF-8（Excelで文字化けしない）
  return '\uFEFF' + [headers.map(esc).join(','), ...rows].join('\r\n');
};

// ─────────────────────────────────────────
// ファイル名生成
// ─────────────────────────────────────────

const buildFilename = (chainKey, periodKey, customYear, customMonthNum) => {
  const chain = chainKey === 'ALL' ? 'ALL' : chainKey;
  let period = 'all';
  if (periodKey === 'thisMonth') {
    const n = new Date();
    period = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
  } else if (periodKey === 'thisYear') {
    period = String(new Date().getFullYear());
  } else if (periodKey === 'custom') {
    period = `${customYear}-${String(customMonthNum).padStart(2,'0')}`;
  }
  return `stepn_${chain}_${period}.csv`;
};

// ─────────────────────────────────────────
// モーダルコンポーネント
// ─────────────────────────────────────────

export default function CsvExportModal({ visible, onClose }) {
  const { t } = useI18n();   // ★ 多言語対応

  const now = new Date();
  const [chainKey,       setChainKey]      = useState('ALL');
  const [periodKey,      setPeriodKey]     = useState('thisMonth');
  const [customYear,     setCustomYear]    = useState(now.getFullYear());
  const [customMonthNum, setCustomMonthNum]= useState(now.getMonth() + 1);
  const [exporting,      setExporting]     = useState(false);

  // ラベル組み立て（画面表示用。CSV本文には使わない）
  const chainLabel = (key) =>
    key === 'ALL' ? t('csv_chain_all') : t('csv_chain_only', key);

  const periodLabel = (key) => {
    const n = new Date();
    switch (key) {
      case 'thisMonth': return t('csv_period_this_month', n.getFullYear(), n.getMonth() + 1);
      case 'thisYear':  return t('csv_period_this_year', n.getFullYear());
      case 'allTime':   return t('label_all');       // HomeScreen と共通のキーを再利用
      case 'custom':    return t('csv_period_custom');
      default:          return key;
    }
  };

  // 月を前後に移動
  const prevMonth = () => {
    if (customMonthNum === 1) { setCustomYear(y => y - 1); setCustomMonthNum(12); }
    else { setCustomMonthNum(m => m - 1); }
  };
  const nextMonth = () => {
    const n = new Date();
    // 未来月には進めない
    if (customYear === n.getFullYear() && customMonthNum >= n.getMonth() + 1) return;
    if (customMonthNum === 12) { setCustomYear(y => y + 1); setCustomMonthNum(1); }
    else { setCustomMonthNum(m => m + 1); }
  };

  const handleExport = async () => {
    const range = getPeriodRange(periodKey, customYear, customMonthNum);
    if (range === null) {
      Alert.alert(t('set_error_title'), t('csv_err_range'));
      return;
    }

    setExporting(true);
    try {
      const records = await StorageService.getRecords({
        chain: chainKey === 'ALL' ? undefined : chainKey,
        from:  range.from ?? undefined,
        to:    range.to   ?? undefined,
      });

      if (records.length === 0) {
        Alert.alert(t('csv_no_data_title'), t('csv_no_data_msg'));
        return;
      }

      const csv      = buildCsv(records);
      const filename = buildFilename(chainKey, periodKey, customYear, customMonthNum);
      const path     = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(path, csv, {
        encoding: 'utf8',
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(t('set_error_title'), t('csv_no_share'));
        return;
      }
      await Sharing.shareAsync(path, {
        mimeType:    'text/csv',
        dialogTitle: t('csv_share_dialog', filename),
        UTI:         'public.comma-separated-values-text',
      });

      onClose();
    } catch (e) {
      console.error('[CsvExportModal] error:', e);
      Alert.alert(t('set_error_title'), t('csv_fail_msg', e.message));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.dialog}>
          <Text style={s.title}>{t('csv_title')}</Text>

          {/* チェーン選択 */}
          <Text style={s.sectionLabel}>{t('csv_section_chain')}</Text>
          {CHAIN_KEYS.map((key) => (
            <TouchableOpacity
              key={key}
              style={s.radioRow}
              onPress={() => setChainKey(key)}
            >
              <View style={[s.radio, chainKey === key && s.radioSelected]} />
              <Text style={s.radioLabel}>{chainLabel(key)}</Text>
            </TouchableOpacity>
          ))}

          {/* 期間選択 */}
          <Text style={[s.sectionLabel, { marginTop: 16 }]}>{t('csv_section_period')}</Text>
          {PERIOD_KEYS.map((key) => (
            <View key={key}>
              <TouchableOpacity
                style={s.radioRow}
                onPress={() => setPeriodKey(key)}
              >
                <View style={[s.radio, periodKey === key && s.radioSelected]} />
                <Text style={s.radioLabel}>{periodLabel(key)}</Text>
              </TouchableOpacity>

              {/* 月指定：矢印ピッカー */}
              {key === 'custom' && periodKey === 'custom' && (
                <View style={s.monthPicker}>
                  <TouchableOpacity style={s.arrowBtn} onPress={prevMonth}>
                    <Text style={s.arrowText}>◀</Text>
                  </TouchableOpacity>
                  <Text style={s.monthLabel}>
                    {/* HomeScreen と共通のキーを再利用（英語は "Aug 2026" 形式） */}
                    {t('label_month_year', customYear, customMonthNum)}
                  </Text>
                  <TouchableOpacity style={s.arrowBtn} onPress={nextMonth}>
                    <Text style={s.arrowText}>▶</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          {/* ボタン */}
          <View style={s.btnRow}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={exporting}>
              <Text style={s.cancelBtnText}>{t('csv_cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.exportBtn, exporting && { opacity: 0.5 }]}
              onPress={handleExport}
              disabled={exporting}
            >
              {exporting
                ? <ActivityIndicator size="small" color="#000" />
                : <Text style={s.exportBtnText}>{t('csv_export_btn')}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────
// スタイル
// ─────────────────────────────────────────

const s = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
                   justifyContent: 'center', alignItems: 'center' },
  dialog:        { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 24,
                   width: '88%', borderWidth: 1, borderColor: '#333' },
  title:         { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  sectionLabel:  { fontSize: 12, color: '#555', marginBottom: 8, letterSpacing: 1 },
  radioRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  radio:         { width: 18, height: 18, borderRadius: 9, borderWidth: 2,
                   borderColor: '#555', marginRight: 12 },
  radioSelected: { borderColor: '#00ff88', backgroundColor: '#00ff88' },
  radioLabel:    { fontSize: 14, color: '#ccc' },
  customInput:   { backgroundColor: '#111', borderWidth: 1, borderColor: '#444',
                   borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
                   color: '#fff', fontSize: 14, marginLeft: 30, marginBottom: 4 },
  btnRow:        { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn:     { flex: 1, backgroundColor: '#2a2a2a', borderRadius: 10,
                   paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: '#888', fontSize: 14 },
  exportBtn:     { flex: 1, backgroundColor: '#00ff88', borderRadius: 10,
                   paddingVertical: 12, alignItems: 'center' },
  exportBtnText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  monthPicker:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                   marginLeft: 30, marginBottom: 4, gap: 12 },
  arrowBtn:      { padding: 8 },
  arrowText:     { color: '#00ff88', fontSize: 18, fontWeight: 'bold' },
  monthLabel:    { fontSize: 16, color: '#fff', fontWeight: 'bold', minWidth: 120,
                   textAlign: 'center' },
});
