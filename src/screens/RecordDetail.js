/**
 * RecordDetail.js
 *
 * レコード詳細・編集画面
 * - 表示モード：全フィールドを見やすく表示
 * - 編集モード：「編集」ボタン → 全フィールドが編集可能に切り替わる
 * - 修正履歴：StorageService.updateRecord 経由で自動記録（最大1000件）
 * - 削除：確認ダイアログ付き
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, Switch, Image, Modal, Dimensions, StyleSheet,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StorageService } from '../services/StorageService';
// ※ 表示ラベルは i18n の cat_* を使う。ここはカテゴリ一覧（キー）の取得のみに使用
import { CATEGORY_LABELS } from './ImportScreen_constants';
import { s } from './RecordDetail_styles';
import { useI18n } from '../i18n/i18n';   // ★ 多言語対応

// ─── 定数 ────────────────────────────────
const CHAIN_COLORS = { SOL: '#9FFB50', BNB: '#F3BA2F', POL: '#9063CD' };
const CHAIN_TEXT   = { SOL: '#000',    BNB: '#000',    POL: '#fff'    };
const CHAINS       = ['SOL', 'BNB', 'POL'];

/** 種別の選択肢（ラベルは RecordListScreen のタブと共通のキーを再利用） */
const TYPE_OPTIONS = [
  { key: 'income',  labelKey: 'group_income'  },
  { key: 'expense', labelKey: 'group_expense' },
  { key: 'info',    labelKey: 'group_info'    },
  { key: 'listing', labelKey: 'group_listing' },
];

/** タイムスタンプから YYYY_MM を算出 */
function ymFromTimestamp(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}_${m}`;
}

/** フィールドキーを表示ラベルに変換
 *  辞書（i18n の fld_*）に定義があればそれを、無ければ生のキーをそのまま返す。
 *  ※ t() は未定義キーに対してキー名を返すため、それを判定に使っている。 */
function fieldLabel(key, t) {
  const dictKey = `fld_${key}`;
  const label   = t(dictKey);
  return label === dictKey ? key : label;
}

/** 信頼度バッジ */
function ConfBadge({ score }) {
  const { t } = useI18n();
  const { label, color } =
    score >= 0.9 ? { label: t('conf_high'), color: '#00ff88' } :
    score >= 0.6 ? { label: t('conf_mid'),  color: '#ffaa00' } :
                   { label: t('conf_low'),  color: '#ff4444' };
  return (
    <View style={[s.confBadge, { borderColor: color }]}>
      <Text style={[s.confText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── メイン画面 ──────────────────────────
export default function RecordDetail({ navigation, route }) {
  const { t } = useI18n();   // ★ 多言語対応

  const { record } = route.params;

  const [isEditing, setIsEditing]   = useState(false);
  const [showThumb, setShowThumb]  = useState(false);
  const [chain,     setChain]       = useState(record.chain   ?? null);
  const [gst,       setGst]         = useState(String(record.gst_amount ?? 0));
  const [gmt,       setGmt]         = useState(String(record.gmt_amount ?? 0));
  const [timestamp, setTimestamp]   = useState(record.timestamp ?? '');
  const [category,  setCategory]    = useState(record.category  ?? 'unknown');
  const [type,      setType]        = useState(record.type       ?? 'info');
  const [extra,     setExtra]       = useState({ ...(record.extra ?? {}) });

  const ym = ymFromTimestamp(record.timestamp);

  // ── 保存 ──────────────────────────────
  const handleSave = useCallback(async () => {
    try {
      const newType = type !== record.type ? type
        : category !== record.category
          ? (StorageService.CATEGORY_TYPE?.[category] ?? type)
          : type;

      await StorageService.updateRecord(
        record.id,
        {
          chain:      chain,
          gst_amount: parseFloat(gst)  || 0,
          gmt_amount: parseFloat(gmt)  || 0,
          timestamp,
          category,
          type:       newType,
          extra,
        },
        ym,
      );
      setIsEditing(false);
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('rd_save_fail'), e.message);
    }
  }, [chain, gst, gmt, timestamp, category, type, extra, ym]);

  // ── 削除 ──────────────────────────────
  const handleDelete = useCallback(() => {
    Alert.alert(
      t('rd_del_title'),
      t('rd_del_msg'),
      [
        { text: t('csv_cancel'), style: 'cancel' },
        {
          text: t('rd_del_action'), style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deleteRecords([record.id], ym);
              navigation.goBack();
            } catch (e) {
              Alert.alert(t('rd_delete_fail'), e.message);
            }
          },
        },
      ],
    );
  }, [record.id, ym]);

  // ── extraフィールド更新 ─────────────────
  const setExtraField = useCallback((key, val) => {
    setExtra(prev => ({ ...prev, [key]: val }));
  }, []);

  // ── 金額表示 ───────────────────────────
  const amountColor = record.type === 'income' ? '#00ff88' : '#ff4444';
  const amountSign  = record.type === 'income' ? '+' : '-';
  const amountStr   = record.gst_amount > 0
    ? `${amountSign}${record.gst_amount} GST`
    : record.gmt_amount > 0
      ? `${amountSign}${record.gmt_amount} GMT`
      : '0';

  return (
    <SafeAreaView style={s.container}>
      {/* ナビゲーションヘッダー */}
      <View style={{ flexDirection: 'row', alignItems: 'center',
                     paddingTop: 4, paddingBottom: 16, paddingHorizontal: 16,
                     borderBottomWidth: 1, borderBottomColor: '#222' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#00ff88', fontSize: 16 }}>{t('rd_back')}</Text>
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, flex: 1 }}>
          {t('rd_title')}
        </Text>
        <TouchableOpacity onPress={handleDelete} style={s.deleteBtn}>
          <Text style={s.deleteBtnText}>{t('delete_btn')}</Text>
        </TouchableOpacity>
      </View>

      {/* サムネイル拡大モーダル */}
      {record.thumbnail_uri && (
        <Modal visible={showThumb} transparent animationType="fade"
          onRequestClose={() => setShowThumb(false)}>
          <TouchableOpacity
            style={ts.thumbModalBg}
            activeOpacity={1}
            onPress={() => setShowThumb(false)}
          >
            <Image
              source={{ uri: FileSystem.documentDirectory + record.thumbnail_uri }}
              style={ts.thumbModalImg}
              resizeMode="contain"
            />
            <Text style={ts.thumbModalClose}>{t('rd_thumb_close')}</Text>
          </TouchableOpacity>
        </Modal>
      )}

      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* ── ヘッダーカード ── */}
        <View style={s.headerCard}>
          <View style={{ flexDirection: 'row' }}>
            {/* サムネイル */}
            {record.thumbnail_uri ? (
              <TouchableOpacity
                onPress={() => setShowThumb(true)}
                style={ts.thumbWrap}
              >
                <Image
                  source={{ uri: FileSystem.documentDirectory + record.thumbnail_uri }}
                  style={ts.thumbImg}
                  resizeMode="cover"
                />
                <Text style={ts.thumbLabel}>{t('rd_thumb_zoom')}</Text>
              </TouchableOpacity>
            ) : null}
            <View style={{ flex: 1 }}>
              <View style={s.categoryRow}>
                <Text style={s.categoryText}>
                  {t('cat_' + record.category)}
                </Text>
                <ConfBadge score={record.confidence ?? 0} />
              </View>
              <Text style={[s.amountText, { color: amountColor }]}>{amountStr}</Text>
            </View>
          </View>
          {record.warnings?.length > 0 &&
            record.warnings.map((w, i) => (
              <Text key={i} style={s.warningText}>⚠️ {w}</Text>
            ))}
        </View>

        {/* ── 基本情報 ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('rd_sec_basic')}</Text>

          {/* チェーン */}
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>{t('rd_field_chain')}</Text>
            {isEditing ? (
              <View style={s.chainRow}>
                {CHAINS.map(c => (
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
            ) : (
              <Text style={[s.fieldValue, { color: CHAIN_COLORS[chain] ?? '#888' }]}>
                {chain ?? t('rd_chain_none')}
              </Text>
            )}
          </View>

          {/* 日時 */}
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>{t('rd_field_datetime')}</Text>
            {isEditing ? (
              <TextInput style={s.fieldInput} value={timestamp}
                onChangeText={setTimestamp} />
            ) : (
              <Text style={s.fieldValue}>
                {timestamp ? new Date(timestamp).toLocaleString('ja-JP') : 'N/A'}
              </Text>
            )}
          </View>

          {/* GST */}
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>{t('rd_field_gst')}</Text>
            {isEditing ? (
              <TextInput style={s.fieldInput} value={gst}
                onChangeText={setGst} keyboardType="numeric" />
            ) : (
              <Text style={s.fieldValue}>{record.gst_amount ?? 0}</Text>
            )}
          </View>

          {/* GMT */}
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>{t('rd_field_gmt')}</Text>
            {isEditing ? (
              <TextInput style={s.fieldInput} value={gmt}
                onChangeText={setGmt} keyboardType="numeric" />
            ) : (
              <Text style={s.fieldValue}>{record.gmt_amount ?? 0}</Text>
            )}
          </View>

          {/* カテゴリ（編集時のみ変更可） */}
          {isEditing && (
            <View style={{ paddingVertical: 8 }}>
              <Text style={[s.fieldLabel, { marginBottom: 8 }]}>{t('rd_field_category')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {Object.keys(CATEGORY_LABELS)
                  .filter((k) => k !== 'unknown')
                  .map((k) => (
                    <TouchableOpacity
                      key={k}
                      style={[s.catBtn, category === k && s.catBtnActive]}
                      onPress={() => setCategory(k)}
                    >
                      <Text style={[s.catBtnText, category === k && s.catBtnTextActive]}>
                        {t('cat_' + k)}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </View>
          )}

          {/* type（編集時） */}
          {isEditing && (
            <View style={{ paddingVertical: 8 }}>
              <Text style={[s.fieldLabel, { marginBottom: 8 }]}>{t('rd_field_type')}</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {/* ※ 変数名は opt にすること。t にすると i18n の t() を隠してしまう */}
                {TYPE_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[s.catBtn, type === opt.key && s.catBtnActive]}
                    onPress={() => setType(opt.key)}
                  >
                    <Text style={[s.catBtnText, type === opt.key && s.catBtnTextActive]}>
                      {t(opt.labelKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* ── extra フィールド ── */}
        {Object.keys(extra).length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('rd_sec_detail')}</Text>
            {Object.entries(extra).map(([key, val]) => {
              // 内部フラグ系は表示スキップ
              if (['needs_pixel_scan', 'pixel_scan_type'].includes(key)) return null;
              if (key === 'mb_reward_items' && val === null) return null;
              if (val === null && !isEditing) return (
                <View key={key} style={s.fieldRow}>
                  <Text style={s.fieldLabel}>{fieldLabel(key, t)}</Text>
                  <Text style={s.fieldNull}>N/A</Text>
                </View>
              );

              if (isEditing) {
                // boolean → Switch
                if (typeof val === 'boolean') {
                  return (
                    <View key={key} style={s.toggleRow}>
                      <Text style={s.fieldLabel}>{fieldLabel(key, t)}</Text>
                      <Switch
                        value={!!extra[key]}
                        onValueChange={v => setExtraField(key, v)}
                        trackColor={{ true: '#00ff88' }}
                      />
                    </View>
                  );
                }
                // number → 数値入力
                if (typeof val === 'number') {
                  return (
                    <View key={key} style={s.fieldRow}>
                      <Text style={s.fieldLabel}>{fieldLabel(key, t)}</Text>
                      <TextInput
                        style={s.fieldInput}
                        value={String(extra[key] ?? '')}
                        onChangeText={v => setExtraField(key, v === '' ? null : parseFloat(v) || 0)}
                        keyboardType="numeric"
                      />
                    </View>
                  );
                }
                // その他 → テキスト入力
                return (
                  <View key={key} style={s.fieldRow}>
                    <Text style={s.fieldLabel}>{fieldLabel(key, t)}</Text>
                    <TextInput
                      style={s.fieldInput}
                      value={String(extra[key] ?? '')}
                      onChangeText={v => setExtraField(key, v || null)}
                    />
                  </View>
                );
              }

              // 表示モード
              // mb_reward_items は配列なので特別表示
              if (key === 'mb_reward_items' && Array.isArray(val)) {
                const GEM_EMOJI = { efficiency: '🟡', luck: '🔵', comfort: '🔴', resilience: '🟣' };
                const summary = val.map((s, i) => {
                  if (s.item_type === 'scroll') {
                    return `ミンスク(${s.scroll_rarity ?? '?'}) x${s.quantity}`;
                  }
                  return `${GEM_EMOJI[s.gem_color] ?? '?'} Lv${s.gem_level} x${s.quantity}`;
                }).join('\n');
                return (
                  <View key={key} style={s.fieldRow}>
                    <Text style={s.fieldLabel}>{fieldLabel(key, t)}</Text>
                    <Text style={[s.fieldValue, { lineHeight: 20 }]}>{summary}</Text>
                  </View>
                );
              }

              const display =
                typeof val === 'boolean' ? (val ? t('rd_bool_yes') : t('rd_bool_no')) :
                val === null             ? 'N/A' :
                Array.isArray(val)       ? JSON.stringify(val) :
                typeof val === 'object'  ? JSON.stringify(val) :
                String(val);
              return (
                <View key={key} style={s.fieldRow}>
                  <Text style={s.fieldLabel}>{fieldLabel(key, t)}</Text>
                  <Text style={s.fieldValue}>{display}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Record ID（参考表示） */}
        <Text style={{ color: '#333', fontSize: 10, textAlign: 'center', marginBottom: 8 }}>
          ID: {record.id}
        </Text>

      </ScrollView>

      {/* ── ボトムボタン ── */}
      <View style={s.bottomBar}>
        {isEditing ? (
          <>
            <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
              <Text style={s.saveBtnText}>{t('set_save_btn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => {
              // 編集をキャンセルして元の値に戻す
              setChain(record.chain ?? null);
              setGst(String(record.gst_amount ?? 0));
              setGmt(String(record.gmt_amount ?? 0));
              setTimestamp(record.timestamp ?? '');
              setCategory(record.category ?? 'unknown');
              setType(record.type ?? 'info');
              setExtra({ ...(record.extra ?? {}) });
              setIsEditing(false);
            }}>
              <Text style={s.cancelBtnText}>{t('csv_cancel')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={s.editBtn} onPress={() => setIsEditing(true)}>
            <Text style={s.editBtnText}>{t('rd_edit_btn')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}


// ─── サムネイル関連スタイル ───────────────
const { width: SCREEN_W } = Dimensions.get('window');

const ts = StyleSheet.create({
  thumbWrap:       { width: 80, marginRight: 12, alignItems: 'center' },
  thumbImg:        { width: 76, height: 100, borderRadius: 8,
                     borderWidth: 1, borderColor: '#333' },
  thumbLabel:      { color: '#666', fontSize: 10, marginTop: 4 },
  thumbModalBg:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
                     justifyContent: 'center', alignItems: 'center' },
  thumbModalImg:   { width: SCREEN_W * 0.9, height: SCREEN_W * 1.6,
                     borderRadius: 8 },
  thumbModalClose: { color: '#888', fontSize: 14, marginTop: 16 },
});
