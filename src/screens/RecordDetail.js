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
import { CATEGORY_LABELS } from './ImportScreen_constants';
import { s } from './RecordDetail_styles';

// ─── 定数 ────────────────────────────────
const CHAIN_COLORS = { SOL: '#9FFB50', BNB: '#F3BA2F', POL: '#9063CD' };
const CHAIN_TEXT   = { SOL: '#000',    BNB: '#000',    POL: '#fff'    };
const CHAINS       = ['SOL', 'BNB', 'POL'];

const TYPE_OPTIONS = [
  { key: 'income',  label: '💚 収入' },
  { key: 'expense', label: '🔴 支出' },
  { key: 'info',    label: '⚪ 情報' },
  { key: 'listing', label: '🏷️ 売却中' },
];

/** タイムスタンプから YYYY_MM を算出 */
function ymFromTimestamp(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}_${m}`;
}

/** フィールドキーを日本語ラベルに変換 */
function fieldLabel(key) {
  const labels = {
    earn_mode: 'アーンモード', earn_amount: '獲得量',
    move_date: 'ムーブ日時', duration: '時間', distance_km: '距離(km)',
    en_used: 'EN消費', mb_obtained: 'MB取得', mb_level: 'MBレベル', mb_quality: 'MB品質',
    hp_before: 'HP修復前', hp_after: 'HP修復後', hp_gained: 'HP増加',
    durability_before: 'Durability修復前', durability_after: 'Durability修復後',
    shoe_id: '靴ID', is_genesis: 'Genesis靴',
    level_after: 'レベル(後)', level_before: 'レベル(前)', wait_mins: '待機時間(分)',
    socket_type: 'ソケットタイプ', shoe_rarity: '靴レアリティ',
    gem_type: 'ジェムタイプ', is_rainbow: 'レインボー', rainbow_gem_chance: 'レインボー確率',
    vip_kept_gem: 'VIPジェム保持', vip_kept_scroll: 'VIPミンスク保持',
    parent1_id: '親靴1', parent2_id: '親靴2', double_mint_rate: 'ダブルミント率',
    vip_scroll_chance: 'VIPミンスク確率', is_twin: '双子',
    box1_rarity: '靴箱1レアリティ', box2_rarity: '靴箱2レアリティ',
    mb_rarity: 'MBレアリティ', base_cost: 'ベースコスト', boosting_cost: 'ブースティング',
    unlock_time: '開封時間',
    transfer_amount: '送金額', transfer_token: 'トークン',
    fee_amount: '手数料', fee_token: '手数料トークン',
    from_wallet: '送金元', to_wallet: '送金先',
    item_type: 'アイテムタイプ', gem_level: 'ジェムLv',
    gem_attribute: 'ジェムバフ値', scroll_rarity: 'ミンスクレアリティ',
    shoe_type: '靴タイプ', shoe_level: '靴レベル',
    price_gmt: '出品価格(GMT)', listing_date: '出品日',
    rate_type: 'レートタイプ', rainbow_sneaker_chance: 'レインボー靴確率',
    enhance_result: '強化結果',
    gst_balance: 'GST残高', gmt_balance: 'GMT残高', earn_mode: 'アーンモード',
    en_current: 'EN現在', en_max: 'EN最大', en_refill_in: 'EN補充まで',
    active_shoe_id: '使用中靴ID', active_shoe_type: '靴タイプ',
    active_shoe_level: '靴レベル', is_vip: 'VIP',
    valid_until: 'VIP有効期限',
    points_redistributed: '振り直しポイント', gmt_per_point: 'GMT/ポイント',
    needs_pixel_scan: 'ピクセル解析', pixel_scan_type: '解析タイプ',
    result: '結果',
  };
  return labels[key] || key;
}

/** 信頼度バッジ */
function ConfBadge({ score }) {
  const { label, color } =
    score >= 0.9 ? { label: '✅ 信頼度高',  color: '#00ff88' } :
    score >= 0.6 ? { label: '⚠️ 要確認',   color: '#ffaa00' } :
                   { label: '❓ 要手動確認', color: '#ff4444' };
  return (
    <View style={[s.confBadge, { borderColor: color }]}>
      <Text style={[s.confText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── メイン画面 ──────────────────────────
export default function RecordDetail({ navigation, route }) {
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
      Alert.alert('保存失敗', e.message);
    }
  }, [chain, gst, gmt, timestamp, category, type, extra, ym]);

  // ── 削除 ──────────────────────────────
  const handleDelete = useCallback(() => {
    Alert.alert(
      '削除確認',
      'このレコードを削除してええ？\nこの操作は元に戻せへんで。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除', style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deleteRecords([record.id], ym);
              navigation.goBack();
            } catch (e) {
              Alert.alert('削除失敗', e.message);
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
          <Text style={{ color: '#00ff88', fontSize: 16 }}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, flex: 1 }}>
          レコード詳細
        </Text>
        <TouchableOpacity onPress={handleDelete} style={s.deleteBtn}>
          <Text style={s.deleteBtnText}>🗑️ 削除</Text>
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
            <Text style={ts.thumbModalClose}>✕ タップで閉じる</Text>
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
                <Text style={ts.thumbLabel}>🔍 拡大</Text>
              </TouchableOpacity>
            ) : null}
            <View style={{ flex: 1 }}>
              <View style={s.categoryRow}>
                <Text style={s.categoryText}>
                  {CATEGORY_LABELS[record.category] ?? record.category}
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
          <Text style={s.sectionTitle}>基本情報</Text>

          {/* チェーン */}
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>チェーン</Text>
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
                {chain ?? '未選択'}
              </Text>
            )}
          </View>

          {/* 日時 */}
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>日時</Text>
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
            <Text style={s.fieldLabel}>GST金額</Text>
            {isEditing ? (
              <TextInput style={s.fieldInput} value={gst}
                onChangeText={setGst} keyboardType="numeric" />
            ) : (
              <Text style={s.fieldValue}>{record.gst_amount ?? 0}</Text>
            )}
          </View>

          {/* GMT */}
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>GMT金額</Text>
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
              <Text style={[s.fieldLabel, { marginBottom: 8 }]}>カテゴリ</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(CATEGORY_LABELS)
                  .filter(([k]) => k !== 'unknown')
                  .map(([k, v]) => (
                    <TouchableOpacity
                      key={k}
                      style={[s.catBtn, category === k && s.catBtnActive]}
                      onPress={() => setCategory(k)}
                    >
                      <Text style={[s.catBtnText, category === k && s.catBtnTextActive]}>
                        {v}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </View>
          )}

          {/* type（編集時） */}
          {isEditing && (
            <View style={{ paddingVertical: 8 }}>
              <Text style={[s.fieldLabel, { marginBottom: 8 }]}>種別</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {TYPE_OPTIONS.map(t => (
                  <TouchableOpacity
                    key={t.key}
                    style={[s.catBtn, type === t.key && s.catBtnActive]}
                    onPress={() => setType(t.key)}
                  >
                    <Text style={[s.catBtnText, type === t.key && s.catBtnTextActive]}>
                      {t.label}
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
            <Text style={s.sectionTitle}>詳細情報</Text>
            {Object.entries(extra).map(([key, val]) => {
              // 内部フラグ系は表示スキップ
              if (['needs_pixel_scan', 'pixel_scan_type'].includes(key)) return null;
              if (key === 'mb_reward_items' && val === null) return null;
              if (val === null && !isEditing) return (
                <View key={key} style={s.fieldRow}>
                  <Text style={s.fieldLabel}>{fieldLabel(key)}</Text>
                  <Text style={s.fieldNull}>N/A</Text>
                </View>
              );

              if (isEditing) {
                // boolean → Switch
                if (typeof val === 'boolean') {
                  return (
                    <View key={key} style={s.toggleRow}>
                      <Text style={s.fieldLabel}>{fieldLabel(key)}</Text>
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
                      <Text style={s.fieldLabel}>{fieldLabel(key)}</Text>
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
                    <Text style={s.fieldLabel}>{fieldLabel(key)}</Text>
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
                    <Text style={s.fieldLabel}>{fieldLabel(key)}</Text>
                    <Text style={[s.fieldValue, { lineHeight: 20 }]}>{summary}</Text>
                  </View>
                );
              }

              const display =
                typeof val === 'boolean' ? (val ? '✅ はい' : '❌ いいえ') :
                val === null             ? 'N/A' :
                Array.isArray(val)       ? JSON.stringify(val) :
                typeof val === 'object'  ? JSON.stringify(val) :
                String(val);
              return (
                <View key={key} style={s.fieldRow}>
                  <Text style={s.fieldLabel}>{fieldLabel(key)}</Text>
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
              <Text style={s.saveBtnText}>💾 保存する</Text>
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
              <Text style={s.cancelBtnText}>キャンセル</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={s.editBtn} onPress={() => setIsEditing(true)}>
            <Text style={s.editBtnText}>✏️ 編集する</Text>
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
