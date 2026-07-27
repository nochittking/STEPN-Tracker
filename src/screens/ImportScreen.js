/**
 * src/screens/ImportScreen.js
 * STEPN収支管理ツール - スクショ取込フロー
 *
 * phase 1: SELECT    → 画像選択
 * phase 2: ANALYZING → OCR解析中
 * phase 3: CONFIRM   → 取込確認一覧
 * phase 4: DONE      → 保存完了
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, Alert, ActivityIndicator,
  FlatList, Modal, Image, TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { analyzeScreenshot } from '../services/VisionAnalyzer';
import { StorageService } from '../services/StorageService';
import {
  getMbRewardItems, getKeptGemColor, getChainSuggestion,
} from '../services/VisionAnalyzer';
import { ConfirmItem, DonePhase } from './ImportScreen_item';
import { s } from './ImportScreen_styles';
import {
  CHAIN_COLORS, CHAIN_TEXT, CATEGORY_LABELS, CATEGORY_GROUPS,
  MB_QUALITY, GEM_COLORS, confLabel,
} from './ImportScreen_constants';
import { useI18n } from '../i18n/i18n';   // ★ 多言語対応

/** FNV-1a ハッシュ（純JS実装・expo-crypto 不要） */
const fnv1aHash = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
};

export default function ImportScreen({ navigation, route }) {
  const { t, lang } = useI18n();   // ★ 多言語対応
  const { chain: initChain = 'BNB' } = route.params ?? {};

  // ヘッダータイトルを現在の言語で更新（言語切替に即反応）
  useEffect(() => {
    navigation.setOptions({ title: t('nav_import') });
  }, [navigation, lang]);

  const [phase,     setPhase]     = useState('SELECT');
  const [items,     setItems]     = useState([]); // 解析済みアイテム[]
  const [progress,  setProgress]  = useState({ done: 0, total: 0 });
  const [savedCount, setSavedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  // ✅ useRef を使う：state はバッチ更新のため即時反映されず二重タップを防げない
  const isSavingRef    = useRef(false); // 保存中フラグ（Ref で同期的に更新）
  const isAnalyzingRef = useRef(false); // 解析中フラグ（Ref で同期的に更新）
  const [isSavingUI, setIsSavingUI] = useState(false); // ボタン表示用だけ state

  // ── phase: SELECT ─────────────────────

  const handlePickImages = async () => {
    if (isAnalyzingRef.current) return; // 二重起動防止
    isAnalyzingRef.current = true;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('alert_perm_title'), t('alert_perm_msg'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 20,
        quality: 1,
      });
      if (result.canceled) return;
      const uris = result.assets.map((a) => a.uri);
      await analyzeAll(uris, initChain);
    } finally {
      isAnalyzingRef.current = false; // 必ずリセット
    }
  };

  // ── phase: ANALYZING ──────────────────

  const analyzeAll = async (uris, chain) => {
    setPhase('ANALYZING');
    setProgress({ done: 0, total: uris.length });

    // サムネイル保存先ディレクトリを準備
    const thumbDir = FileSystem.documentDirectory + 'thumbnails/';
    try {
      await FileSystem.makeDirectoryAsync(thumbDir, { intermediates: true });
    } catch (_) { /* 既存なら無視 */ }

    const results = [];
    for (let i = 0; i < uris.length; i++) {
      const uri = uris[i];
      try {
        // ── B案：画像ハッシュで完全一致チェック ──
        let imageHash = null;
        let duplicateType = null;   // 'exact' | 'similar' | null
        let duplicateRecord = null;
        try {
          const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
          imageHash = fnv1aHash(base64.slice(0, 5000) + base64.slice(-5000));  // 先頭5KB+末尾5KBでハッシュ（衝突回避）
          const isExact = await StorageService.checkImageHash(imageHash);
          if (isExact) duplicateType = 'exact';
        } catch (hashErr) {
          console.warn('[ImportScreen] hash error (skip):', hashErr.message);
        }

        // ── OCR解析 ──
        const res = await analyzeScreenshot(uri, null);

        // ── A案：内容重複チェック（ハッシュが一致しなかった場合のみ） ──
        if (!duplicateType && res.category !== 'unknown') {
          try {
            const dup = await StorageService.checkContentDuplicate({
              category:   res.category,
              chain:      chain,
              gst_amount: res.gst_amount ?? 0,
              gmt_amount: res.gmt_amount ?? 0,
            });
            if (dup.found) {
              duplicateType = 'similar';
              duplicateRecord = dup.record;
            }
          } catch (dupErr) {
            console.warn('[ImportScreen] content dup check error:', dupErr.message);
          }
        }

        // チェーン自動判定
        let chainSuggestion = null;
        if (res.category === 'home' ||
            res.extra?.needs_pixel_scan ||
            res.needs_chain_confirm) {
          chainSuggestion = await getChainSuggestion(uri);
        }

        // サムネイル生成（幅300pxに縮小・JPEG 70%品質）
        let thumbnailUri = null;
        try {
          const thumbName = `thumb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`;
          const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 300 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
          );
          await FileSystem.moveAsync({ from: manipResult.uri, to: thumbDir + thumbName });
          thumbnailUri = 'thumbnails/' + thumbName;
        } catch (thumbErr) {
          console.warn('[ImportScreen] thumbnail error (skip):', thumbErr.message);
        }

        results.push({
          id:              `item_${i}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          uri,
          imageHash,
          thumbnailUri,
          analyzeResult:   res,
          selectedChain:   chainSuggestion ?? null,
          chainSuggestion,
          duplicateType,      // 'exact' | 'similar' | null
          duplicateRecord,    // 類似レコードの情報
          skipSave:        duplicateType === 'exact',  // 完全一致はデフォルトでスキップ
          // 特殊フロー用のstate
          specialDone:     false,
          gemUpgradeResult: null,
          mbRewardItems:   null,
          mbLevel:         null,
          enhanceResult:   null,
          keptGemColor:    null,
          // MB結果紐付け用
          linkedCostId:    null,
          // カテゴリ手動選択用
          manualGroup:     null,
          manualCategory:  null,
        });
      } catch (e) {
        console.warn('[ImportScreen] analyzeScreenshot error:', e);
        results.push({
          id: `item_${i}_${Date.now()}`,
          uri,
          imageHash: null,
          thumbnailUri: null,
          analyzeResult: { success: false, confidence: 0, category: 'unknown',
            type: 'info', gst_amount: 0, gmt_amount: 0, extra: {}, warnings: ['OCR失敗'] },
          selectedChain: null,
          chainSuggestion: null,
          duplicateType: null,
          duplicateRecord: null,
          skipSave: false,
          specialDone: false,
          gemUpgradeResult: null, mbRewardItems: null, mbLevel: null,
          enhanceResult: null, keptGemColor: null,
          manualGroup: null, manualCategory: null,
        });
      }
      setProgress({ done: i + 1, total: uris.length });
    }

    // ピクセル解析が必要なものを非同期実行
    for (const item of results) {
      const r = item.analyzeResult;
      if (r.extra?.needs_pixel_scan) {
        if (r.extra.pixel_scan_type === 'kept_gem') {
          item.keptGemColor = await getKeptGemColor(item.uri);
        }
        // mystery_box_open（コスト確認画面）はピクセル解析不要
        // mb_result（開封結果画面）のみピクセル解析を行う
        // → mb_resultはVisionAnalyzer側でneeds_pixel_scanフラグが立つ
      }
    }

    setItems(results);
    setPhase('CONFIRM');
  };

  // ── phase: CONFIRM ────────────────────

  // 一括チェーン選択
  const handleBulkChain = (chain) => {
    setItems((prev) => prev.map((item) => ({ ...item, selectedChain: chain })));
  };

  // 個別チェーン選択
  const handleItemChain = (id, chain) => {
    setItems((prev) => prev.map((item) =>
      item.id === id ? { ...item, selectedChain: chain } : item
    ));
  };

  // カテゴリ手動選択（大分類）
  const handleManualGroup = (id, group) => {
    setItems((prev) => prev.map((item) =>
      item.id === id ? { ...item, manualGroup: group, manualCategory: null } : item
    ));
  };

  // カテゴリ手動選択（細分類）
  const handleManualCategory = (id, category) => {
    setItems((prev) => prev.map((item) =>
      item.id === id ? { ...item, manualCategory: category } : item
    ));
  };

  // 重複スキップのON/OFF切り替え
  const handleToggleSkip = (id) => {
    setItems((prev) => prev.map((item) =>
      item.id === id ? { ...item, skipSave: !item.skipSave } : item
    ));
  };

  // gem_upgrade_confirm の結果選択
  const handleGemUpgradeResult = (id, result) => {
    setItems((prev) => prev.map((item) =>
      item.id === id ? { ...item, gemUpgradeResult: result, specialDone: true } : item
    ));
  };

  // MB Lv選択（move_result）
  const handleMbLevel = (id, level) => {
    setItems((prev) => prev.map((item) =>
      item.id === id ? { ...item, mbLevel: level, specialDone: true } : item
    ));
  };

  // shoe_enhance の結果選択
  const handleEnhanceResult = (id, result) => {
    setItems((prev) => prev.map((item) =>
      item.id === id ? { ...item, enhanceResult: result, specialDone: true } : item
    ));
  };

  // MBアイテム確認OK
  // MB開封結果確定（slots = 手動選択済みのスロット配列）
  const handleMbItemsOk = (id, slots) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      // extra.mb_reward_items を手動選択結果で上書き
      const updatedExtra = {
        ...(item.analyzeResult.extra ?? {}),
        mb_reward_items: slots,
      };
      return {
        ...item,
        specialDone: true,
        mbRewardItems: slots,
        analyzeResult: {
          ...item.analyzeResult,
          extra: updatedExtra,
        },
      };
    }));
  };

  // VIPジェム色修正
  const handleKeptGemColor = (id, color) => {
    setItems((prev) => prev.map((item) =>
      item.id === id ? { ...item, keptGemColor: color, specialDone: true } : item
    ));
  };

  // MB結果とコストの紐付け
  const handleLinkMbCost = (mbResultId, mbCostId) => {
    setItems((prev) => prev.map((item) =>
      item.id === mbResultId ? { ...item, linkedCostId: mbCostId } : item
    ));
  };

  // 保存実行
  const handleSave = async () => {
    if (isSavingRef.current) return; // 二重タップ防止（Ref で即時チェック）
    isSavingRef.current = true;
    setIsSavingUI(true);
    console.log('[handleSave] START, items:', items.length);
    let saved = 0;
    let pending = 0;

    for (const item of items) {
      const r = item.analyzeResult;
      const category = item.manualCategory ?? r.category;

      // unknown かつカテゴリ未選択 → スキップ
      if (category === 'unknown' && !item.manualCategory) continue;

      // 重複でスキップ指定 → スキップ
      if (item.skipSave) continue;

      const recordBase = {
        category,
        chain: item.selectedChain,
        gst_amount: r.gst_amount ?? 0,
        gmt_amount: r.gmt_amount ?? 0,
        extra: buildExtra(item),
        confidence: r.confidence,
        memo: '',
        image_hash: item.imageHash,
        thumbnail_uri: item.thumbnailUri,
      };

      try {
        if (item.selectedChain) {
          await StorageService.saveRecord(recordBase);
          saved++;
          // ハッシュを保存（次回の重複検出用）
          if (item.imageHash) {
            await StorageService.saveImageHash(item.imageHash);
          }
        } else {
          await StorageService.savePendingRecord(recordBase);
          pending++;
        }
      } catch (e) {
        console.error('[ImportScreen] saveRecord error:', e);
      }
    }

    // スキップされたアイテムのサムネイルを削除
    for (const item of items) {
      if (item.skipSave && item.thumbnailUri) {
        try {
          await FileSystem.deleteAsync(
            FileSystem.documentDirectory + item.thumbnailUri,
            { idempotent: true }
          );
        } catch (_) {}
      }
      // unknownでカテゴリ未選択のスキップ分も削除
      const cat = item.manualCategory ?? item.analyzeResult.category;
      if (cat === 'unknown' && !item.manualCategory && item.thumbnailUri) {
        try {
          await FileSystem.deleteAsync(
            FileSystem.documentDirectory + item.thumbnailUri,
            { idempotent: true }
          );
        } catch (_) {}
      }
    }

    setSavedCount(saved);
    setPendingCount(pending);
    isSavingRef.current = false;
    setIsSavingUI(false);
    setPhase('DONE');
  };

  // extra を item の各選択結果で組み立てる
  const buildExtra = (item) => {
    const base = { ...(item.analyzeResult.extra ?? {}) };

    if (item.gemUpgradeResult === 'success') {
      base.result = 'success';
    } else if (item.gemUpgradeResult === 'fail') {
      base.result = 'fail';
    }
    if (item.keptGemColor) {
      base.gem_type = item.keptGemColor;
    }
    if (item.mbRewardItems) {
      base.reward_items = item.mbRewardItems;
    }
    if (item.mbLevel) {
      base.mb_level   = item.mbLevel;
      base.mb_quality = MB_QUALITY[item.mbLevel] ?? null;
    }
    if (item.enhanceResult) {
      base.enhance_result = item.enhanceResult;
    }
    return base;
  };

  // ─────────────────────────────────────────
  // レンダリング
  // ─────────────────────────────────────────

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {phase === 'SELECT'    && <SelectPhase onPick={handlePickImages} />}
      {phase === 'ANALYZING' && <AnalyzingPhase progress={progress} />}
      {phase === 'CONFIRM'   && (
        <ConfirmPhase
          items={items}
          onBulkChain={handleBulkChain}
          onItemChain={handleItemChain}
          onManualGroup={handleManualGroup}
          onManualCategory={handleManualCategory}
          onGemUpgradeResult={handleGemUpgradeResult}
          onMbLevel={handleMbLevel}
          onEnhanceResult={handleEnhanceResult}
          onMbItemsOk={handleMbItemsOk}
          onKeptGemColor={handleKeptGemColor}
          onLinkMbCost={handleLinkMbCost}
          onToggleSkip={handleToggleSkip}
          onSave={handleSave}
          isSaving={isSavingUI}
        />
      )}
      {phase === 'DONE' && (
        <DonePhase
          savedCount={savedCount}
          pendingCount={pendingCount}
          onBack={() => navigation.goBack()}
        />
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────
// phase 1: SELECT
// ─────────────────────────────────────────

function SelectPhase({ onPick }) {
  const { t } = useI18n();
  return (
    <View style={s.centerBox}>
      <Text style={s.phaseEmoji}>📸</Text>
      <Text style={s.phaseTitle}>{t('select_title')}</Text>
      <Text style={s.phaseSub}>{t('select_sub')}</Text>
      <TouchableOpacity style={s.primaryBtn} onPress={onPick}>
        <Text style={s.primaryBtnText}>{t('select_open')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────
// phase 2: ANALYZING
// ─────────────────────────────────────────

function AnalyzingPhase({ progress }) {
  const { t } = useI18n();
  const pct = progress.total > 0
    ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <View style={s.centerBox}>
      <ActivityIndicator size="large" color="#00ff88" />
      <Text style={s.phaseTitle}>{t('analyzing_title')}</Text>
      <Text style={s.phaseSub}>{t('analyzing_count', progress.done, progress.total)}</Text>
      <View style={s.progressBar}>
        <View style={[s.progressFill, { width: `${pct}%` }]} />
      </View>
      <Text style={s.progressPct}>{pct}%</Text>
    </View>
  );
}

// ─────────────────────────────────────────
// phase 3: CONFIRM
// ─────────────────────────────────────────

function ConfirmPhase({
  items, onBulkChain, onItemChain, onManualGroup, onManualCategory,
  onGemUpgradeResult, onMbLevel, onEnhanceResult, onMbItemsOk,
  onKeptGemColor, onLinkMbCost, onToggleSkip, onSave, isSaving,
}) {
  const { t } = useI18n();
  const chainedCount  = items.filter((i) => i.selectedChain && !i.skipSave).length;
  const pendingItems  = items.filter((i) => !i.selectedChain && !i.skipSave).length;
  const unknownCount  = items.filter(
    (i) => (i.analyzeResult.category === 'unknown') && !i.manualCategory
  ).length;
  const skipCount     = items.filter((i) => i.skipSave).length;

  return (
    <View style={{ flex: 1 }}>
      {/* 一括チェーン選択 */}
      <View style={s.bulkBar}>
        <Text style={s.bulkLabel}>{t('bulk_label')}</Text>
        {['SOL', 'BNB', 'POL'].map((c) => (
          <TouchableOpacity
            key={c}
            style={[s.bulkBtn, { backgroundColor: CHAIN_COLORS[c] }]}
            onPress={() => onBulkChain(c)}
          >
            <Text style={[s.bulkBtnText, { color: CHAIN_TEXT[c] }]}>{t('bulk_all', c)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* アイテムリスト */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
        renderItem={({ item, index }) => (
          <ConfirmItem
            item={item}
            index={index}
            allItems={items}
            onChain={(chain) => onItemChain(item.id, chain)}
            onManualGroup={(g) => onManualGroup(item.id, g)}
            onManualCategory={(c) => onManualCategory(item.id, c)}
            onGemUpgradeResult={(r) => onGemUpgradeResult(item.id, r)}
            onMbLevel={(l) => onMbLevel(item.id, l)}
            onEnhanceResult={(r) => onEnhanceResult(item.id, r)}
            onMbItemsOk={(slots) => onMbItemsOk(item.id, slots)}
            onKeptGemColor={(c) => onKeptGemColor(item.id, c)}
            onLinkMbCost={(costId) => onLinkMbCost(item.id, costId)}
            onToggleSkip={() => onToggleSkip(item.id)}
          />
        )}
      />

      {/* 保存ボタン */}
      <View style={s.saveBar}>
        {skipCount > 0 && (
          <Text style={[s.saveHint, { color: '#ff8844' }]}>
            {t('skip_hint', skipCount)}
          </Text>
        )}
        {pendingItems > 0 && (
          <Text style={s.saveHint}>
            {t('pending_hint', pendingItems)}
          </Text>
        )}
        {unknownCount > 0 && (
          <Text style={[s.saveHint, { color: '#ff4444' }]}>
            {t('unknown_hint', unknownCount)}
          </Text>
        )}
        <TouchableOpacity
          style={[s.saveBtn, isSaving && { opacity: 0.5 }]}
          onPress={onSave}
          disabled={isSaving}
        >
          <Text style={s.saveBtnText}>
            {isSaving ? t('saving') : t('save_btn', chainedCount, pendingItems)}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────
// ConfirmItem - 1件分のカード
// ─────────────────────────────────────────
