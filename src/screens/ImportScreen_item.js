/**
 * ImportScreen_item.js
 * ConfirmItem・ManualCategoryPicker・SpecialFlow・SpecialFlowDone
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Image, TextInput, Alert,
} from 'react-native';
import { s } from './ImportScreen_styles';
import {
  CHAIN_COLORS, CHAIN_TEXT, CATEGORY_LABELS, CATEGORY_GROUPS,
  MB_QUALITY, GEM_COLORS, confLabel,
} from './ImportScreen_constants';
import { useI18n } from '../i18n/i18n';   // ★ 多言語対応


function ConfirmItem({
  item, index, allItems, onChain, onManualGroup, onManualCategory,
  onGemUpgradeResult, onMbLevel, onEnhanceResult, onMbItemsOk, onKeptGemColor,
  onLinkMbCost, onToggleSkip,
}) {
  const { t } = useI18n();
  const r        = item.analyzeResult;
  const category = item.manualCategory ?? r.category;
  const label    = t('cat_' + category);
  const conf     = r.confidence ?? 0;
  const confInfo = confLabel(conf);

  // 重複判定
  const dupType = item.duplicateType;  // 'exact' | 'similar' | null
  const isSkipped = item.skipSave;
  const dupBorderColor = dupType === 'exact' ? '#ff4444'
                       : dupType === 'similar' ? '#ff8844'
                       : '#333';

  // MB紐付け用：同バッチ内のmystery_box_openを取得
  const mbCostItems = (allItems ?? []).filter(
    (i) => (i.analyzeResult.category === 'mystery_box_open') && i.id !== item.id
  );

  // サムネイル拡大モーダル用state
  const [showImage, setShowImage] = useState(false);

  // move_result の日時編集用state
  const moveDate = r.extra?.move_date ?? null;
  const [editingDate, setEditingDate] = useState(false);
  const [inputDate,   setInputDate]   = useState(
    moveDate ? moveDate.split(' ')[0] : ''
  );
  const [inputTime,   setInputTime]   = useState(
    moveDate ? (moveDate.split(' ')[1] ?? '') : ''
  );
  const [savedDate,   setSavedDate]   = useState(moveDate);

  const handleSaveDate = () => {
    if (!inputDate.trim()) {
      Alert.alert(t('alert_input_title'), t('alert_input_msg'));
      return;
    }
    const combined = inputTime.trim()
      ? `${inputDate.trim()} ${inputTime.trim()}`
      : inputDate.trim();
    setSavedDate(combined);
    r.extra.move_date = combined;
    setEditingDate(false);
  };

  return (
    <View style={[s.itemCard, { borderColor: dupBorderColor, opacity: isSkipped ? 0.5 : 1 }]}>

      {/* 重複警告バナー */}
      {dupType === 'exact' && (
        <TouchableOpacity
          style={{ backgroundColor: '#ff444422', borderRadius: 8, padding: 8, marginBottom: 8 }}
          onPress={onToggleSkip}
        >
          <Text style={{ color: '#ff4444', fontSize: 12, fontWeight: 'bold' }}>
            {t('dup_exact', isSkipped)}
          </Text>
        </TouchableOpacity>
      )}
      {dupType === 'similar' && (
        <TouchableOpacity
          style={{ backgroundColor: '#ff884422', borderRadius: 8, padding: 8, marginBottom: 8 }}
          onPress={onToggleSkip}
        >
          <Text style={{ color: '#ff8844', fontSize: 12, fontWeight: 'bold' }}>
            {t('dup_similar', isSkipped)}
          </Text>
        </TouchableOpacity>
      )}

      {/* サムネイル + ヘッダー行 */}
      <View style={s.itemTopRow}>
        {/* サムネイル（タップで拡大） */}
        <TouchableOpacity onPress={() => setShowImage(true)} activeOpacity={0.8}>
          <Image source={{ uri: item.uri }} style={s.thumbnail} resizeMode="cover" />
          <Text style={s.thumbnailHint}>{t('thumb_zoom')}</Text>
        </TouchableOpacity>

        {/* 右側：ヘッダー・金額・日時 */}
        <View style={s.itemRight}>
          <View style={s.itemHeader}>
            <Text style={s.itemIndex}>#{index + 1}</Text>
            <Text style={s.itemCategory}>{label}</Text>
            <View style={[s.confBadge, { borderColor: confInfo.color }]}>
              <Text style={[s.confBadgeText, { color: confInfo.color }]}>{t(confInfo.key)}</Text>
            </View>
          </View>

          {/* 金額 */}
          {(r.gst_amount > 0 || r.gmt_amount > 0) && (
            <View style={s.amountRow}>
              {r.gst_amount > 0 && (
                <Text style={[s.amount, { color: r.type === 'income' ? '#00ff88' : '#ff4444' }]}>
                  {r.type === 'income' ? '+' : '-'}{r.gst_amount.toFixed(2)} GST
                </Text>
              )}
              {r.gmt_amount > 0 && (
                <Text style={[s.amount, { color: r.type === 'income' ? '#00ff88' : '#ff4444' }]}>
                  {r.type === 'income' ? '+' : '-'}{r.gmt_amount.toFixed(2)} GMT
                </Text>
              )}
            </View>
          )}

          {/* move_result の日時表示 */}
          {category === 'move_result' && !editingDate && (
            <TouchableOpacity onPress={() => setEditingDate(true)}>
              <Text style={s.moveDateText}>
                {t('move_date_display', savedDate ?? t('date_unknown'))}
              </Text>
            </TouchableOpacity>
          )}
          {category === 'move_result' && editingDate && (
            <View style={s.dateEditBox}>
              <TextInput
                style={s.dateInput}
                value={inputDate}
                onChangeText={setInputDate}
                placeholder="2026/05/20"
                placeholderTextColor="#444"
              />
              <TextInput
                style={s.dateInput}
                value={inputTime}
                onChangeText={setInputTime}
                placeholder={t('time_placeholder')}
                placeholderTextColor="#444"
              />
              <TouchableOpacity style={s.dateSaveBtn} onPress={handleSaveDate}>
                <Text style={s.dateSaveBtnText}>{t('date_confirm')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* サブタイプ表示（marketplace_buy/listingのみ） */}
      {r.extra?.item_type && (
        <View style={s.subTypeRow}>
          <Text style={s.subTypeText}>
            {r.extra.item_type === 'sneaker' && t('subtype_sneaker', r.extra.shoe_type)}
            {r.extra.item_type === 'gem'     && t('subtype_gem', r.extra.gem_type, r.extra.gem_level)}
            {r.extra.item_type === 'scroll'  && t('subtype_scroll', r.extra.scroll_rarity)}
            {r.extra.item_type === 'badge'   && t('subtype_badge')}
          </Text>
        </View>
      )}

      {/* MB結果の紐付けUI（mb_resultかつ同バッチにmystery_box_openがある場合） */}
      {category === 'mb_result' && mbCostItems.length > 0 && (
        <View style={s.mbLinkBox}>
          <Text style={s.mbLinkTitle}>{t('mb_link_title')}</Text>
          {mbCostItems.map((costItem, ci) => {
            const isLinked = item.linkedCostId === costItem.id;
            return (
              <TouchableOpacity
                key={costItem.id}
                style={[s.mbLinkBtn, isLinked && s.mbLinkBtnActive]}
                onPress={() => onLinkMbCost(isLinked ? null : costItem.id)}
              >
                <Text style={[s.mbLinkBtnText, isLinked && { color: '#00ff88' }]}>
                  {isLinked ? '✅ ' : '○ '}
                  {t('mb_link_btn', ci + 1, costItem.analyzeResult.gst_amount.toFixed(2))}
                </Text>
              </TouchableOpacity>
            );
          })}
          {!item.linkedCostId && (
            <Text style={s.mbLinkHint}>{t('mb_link_hint')}</Text>
          )}
        </View>
      )}

      {/* mb_resultかつコストが同バッチにない場合 */}
      {category === 'mb_result' && mbCostItems.length === 0 && (
        <View style={s.mbLinkBox}>
          <Text style={s.mbLinkHint}>
            {t('mb_link_none')}
          </Text>
        </View>
      )}

      {/* チェーン提案バナー */}
      {item.chainSuggestion && !item.selectedChain && (
        <View style={s.suggestionBanner}>
          <Text style={s.suggestionText}>
            {t('chain_suggest', item.chainSuggestion)}
          </Text>
        </View>
      )}

      {/* ワーニング */}
      {r.warnings?.length > 0 && conf < 0.9 && (
        <View style={s.warningBox}>
          {r.warnings.map((w, i) => (
            <Text key={i} style={s.warningText}>⚠️ {w}</Text>
          ))}
        </View>
      )}

      {/* カテゴリ手動選択（unknownのみ） */}
      {r.category === 'unknown' && (
        <ManualCategoryPicker
          selectedGroup={item.manualGroup}
          selectedCategory={item.manualCategory}
          onGroup={onManualGroup}
          onCategory={onManualCategory}
        />
      )}

      {/* 特殊フロー */}
      {!item.specialDone && (
        <SpecialFlow
          item={item}
          onGemUpgradeResult={onGemUpgradeResult}
          onMbLevel={onMbLevel}
          onEnhanceResult={onEnhanceResult}
          onMbItemsOk={onMbItemsOk}
          onKeptGemColor={onKeptGemColor}
        />
      )}
      {item.specialDone && <SpecialFlowDone item={item} />}

      {/* チェーン選択 */}
      <View style={s.chainRow}>
        <Text style={s.chainLabel}>{t('chain_label')}</Text>
        {['SOL', 'BNB', 'POL'].map((c) => {
          const isActive = item.selectedChain === c;
          return (
            <TouchableOpacity
              key={c}
              style={[s.chainBtn,
                { backgroundColor: isActive ? CHAIN_COLORS[c] : '#111',
                  borderColor: isActive ? CHAIN_COLORS[c] : '#333' }
              ]}
              onPress={() => onChain(c)}
            >
              <Text style={[s.chainBtnText, { color: isActive ? CHAIN_TEXT[c] : '#555' }]}>
                {c}
              </Text>
            </TouchableOpacity>
          );
        })}
        {!item.selectedChain && (
          <Text style={s.chainUnset}>{t('chain_unset')}</Text>
        )}
      </View>

      {/* 画像拡大モーダル */}
      <Modal
        visible={showImage}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImage(false)}
      >
        <TouchableOpacity
          style={s.imageModalOverlay}
          onPress={() => setShowImage(false)}
          activeOpacity={1}
        >
          <Image
            source={{ uri: item.uri }}
            style={s.imageModalFull}
            resizeMode="contain"
          />
          <Text style={s.imageModalHint}>{t('image_close')}</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────
// ManualCategoryPicker - カテゴリ2段階選択
// ─────────────────────────────────────────

function ManualCategoryPicker({ selectedGroup, selectedCategory, onGroup, onCategory }) {
  const { t } = useI18n();
  return (
    <View style={s.manualBox}>
      <Text style={s.manualTitle}>{t('manual_cat_title')}</Text>

      {/* 大分類 */}
      <View style={s.manualGroupRow}>
        {Object.keys(CATEGORY_GROUPS).map((g) => (
          <TouchableOpacity
            key={g}
            style={[s.manualGroupBtn,
              selectedGroup === g && { backgroundColor: '#003322', borderColor: '#00ff88' }
            ]}
            onPress={() => onGroup(g)}
          >
            <Text style={[s.manualGroupText,
              selectedGroup === g && { color: '#00ff88' }
            ]}>{t('group_' + g)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 細分類 */}
      {selectedGroup && (
        <View style={s.manualCatWrap}>
          {CATEGORY_GROUPS[selectedGroup].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[s.manualCatBtn,
                selectedCategory === cat && { backgroundColor: '#003322', borderColor: '#00ff88' }
              ]}
              onPress={() => onCategory(cat)}
            >
              <Text style={[s.manualCatText,
                selectedCategory === cat && { color: '#00ff88' }
              ]}>{t('cat_' + cat)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────
// MbSlotEditor - MB開封結果のジェム色・Lv手動確認
// ─────────────────────────────────────────

const GEM_COLOR_OPTIONS = [
  { key: 'efficiency', emoji: '🟡', tkey: 'gem_color_e' },
  { key: 'luck',       emoji: '🔵', tkey: 'gem_color_l' },
  { key: 'comfort',    emoji: '🔴', tkey: 'gem_color_c' },
  { key: 'resilience', emoji: '🟣', tkey: 'gem_color_r' },
];

const SCROLL_RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

function MbSlotEditor({ item, onMbItemsOk }) {
  const { t } = useI18n();
  const autoItems = item.analyzeResult?.extra?.mb_reward_items ?? [];

  // ジェムだけLvを左から順に自動割り当て（Lv選択UI不要）
  // ミンスクはLvカウントに含めない
  let gemLvCounter = 0;
  const initialSlots = autoItems.map((it) => {
    if (it.item_type === 'scroll') {
      return {
        item_type:     'scroll',
        gem_color:     null,
        gem_level:     null,
        scroll_rarity: null,
        quantity:      it.quantity ?? 1,
      };
    }
    gemLvCounter += 1;
    return {
      item_type:     'gem',
      gem_color:     it.gem_color ?? null,  // 自動判定結果をデフォルトに
      gem_level:     gemLvCounter,           // Lv自動割り当て（変更不可）
      scroll_rarity: null,
      quantity:      it.quantity ?? 1,
    };
  });

  const [slots, setSlots] = React.useState(initialSlots);

  const updateColor = (i, color) => {
    setSlots((prev) => prev.map((s, idx) => idx === i ? { ...s, gem_color: color } : s));
  };
  const updateRarity = (i, rarity) => {
    setSlots((prev) => prev.map((s, idx) => idx === i ? { ...s, scroll_rarity: rarity } : s));
  };

  // 全スロットが確定済みかチェック
  const allConfirmed = slots.every((s) => {
    if (s.item_type === 'scroll') return s.scroll_rarity !== null;
    return s.gem_color !== null;  // Lvは自動なので色だけチェック
  });

  return (
    <View style={s.specialBox}>
      <Text style={s.specialTitle}>{t('mb_slot_title')}</Text>

      {slots.map((slot, i) => (
        <View key={i} style={{ marginBottom: 12, borderTopWidth: 1, borderTopColor: '#2a2a2a', paddingTop: 10 }}>

          {/* ヘッダー：Lv〇 × 個数 or ミンスク × 個数 */}
          <Text style={{ color: '#aaa', fontSize: 13, fontWeight: 'bold', marginBottom: 6 }}>
            {slot.item_type === 'scroll'
              ? t('slot_scroll', slot.quantity)
              : t('slot_gem', slot.gem_level, slot.quantity)}
          </Text>

          {slot.item_type === 'scroll' ? (
            /* ── ミンスクのレアリティ選択 ── */
            <View>
              <Text style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>{t('rarity_label')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {SCROLL_RARITIES.map((r) => {
                  const isActive = slot.scroll_rarity === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={{
                        paddingHorizontal: 10, paddingVertical: 5,
                        borderRadius: 8, borderWidth: 1,
                        backgroundColor: isActive ? '#1a3a2a' : '#111',
                        borderColor: isActive ? '#00ff88' : '#333',
                      }}
                      onPress={() => updateRarity(i, r)}
                    >
                      <Text style={{ color: isActive ? '#00ff88' : '#666', fontSize: 12 }}>{r}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            /* ── ジェムの色選択のみ（Lv選択は不要） ── */
            <View>
              <Text style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>{t('color_label')}</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {GEM_COLOR_OPTIONS.map(({ key, emoji, tkey }) => {
                  const isActive = slot.gem_color === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={{
                        flex: 1, paddingVertical: 8, borderRadius: 8,
                        borderWidth: 1, alignItems: 'center',
                        backgroundColor: isActive ? '#1a3a2a' : '#111',
                        borderColor: isActive ? '#00ff88' : '#333',
                      }}
                      onPress={() => updateColor(i, key)}
                    >
                      <Text style={{ fontSize: 16 }}>{emoji}</Text>
                      <Text style={{ color: isActive ? '#00ff88' : '#555', fontSize: 10, marginTop: 2 }}>{t(tkey)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      ))}

      {/* 確定ボタン */}
      <TouchableOpacity
        style={[s.specialBtn, { borderColor: allConfirmed ? '#00ff88' : '#444', marginTop: 8 }]}
        onPress={() => {
          if (!allConfirmed) return;
          onMbItemsOk(slots);
        }}
        disabled={!allConfirmed}
      >
        <Text style={[s.specialBtnText, { color: allConfirmed ? '#00ff88' : '#444' }]}>
          {allConfirmed ? t('slot_confirm') : t('slot_confirm_wait')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────
// SpecialFlow - カテゴリ別特殊フロー
// ─────────────────────────────────────────

function SpecialFlow({
  item, onGemUpgradeResult, onMbLevel, onEnhanceResult,
  onMbItemsOk, onKeptGemColor,
}) {
  const { t } = useI18n();
  const r = item.analyzeResult;
  const cat = r.category;

  // gem_upgrade_confirm → 結果を聞く
  if (cat === 'gem_upgrade_confirm') {
    return (
      <View style={s.specialBox}>
        <Text style={s.specialTitle}>{t('gem_result_q')}</Text>
        <View style={s.specialRow}>
          <TouchableOpacity
            style={[s.specialBtn, { borderColor: '#00ff88' }]}
            onPress={() => onGemUpgradeResult('success')}
          >
            <Text style={[s.specialBtnText, { color: '#00ff88' }]}>{t('result_success')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.specialBtn, { borderColor: '#ff4444' }]}
            onPress={() => onGemUpgradeResult('fail')}
          >
            <Text style={[s.specialBtnText, { color: '#ff4444' }]}>{t('result_fail')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // move_result + MB取得 → MBレベルを聞く
  if (cat === 'move_result' && r.extra?.mb_obtained) {
    return (
      <View style={s.specialBox}>
        <Text style={s.specialTitle}>{t('mb_level_q')}</Text>
        <View style={s.mbGrid}>
          {Object.entries(MB_QUALITY).map(([lv, name]) => (
            <TouchableOpacity
              key={lv}
              style={[s.mbBtn,
                item.mbLevel === parseInt(lv) && { backgroundColor: '#003322', borderColor: '#00ff88' }
              ]}
              onPress={() => onMbLevel(parseInt(lv))}
            >
              <Text style={s.mbBtnLv}>Lv{lv}</Text>
              <Text style={s.mbBtnName}>{name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // mystery_box_open + ピクセル解析済み → 削除（コスト確認画面にはアイテムなし）
  // mb_result（開封結果画面）のアイテムはピクセル解析で別途処理

  // mb_result → ジェム色・Lv手動確認UI（MbSlotEditor で管理）
  if (cat === 'mb_result') {
    return <MbSlotEditor item={item} onMbItemsOk={onMbItemsOk} />;
  }

  // shoe_enhance → 結果を聞く
  if (cat === 'shoe_enhance' && r.extra?.enhance_result === 'normal') {
    return (
      <View style={s.specialBox}>
        <Text style={s.specialTitle}>{t('enhance_q')}</Text>
        <View style={s.specialCol}>
          {[
            { key: 'normal',    tkey: 'enhance_normal',  color: '#00ff88' },
            { key: 'double_up', tkey: 'enhance_double',  color: '#ffaa00' },
            { key: 'rainbow',   tkey: 'enhance_rainbow', color: '#ff88ff' },
          ].map(({ key, tkey, color }) => (
            <TouchableOpacity
              key={key}
              style={[s.specialBtn, { borderColor: color }]}
              onPress={() => onEnhanceResult(key)}
            >
              <Text style={[s.specialBtnText, { color }]}>{t(tkey)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // gem_upgrade_fail + VIPジェム保持 → ジェム色確認
  if (cat === 'gem_upgrade_fail' && r.extra?.vip_kept_gem) {
    const autoColor = item.keptGemColor;
    return (
      <View style={s.specialBox}>
        <Text style={s.specialTitle}>
          {t('kept_gem_q', autoColor ? `${GEM_COLORS[autoColor]?.emoji} ${autoColor}` : null)}
        </Text>
        <View style={s.specialRow}>
          {Object.entries(GEM_COLORS).map(([key, val]) => (
            <TouchableOpacity
              key={key}
              style={[s.specialBtn, { borderColor: '#555' },
                item.keptGemColor === key && { borderColor: '#00ff88' }
              ]}
              onPress={() => onKeptGemColor(key)}
            >
              <Text style={s.specialBtnText}>{val.emoji} {val.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  return null;
}

// 特殊フロー完了後の表示
function SpecialFlowDone({ item }) {
  const { t, lang } = useI18n();
  const r = item.analyzeResult;
  const cat = r.category;

  if (cat === 'gem_upgrade_confirm') {
    return (
      <View style={s.doneBadge}>
        <Text style={s.doneText}>
          {item.gemUpgradeResult === 'success' ? t('done_gem_success') : t('done_gem_fail')}
        </Text>
      </View>
    );
  }
  if (cat === 'move_result' && r.extra?.mb_obtained && item.mbLevel) {
    return (
      <View style={s.doneBadge}>
        <Text style={s.doneText}>{t('done_mb_level', item.mbLevel, MB_QUALITY[item.mbLevel])}</Text>
      </View>
    );
  }
  if (cat === 'mb_result' && item.mbRewardItems) {
    const scrollLabel = lang === 'ja' ? 'ミンスク' : 'Scroll';
    const summary = item.mbRewardItems.map((it) => {
      if (it.item_type === 'scroll') {
        return `${scrollLabel}(${it.scroll_rarity ?? '?'}) x${it.quantity}`;
      }
      const colorEmoji = { efficiency: '🟡', luck: '🔵', comfort: '🔴', resilience: '🟣' };
      return `${colorEmoji[it.gem_color] ?? '?'} Lv${it.gem_level} x${it.quantity}`;
    }).join(' / ');
    return (
      <View style={s.doneBadge}>
        <Text style={s.doneText}>{t('done_mb_result', summary)}</Text>
      </View>
    );
  }

  if (cat === 'shoe_enhance' && item.enhanceResult) {
    const labels = {
      normal:    t('enhance_label_normal'),
      double_up: t('enhance_label_double'),
      rainbow:   t('enhance_label_rainbow'),
    };
    return (
      <View style={s.doneBadge}>
        <Text style={s.doneText}>{t('done_enhance', labels[item.enhanceResult] ?? item.enhanceResult)}</Text>
      </View>
    );
  }
  if (cat === 'gem_upgrade_fail' && item.keptGemColor) {
    return (
      <View style={s.doneBadge}>
        <Text style={s.doneText}>
          {t('done_kept_gem', `${GEM_COLORS[item.keptGemColor]?.emoji} ${item.keptGemColor} Gem`)}
        </Text>
      </View>
    );
  }
  return null;
}

// ─────────────────────────────────────────
// phase 4: DONE
// ─────────────────────────────────────────

function DonePhase({ savedCount, pendingCount, onBack }) {
  const { t } = useI18n();
  return (
    <View style={s.centerBox}>
      <Text style={s.phaseEmoji}>🎉</Text>
      <Text style={s.phaseTitle}>{t('done_title')}</Text>
      <View style={s.doneStats}>
        <Text style={s.doneStatText}>{t('done_saved', savedCount)}</Text>
        {pendingCount > 0 && (
          <Text style={[s.doneStatText, { color: '#ffaa00' }]}>
            {t('done_pending', pendingCount)}
          </Text>
        )}
      </View>
      {pendingCount > 0 && (
        <Text style={s.doneHint}>
          {t('done_pending_hint')}
        </Text>
      )}
      <TouchableOpacity style={s.primaryBtn} onPress={onBack}>
        <Text style={s.primaryBtnText}>{t('done_home')}</Text>
      </TouchableOpacity>
    </View>
  );
}

export { ConfirmItem, ManualCategoryPicker, SpecialFlow, SpecialFlowDone, DonePhase };
