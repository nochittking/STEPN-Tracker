/**
 * src/screens/RecordListScreen.js
 * STEPN収支管理ツール - 記録一覧画面
 *
 * タブ：収入 / 支出 / 情報 / 売却中 / 仮保存 / 修正履歴（後回し）
 * 機能：チェーンフィルタ / ソート / 複数選択削除 / 仮保存の正式保存
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  StatusBar, FlatList, Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StorageService } from '../services/StorageService';
import { useI18n } from '../i18n/i18n';   // ★ 多言語対応

// ─────────────────────────────────────────
// 定数
// ─────────────────────────────────────────

const CHAIN_COLORS = {
  SOL: '#9FFB50',
  BNB: '#F3BA2F',
  POL: '#9063CD',
};
const CHAIN_TEXT = { SOL: '#000', BNB: '#000', POL: '#fff' };

const TAB_KEYS = ['all', 'income', 'expense', 'info', 'listing', 'pending', 'history'];

// ─────────────────────────────────────────
// RecordListScreen
// ─────────────────────────────────────────

export default function RecordListScreen({ navigation, route }) {
  const { t, lang } = useI18n();   // ★ 多言語対応
  const initTab = route.params?.tab ?? 'all';
  const initChain = route.params?.chain ?? 'ALL';

  // ヘッダータイトルを現在の言語で更新（言語切替に即反応）
  useEffect(() => {
    navigation.setOptions({ title: t('nav_recordlist') });
  }, [navigation, lang]);

  const [activeTab,     setActiveTab]     = useState(initTab);
  const [chainFilter,   setChainFilter]   = useState(initChain);
  const [sortOrder,     setSortOrder]     = useState('desc'); // 'desc'|'asc'
  const [records,       setRecords]       = useState([]);
  const [pending,       setPending]       = useState([]);
  const [loading,       setLoading]       = useState(false);

  // 複数選択モード
  const [selectMode,    setSelectMode]    = useState(false);
  const [selected,      setSelected]      = useState(new Set());

  // 仮保存の正式保存用
  const [pendingChains, setPendingChains] = useState({}); // { id: 'BNB' }

  // ── データ取得 ──────────────────────────

  useFocusEffect(
    useCallback(() => {
      loadData();
      setSelectMode(false);
      setSelected(new Set());
    }, [activeTab, chainFilter, sortOrder]),
  );

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'pending') {
        const p = await StorageService.getPendingRecords();
        setPending(p);
      } else if (activeTab !== 'history') {
        // 全月のレコードを取得してフィルタリング
        const index = await StorageService.getIndex();
        let all = [];
        for (const ym of index) {
          const recs = await StorageService.getRecords({ ym });
          all = all.concat(recs.map((r, i) => ({ ...r, _ukey: r._ukey ?? `${r.id}_${all.length + i}` })));
        }
        // typeフィルタ（ALLの場合はpending以外全部）
        let filtered = activeTab === 'all'
          ? all.filter((r) => r.type !== 'pending')
          : all.filter((r) => r.type === activeTab);
        // チェーンフィルタ
        if (chainFilter !== 'ALL') {
          filtered = filtered.filter((r) => r.chain === chainFilter);
        }
        // ソート
        filtered.sort((a, b) => {
          const ta = new Date(a.timestamp).getTime();
          const tb = new Date(b.timestamp).getTime();
          return sortOrder === 'desc' ? tb - ta : ta - tb;
        });
        setRecords(filtered);
      }
    } catch (e) {
      console.error('[RecordListScreen] loadData error:', e);
    } finally {
      setLoading(false);
    }
  };

  // ── 複数選択モード ───────────────────────

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const ids = records.map((r) => r.id);
    setSelected(new Set(ids));
  };

  const handleDeleteSelected = () => {
    if (selected.size === 0) return;
    Alert.alert(
      t('alert_delete_title'),
      t('alert_delete_msg', selected.size),
      [
        { text: t('btn_cancel'), style: 'cancel' },
        {
          text: t('btn_delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const index = await StorageService.getIndex();
              for (const ym of index) {
                const recs = await StorageService.getRecords({ ym });
                const toDelete = recs
                  .filter((r) => selected.has(r.id))
                  .map((r) => r.id);
                if (toDelete.length > 0) {
                  await StorageService.deleteRecords(toDelete, ym);
                }
              }
              setSelectMode(false);
              setSelected(new Set());
              loadData();
            } catch (e) {
              Alert.alert(t('alert_error_title'), t('delete_fail_msg'));
            }
          },
        },
      ],
    );
  };

  // ── 仮保存の正式保存 ─────────────────────

  const handleConfirmPending = async (pendingId) => {
    const chain = pendingChains[pendingId];
    if (!chain) {
      Alert.alert(t('alert_error_title'), t('chain_required_msg'));
      return;
    }
    try {
      await StorageService.confirmPending(pendingId, chain);
      Alert.alert(t('alert_done_title'), t('confirm_pending_success', chain));
      loadData();
    } catch (e) {
      Alert.alert(t('alert_error_title'), t('save_fail_msg'));
    }
  };

  const handleDeletePending = (pendingId) => {
    Alert.alert(
      t('alert_delete_title'),
      t('delete_pending_confirm_msg'),
      [
        { text: t('btn_cancel'), style: 'cancel' },
        {
          text: t('btn_delete'),
          style: 'destructive',
          onPress: async () => {
            await StorageService.deletePending(pendingId);
            loadData();
          },
        },
      ],
    );
  };

  // ─────────────────────────────────────────
  // レンダリング
  // ─────────────────────────────────────────

  const currentData = activeTab === 'pending' ? pending : records;

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* タブ */}
      <View style={s.tabBar}>
        <FlatList
          horizontal
          data={TAB_KEYS}
          keyExtractor={(key) => key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabList}
          renderItem={({ item: key }) => (
            <TouchableOpacity
              style={[s.tab, activeTab === key && s.tabActive]}
              onPress={() => {
                setActiveTab(key);
                setSelectMode(false);
                setSelected(new Set());
              }}
            >
              <Text style={[s.tabText, activeTab === key && s.tabTextActive]}>
                {t('tab_' + key)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* 修正履歴タブ（後回し） */}
      {activeTab === 'history' && (
        <View style={s.placeholderBox}>
          <Text style={s.placeholderEmoji}>📝</Text>
          <Text style={s.placeholderText}>{t('history_placeholder')}</Text>
        </View>
      )}

      {activeTab !== 'history' && (
        <>
          {/* フィルタ・ソートバー */}
          {activeTab !== 'pending' && (
            <View style={s.filterBar}>
              {/* チェーンフィルタ */}
              <View style={s.filterRow}>
                {['ALL', 'SOL', 'BNB', 'POL'].map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      s.filterBtn,
                      chainFilter === c && {
                        backgroundColor: c === 'ALL' ? '#00ff88' : CHAIN_COLORS[c],
                        borderColor: c === 'ALL' ? '#00ff88' : CHAIN_COLORS[c],
                      },
                    ]}
                    onPress={() => setChainFilter(c)}
                  >
                    <Text style={[
                      s.filterBtnText,
                      chainFilter === c && {
                        color: c === 'ALL' ? '#000' : CHAIN_TEXT[c],
                      },
                    ]}>{c}</Text>
                  </TouchableOpacity>
                ))}

                {/* ソート */}
                <TouchableOpacity
                  style={s.sortBtn}
                  onPress={() => setSortOrder((p) => p === 'desc' ? 'asc' : 'desc')}
                >
                  <Text style={s.sortBtnText}>
                    {sortOrder === 'desc' ? t('sort_newest') : t('sort_oldest')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 操作バー */}
          <View style={s.actionBar}>
            <Text style={s.countText}>
              {activeTab === 'pending'
                ? t('count_pending', pending.length)
                : t('count_records', records.length)}
            </Text>
            {activeTab !== 'pending' && (
              <TouchableOpacity
                style={[s.selectBtn, selectMode && s.selectBtnActive]}
                onPress={() => {
                  setSelectMode((p) => !p);
                  setSelected(new Set());
                }}
              >
                <Text style={[s.selectBtnText, selectMode && { color: '#000' }]}>
                  {selectMode ? t('select_cancel_btn') : t('select_mode_btn')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 複数選択時の操作ボタン */}
          {selectMode && (
            <View style={s.multiBar}>
              <TouchableOpacity style={s.multiBtn} onPress={handleSelectAll}>
                <Text style={s.multiBtnText}>{t('select_all_btn')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.multiBtn, s.multiBtnDanger]}
                onPress={handleDeleteSelected}
              >
                <Text style={[s.multiBtnText, { color: '#ff4444' }]}>
                  {t('delete_selected_btn', selected.size)}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* リスト */}
          {loading ? (
            <View style={s.loadingBox}>
              <ActivityIndicator size="large" color="#00ff88" />
              <Text style={s.loadingText}>{t('loading_text')}</Text>
            </View>
          ) : currentData.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyEmoji}>📭</Text>
              <Text style={s.emptyText}>{t('empty_records')}</Text>
            </View>
          ) : (
            <FlatList
              data={activeTab === 'pending' ? pending : records}
              keyExtractor={(item) => item._ukey ?? item.id}
              contentContainerStyle={s.listContent}
              renderItem={({ item }) =>
                activeTab === 'pending' ? (
                  <PendingCard
                    item={item}
                    selectedChain={pendingChains[item.id] ?? null}
                    onChainSelect={(chain) =>
                      setPendingChains((prev) => ({ ...prev, [item.id]: chain }))
                    }
                    onConfirm={() => handleConfirmPending(item.id)}
                    onDelete={() => handleDeletePending(item.id)}
                  />
                ) : (
                  <RecordCard
                    item={item}
                    selectMode={selectMode}
                    isSelected={selected.has(item.id)}
                    onPress={() => {
                      if (selectMode) {
                        toggleSelect(item.id);
                      } else {
                        navigation.navigate('RecordDetail', { record: item });
                      }
                    }}
                    onLongPress={() => {}}
                  />
                )
              }
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────
// RecordCard - 通常レコードカード
// ─────────────────────────────────────────

function RecordCard({ item, selectMode, isSelected, onPress }) {
  const { t } = useI18n();
  const label = item.category ? t('cat_' + item.category) : t('cat_unknown');
  const chainColor = CHAIN_COLORS[item.chain] ?? '#333';
  const chainText  = CHAIN_TEXT[item.chain]   ?? '#fff';
  const isIncome   = item.type === 'income';
  const amountColor = isIncome ? '#00ff88' : '#ff4444';
  const sign        = isIncome ? '+' : '-';

  const dateStr = item.timestamp
    ? new Date(item.timestamp).toLocaleString('ja-JP', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      })
    : '-';

  return (
    <TouchableOpacity
      style={[s.recordCard, isSelected && s.recordCardSelected]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* 選択チェック */}
      {selectMode && (
        <View style={[s.checkbox, isSelected && s.checkboxChecked]}>
          {isSelected && <Text style={s.checkboxMark}>✓</Text>}
        </View>
      )}

      <View style={s.recordContent}>
        {/* ヘッダー行 */}
        <View style={s.recordHeader}>
          <Text style={s.recordCategory}>{label}</Text>
          {item.chain && (
            <View style={[s.chainBadge, { backgroundColor: chainColor }]}>
              <Text style={[s.chainBadgeText, { color: chainText }]}>
                {item.chain}
              </Text>
            </View>
          )}
        </View>

        {/* 金額 */}
        <View style={s.recordAmountRow}>
          {item.gst_amount > 0 && (
            <Text style={[s.recordAmount, { color: amountColor }]}>
              {sign}{item.gst_amount.toFixed(2)} GST
            </Text>
          )}
          {item.gmt_amount > 0 && (
            <Text style={[s.recordAmount, { color: amountColor }]}>
              {sign}{item.gmt_amount.toFixed(2)} GMT
            </Text>
          )}
          {item.extra?.jpy_amount > 0 && (
            <Text style={[s.recordAmount, { color: '#ffaa00' }]}>
              ¥{item.extra.jpy_amount.toLocaleString()}
            </Text>
          )}
        </View>

        {/* 日時 */}
        <Text style={s.recordDate}>🕐 {dateStr}</Text>

        {/* サブ情報 */}
        {item.extra?.move_date && (
          <Text style={s.recordSub}>📅 {item.extra.move_date}</Text>
        )}
        {item.extra?.item_type === 'gem' && item.extra?.gem_type && (
          <Text style={s.recordSub}>
            💎 {item.extra.gem_type} Lv{item.extra.gem_level ?? '?'}
          </Text>
        )}
        {item.extra?.item_type === 'sneaker' && item.extra?.shoe_type && (
          <Text style={s.recordSub}>👟 {item.extra.shoe_type}</Text>
        )}
        {item.memo ? (
          <Text style={s.recordMemo}>📝 {item.memo}</Text>
        ) : null}
      </View>

      <Text style={s.recordArrow}>›</Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────
// PendingCard - 仮保存レコードカード
// ─────────────────────────────────────────

function PendingCard({ item, selectedChain, onChainSelect, onConfirm, onDelete }) {
  const { t } = useI18n();
  const label = item.category ? t('cat_' + item.category) : t('cat_unknown');
  const isIncome = item.type === 'income';
  const amountColor = isIncome ? '#00ff88' : '#ff4444';
  const sign = isIncome ? '+' : '-';

  return (
    <View style={s.pendingCard}>
      {/* カテゴリ・金額 */}
      <Text style={s.pendingCategory}>{label}</Text>
      <View style={s.recordAmountRow}>
        {item.gst_amount > 0 && (
          <Text style={[s.recordAmount, { color: amountColor }]}>
            {sign}{item.gst_amount.toFixed(2)} GST
          </Text>
        )}
        {item.gmt_amount > 0 && (
          <Text style={[s.recordAmount, { color: amountColor }]}>
            {sign}{item.gmt_amount.toFixed(2)} GMT
          </Text>
        )}
      </View>

      {/* チェーン選択 */}
      <Text style={s.pendingChainLabel}>{t('pending_select_chain_label')}</Text>
      <View style={s.pendingChainRow}>
        {['SOL', 'BNB', 'POL'].map((c) => {
          const isActive = selectedChain === c;
          return (
            <TouchableOpacity
              key={c}
              style={[s.pendingChainBtn,
                { backgroundColor: isActive ? CHAIN_COLORS[c] : '#111',
                  borderColor: isActive ? CHAIN_COLORS[c] : '#333' }
              ]}
              onPress={() => onChainSelect(c)}
            >
              <Text style={[s.pendingChainBtnText,
                { color: isActive ? CHAIN_TEXT[c] : '#555' }
              ]}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 確定・削除ボタン */}
      <View style={s.pendingBtns}>
        <TouchableOpacity
          style={[s.pendingConfirmBtn,
            !selectedChain && { backgroundColor: '#1a4a33', borderColor: '#1a4a33' }
          ]}
          onPress={onConfirm}
          disabled={!selectedChain}
        >
          <Text style={[s.pendingConfirmText,
            !selectedChain && { color: '#555' }
          ]}>{t('confirm_pending_btn')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.pendingDeleteBtn} onPress={onDelete}>
          <Text style={s.pendingDeleteText}>{t('delete_btn')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────
// Styles
// ─────────────────────────────────────────

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0a0a0a' },

  // タブ
  tabBar:       { borderBottomWidth: 1, borderBottomColor: '#222' },
  tabList:      { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  tab:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#111', borderWidth: 1, borderColor: '#333' },
  tabActive:    { backgroundColor: '#00ff88', borderColor: '#00ff88' },
  tabText:      { color: '#555', fontSize: 12, fontWeight: 'bold' },
  tabTextActive:{ color: '#000' },

  // フィルタバー
  filterBar:    { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  filterRow:    { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  filterBtn:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#111', borderWidth: 1, borderColor: '#333' },
  filterBtnText:{ color: '#555', fontSize: 12, fontWeight: 'bold' },
  sortBtn:      { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#111', borderWidth: 1, borderColor: '#333' },
  sortBtnText:  { color: '#aaa', fontSize: 11 },

  // 操作バー
  actionBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  countText:    { color: '#555', fontSize: 12 },
  selectBtn:    { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: '#111', borderWidth: 1, borderColor: '#333' },
  selectBtnActive: { backgroundColor: '#00ff88', borderColor: '#00ff88' },
  selectBtnText:{ color: '#aaa', fontSize: 12, fontWeight: 'bold' },

  // 複数選択バー
  multiBar:     { flexDirection: 'row', padding: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  multiBtn:     { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1a1a1a', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  multiBtnDanger: { borderColor: '#ff4444', backgroundColor: '#1a0000' },
  multiBtnText: { color: '#aaa', fontSize: 13, fontWeight: 'bold' },

  // リスト
  listContent:  { padding: 12, paddingBottom: 40 },
  loadingBox:   { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:  { color: '#555', fontSize: 14 },
  emptyBox:     { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyEmoji:   { fontSize: 48, marginBottom: 12 },
  emptyText:    { color: '#555', fontSize: 15 },

  // レコードカード
  recordCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#2a2a2a' },
  recordCardSelected: { borderColor: '#00ff88', backgroundColor: '#001a0d' },
  recordContent:{ flex: 1 },
  recordHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  recordCategory: { color: '#fff', fontSize: 13, fontWeight: 'bold', flex: 1 },
  chainBadge:   { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 6 },
  chainBadgeText: { fontSize: 10, fontWeight: 'bold' },
  recordAmountRow: { flexDirection: 'row', gap: 10, marginBottom: 4, flexWrap: 'wrap' },
  recordAmount: { fontSize: 14, fontWeight: 'bold' },
  recordDate:   { color: '#555', fontSize: 11, marginBottom: 2 },
  recordSub:    { color: '#777', fontSize: 11 },
  recordMemo:   { color: '#555', fontSize: 11, fontStyle: 'italic' },
  recordArrow:  { color: '#555', fontSize: 20, marginLeft: 8 },

  // チェックボックス
  checkbox:     { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#555', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#00ff88', borderColor: '#00ff88' },
  checkboxMark: { color: '#000', fontSize: 13, fontWeight: 'bold' },

  // 仮保存カード
  pendingCard:  { backgroundColor: '#1a1200', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#ff8800' },
  pendingCategory: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginBottom: 6 },
  pendingChainLabel: { color: '#aaa', fontSize: 12, marginTop: 10, marginBottom: 6 },
  pendingChainRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  pendingChainBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, alignItems: 'center' },
  pendingChainBtnText: { fontWeight: 'bold', fontSize: 13 },
  pendingBtns:  { flexDirection: 'row', gap: 8 },
  pendingConfirmBtn: { flex: 2, backgroundColor: '#003322', borderRadius: 8, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#00ff88' },
  pendingConfirmText: { color: '#00ff88', fontWeight: 'bold', fontSize: 13 },
  pendingDeleteBtn: { flex: 1, backgroundColor: '#1a0000', borderRadius: 8, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ff4444' },
  pendingDeleteText: { color: '#ff4444', fontWeight: 'bold', fontSize: 13 },

  // プレースホルダー
  placeholderBox:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderEmoji:{ fontSize: 48, marginBottom: 12 },
  placeholderText: { color: '#555', fontSize: 15 },
});
