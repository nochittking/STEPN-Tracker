/**
 * StorageService.js  v3.1.0
 *
 * STEPN 収支管理ツール - ストレージサービス
 *
 * 設計方針：
 *   - gst_amount / gmt_amount はすべて正数で保存、type で収支を判断
 *   - カテゴリ固有データは extra フィールドにまとめる
 *   - 修正履歴は直近 1000 件を上限として保持
 *   - データは月別（records_YYYY_MM）に分割して保存
 *
 * AsyncStorage キー構造：
 *   "records_index"    → ["2026_05", "2026_04", ...]  月ごとの目次
 *   "records_2026_05"  → Record[]   月別レコード配列
 *   "settings"         → Settings   アプリ設定（初期残高含む）
 *   "modifications"    → Modification[]  修正履歴（最大1000件）
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import {
  getRecords, calcSummary, getDaysWithData,
  calcSpendingBalance, verifySpendingBalance,
  getSettings, updateSettings, setInitialBalance,
  getIndex, getRecordCounts,
} from './StorageService_query';

// ─────────────────────────────────────────
// 定数
// ─────────────────────────────────────────

const KEYS = {
  INDEX:         'records_index',
  SETTINGS:      'settings',
  MODIFICATIONS: 'modifications',
  records: (ym) => `records_${ym}`,  // 例: records_2026_05
};

const MAX_MODIFICATIONS = 1000;

/** カテゴリ → type のマッピング */
const CATEGORY_TYPE = {
  // 収入系
  move_result:              'income',
  achievement:              'income',
  leaderboard:              'income',
  marketplace_sell:         'income',
  spending_deposit:         'income',
  // 支出系
  repair_hp:                'expense',
  repair_durability:        'expense',
  gem_upgrade_success:      'expense',
  gem_upgrade_fail:         'expense',
  gem_upgrade_confirm:      'expense',   // CONFIRM画面のみ取込（結果pending）
  shoe_mint_cost:           'expense',
  shoe_mint_result:         'expense',
  marketplace_buy:          'expense',
  level_up:                 'expense',
  socket_unlock:            'expense',
  shoe_enhance:             'expense',
  mystery_box_open:         'expense',   // MB開封コスト（支出）
  vip_membership:           'expense',
  spending_withdraw:        'expense',
  success_rate_increment:   'expense',
  point_redistribution:     'expense',   // 旧: attribute_up
  // MB開封結果（収入系）
  mb_result:                'income',    // MB開封結果・ジェム等獲得
  // 情報系
  home:                     'info',
  profile_settings:         'info',      // 優先度低・保留
  // 売却中
  marketplace_listing:      'listing',
};

const CHAINS = ['SOL', 'BNB', 'POL'];

// ─────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────

/** ISO 8601 の timestamp から "YYYY_MM" を返す */
const toYearMonth = (timestamp) => {
  const d = new Date(timestamp);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}_${m}`;
};

/** "YYYY_MM" → Date（その月の1日 00:00 UTC） */
const ymToDate = (ym) => {
  const [y, m] = ym.split('_');
  return new Date(Date.UTC(Number(y), Number(m) - 1, 1));
};

/** uuid v4 の簡易生成（React Native 環境向け） */
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * 収支計算用の符号付き金額を返す
 *   income  → +amount
 *   expense → -amount
 *   info / listing → 0
 */
const signedAmount = (amount, type) => {
  if (amount == null) return 0;
  if (type === 'income')  return  Math.abs(amount);
  if (type === 'expense') return -Math.abs(amount);
  return 0;
};

// ─────────────────────────────────────────
// グループA：初期化
// ─────────────────────────────────────────

/**
 * アプリ初回起動時に呼ぶ
 * settings が未設定の場合のみデフォルト値を書き込む
 */
const initialize = async () => {
  try {
    const existing = await AsyncStorage.getItem(KEYS.SETTINGS);
    if (existing !== null) return;

    const defaultSettings = {
      version: '3.0.0',
      chains: CHAINS,
      initial_balances: {
        SOL: { gst: 0, gmt: 0 },
        BNB: { gst: 0, gmt: 0 },
        POL: { gst: 0, gmt: 0 },
      },
      created_at: new Date().toISOString(),
    };

    await AsyncStorage.multiSet([
      [KEYS.SETTINGS,      JSON.stringify(defaultSettings)],
      [KEYS.INDEX,         JSON.stringify([])],
      [KEYS.MODIFICATIONS, JSON.stringify([])],
    ]);
  } catch (e) {
    console.error('[StorageService] initialize error:', e);
    throw e;
  }
};

// ─────────────────────────────────────────
// グループC：インデックス管理（内部用）
// ─────────────────────────────────────────

/** インデックス（月の目次）を取得 */
const _getIndex = async () => {
  const raw = await AsyncStorage.getItem(KEYS.INDEX);
  return raw ? JSON.parse(raw) : [];
};

/** インデックスに月を追加（重複なし・降順ソート） */
const _addToIndex = async (ym) => {
  const index = await _getIndex();
  if (!index.includes(ym)) {
    index.push(ym);
    // 降順（新しい月が先頭）
    index.sort((a, b) => (a > b ? -1 : 1));
    await AsyncStorage.setItem(KEYS.INDEX, JSON.stringify(index));
  }
};

/** 月別レコード配列を取得 */
const _getMonthRecords = async (ym) => {
  const raw = await AsyncStorage.getItem(KEYS.records(ym));
  return raw ? JSON.parse(raw) : [];
};

/** 月別レコード配列を保存 */
const _setMonthRecords = async (ym, records) => {
  await AsyncStorage.setItem(KEYS.records(ym), JSON.stringify(records));
};

// ─────────────────────────────────────────
// グループB：レコードの CRUD
// ─────────────────────────────────────────

/**
 * レコードを1件保存する
 *
 * @param {object} data  VisionAnalyzer が返すパース済みデータ
 *   必須フィールド:
 *     category   string   22種のカテゴリ
 *     chain      string   "SOL" | "BNB" | "POL"
 *   任意フィールド:
 *     timestamp    string   ISO 8601（省略時は現在時刻）
 *     gst_amount   number   正数で渡す（収支の符号は type が管理）
 *     gmt_amount   number
 *     native_amount number  SOL/BNB/POL のネイティブトークン量
 *     fiat_amount  number   法定通貨（vip_membership のみ）
 *     fiat_currency string  "JPY" | "USD" 等
 *     confidence   number   OCR 信頼度 0〜1
 *     memo         string
 *     extra        object   カテゴリ固有データ
 *
 * @returns {Record}  保存したレコード
 */
const saveRecord = async (data) => {
  try {
    const now = new Date().toISOString();
    const timestamp = data.timestamp || now;
    const type = CATEGORY_TYPE[data.category] || 'info';

    const record = {
      id:              generateId(),
      timestamp,
      chain:           data.chain,
      category:        data.category,
      type,

      // トークン収支（常に正数で保存）
      gst_amount:      data.gst_amount    ?? null,
      gmt_amount:      data.gmt_amount    ?? null,
      native_amount:   data.native_amount ?? null,  // SOL/BNB/POL 手数料
      fiat_amount:     data.fiat_amount   ?? null,  // 法定通貨（VIPのみ）
      fiat_currency:   data.fiat_currency ?? null,

      // カテゴリ固有データ
      extra:           data.extra         ?? {},

      // メタ情報
      confidence:      data.confidence    ?? null,
      memo:            data.memo          ?? '',
      image_hash:      data.image_hash    ?? null,
      thumbnail_uri:   data.thumbnail_uri ?? null,
      created_at:      now,
      modified_at:     null,
    };

    const ym = toYearMonth(timestamp);
    const records = await _getMonthRecords(ym);
    records.push(record);
    await _setMonthRecords(ym, records);
    await _addToIndex(ym);

    return record;
  } catch (e) {
    console.error('[StorageService] saveRecord error:', e);
    throw e;
  }
};

/**
 * 複数レコードをまとめて保存する（取込確認画面で使用）
 *
 * @param {object[]} dataList
 * @returns {Record[]}
 */
const saveRecords = async (dataList) => {
  // 月ごとにグループ化してまとめて書き込む（AsyncStorage の read/write 回数を最小化）
  const groups = {};
  const now = new Date().toISOString();

  const savedRecords = dataList.map((data) => {
    const timestamp = data.timestamp || now;
    const type = CATEGORY_TYPE[data.category] || 'info';
    const record = {
      id:            generateId(),
      timestamp,
      chain:         data.chain,
      category:      data.category,
      type,
      gst_amount:    data.gst_amount    ?? null,
      gmt_amount:    data.gmt_amount    ?? null,
      native_amount: data.native_amount ?? null,
      fiat_amount:   data.fiat_amount   ?? null,
      fiat_currency: data.fiat_currency ?? null,
      extra:         data.extra         ?? {},
      confidence:    data.confidence    ?? null,
      memo:          data.memo          ?? '',
      image_hash:    data.image_hash    ?? null,
      thumbnail_uri: data.thumbnail_uri ?? null,
      created_at:    now,
      modified_at:   null,
    };
    const ym = toYearMonth(timestamp);
    if (!groups[ym]) groups[ym] = [];
    groups[ym].push(record);
    return record;
  });

  try {
    for (const [ym, newRecords] of Object.entries(groups)) {
      const existing = await _getMonthRecords(ym);
      await _setMonthRecords(ym, [...existing, ...newRecords]);
      await _addToIndex(ym);
    }
    return savedRecords;
  } catch (e) {
    console.error('[StorageService] saveRecords error:', e);
    throw e;
  }
};

/**
 * レコードを1件取得する
 *
 * @param {string} recordId
 * @param {string} ym  "YYYY_MM"（わかっている場合は渡すと高速）
 * @returns {Record|null}
 */
const getRecord = async (recordId, ym = null) => {
  try {
    if (ym) {
      const records = await _getMonthRecords(ym);
      return records.find((r) => r.id === recordId) || null;
    }
    // ym が不明の場合は全月を検索（遅いので基本は ym を渡す）
    const index = await _getIndex();
    for (const month of index) {
      const records = await _getMonthRecords(month);
      const found = records.find((r) => r.id === recordId);
      if (found) return found;
    }
    return null;
  } catch (e) {
    console.error('[StorageService] getRecord error:', e);
    throw e;
  }
};

/**
 * レコードを手動修正する
 * 変更前後を修正履歴に自動記録する
 *
 * @param {string}   recordId
 * @param {string}   ym        "YYYY_MM"
 * @param {object}   changes   変更したいフィールドのみ渡す
 * @returns {Record}  更新後のレコード
 */
const updateRecord = async (recordId, ym, changes) => {
  try {
    const records = await _getMonthRecords(ym);
    const idx = records.findIndex((r) => r.id === recordId);
    if (idx === -1) throw new Error(`Record not found: ${recordId}`);

    const before = records[idx];
    const now = new Date().toISOString();

    // 変更差分を記録
    const fieldChanges = Object.entries(changes)
      .filter(([key]) => key !== 'modified_at')
      .map(([field, after]) => ({
        field,
        before: before[field] ?? null,
        after,
      }));

    // type は category の変更に連動して自動更新
    if (changes.category) {
      changes.type = CATEGORY_TYPE[changes.category] || 'info';
    }

    records[idx] = { ...before, ...changes, modified_at: now };
    await _setMonthRecords(ym, records);

    // 修正履歴を追記
    await _appendModification({
      record_id:    recordId,
      modified_at:  now,
      field_changes: fieldChanges,
    });

    return records[idx];
  } catch (e) {
    console.error('[StorageService] updateRecord error:', e);
    throw e;
  }
};

/**
 * レコードを削除する
 *
 * @param {string[]} recordIds  削除対象のIDリスト
 * @param {string}   ym         "YYYY_MM"
 */
const deleteRecords = async (recordIds, ym) => {
  try {
    const idSet = new Set(recordIds);
    const records = await _getMonthRecords(ym);

    // 削除対象のレコードからハッシュとサムネイルを回収
    const deletedRecords = records.filter((r) => idSet.has(r.id));

    // 画像ハッシュを削除
    try {
      const raw = await AsyncStorage.getItem(IMAGE_HASHES_KEY);
      if (raw) {
        const hashes = JSON.parse(raw);
        let changed = false;
        for (const r of deletedRecords) {
          if (r.image_hash && hashes[r.image_hash]) {
            delete hashes[r.image_hash];
            changed = true;
          }
        }
        if (changed) {
          await AsyncStorage.setItem(IMAGE_HASHES_KEY, JSON.stringify(hashes));
        }
      }
    } catch (hashErr) {
      console.warn('[StorageService] hash cleanup error (skip):', hashErr.message);
    }

    // サムネイルファイルを削除
    for (const r of deletedRecords) {
      if (r.thumbnail_uri) {
        try {
          const fullPath = FileSystem.documentDirectory + r.thumbnail_uri;
          await FileSystem.deleteAsync(fullPath, { idempotent: true });
        } catch (_) { /* ファイルなくてもOK */ }
      }
    }

    const remaining = records.filter((r) => !idSet.has(r.id));
    await _setMonthRecords(ym, remaining);
  } catch (e) {
    console.error('[StorageService] deleteRecords error:', e);
    throw e;
  }
};

/**
 * marketplace_listing → marketplace_sell に昇格させる
 * 手動 SOLD 確定操作から呼ぶ
 *
 * @param {string} recordId
 * @param {string} ym
 * @param {object} sellData  { gmt_amount, timestamp?, memo? } など
 * @returns {Record}
 */
const promoteListing = async (recordId, ym, sellData = {}) => {
  const changes = {
    category: 'marketplace_sell',
    type: 'income',
    ...sellData,
  };
  return updateRecord(recordId, ym, changes);
};

/**
 * move_result の mb_level を mystery_box_open 取込時に上書き更新する
 *
 * @param {string} moveRecordId  move_result レコードの ID
 * @param {string} ym            \"YYYY_MM\"
 * @param {number} mbLevel       mystery_box_open から取得した正確な mb_level
 * @returns {Record}
 */
const updateMbLevel = async (moveRecordId, ym, mbLevel) => {
  const MB_LEVEL_TO_QUALITY = {
    1: 'Damaged',    2: 'Refurbished', 3: 'Common',
    4: 'Uncommon',   5: 'Rare',        6: 'Epic',
    7: 'Legendary',  8: 'Enchanted',   9: 'Master',
    10: 'Satoshi',
  };
  const record = await getRecord(moveRecordId, ym);
  if (!record) throw new Error(`move_result not found: ${moveRecordId}`);

  const newExtra = {
    ...record.extra,
    mb_level:   mbLevel,
    mb_quality: MB_LEVEL_TO_QUALITY[mbLevel] ?? null,
  };
  return updateRecord(moveRecordId, ym, { extra: newExtra });
};

// ─────────────────────────────────────────
// MB結果画面（mb_result）とコスト（mystery_box_open）の紐付け
// ─────────────────────────────────────────

/**
 * mb_result レコードと mystery_box_open レコードを紐付ける
 *
 * @param {string} mbResultId  - mb_resultのレコードID
 * @param {string} mbCostId    - mystery_box_openのレコードID
 * @param {string} ymResult    - mb_resultの月キー（例: "2026_05"）
 * @param {string} ymCost      - mystery_box_openの月キー
 */
const linkMbResult = async (mbResultId, mbCostId, ymResult, ymCost) => {
  const index = await getIndex();

  // mb_result 側に linked_cost_id を追加
  if (index.includes(ymResult)) {
    const resultRecord = await getRecord(mbResultId, ymResult);
    if (resultRecord) {
      await updateRecord(mbResultId, ymResult, {
        extra: { ...resultRecord.extra, linked_cost_id: mbCostId },
      });
    }
  }

  // mystery_box_open 側に linked_result_id を追加
  if (index.includes(ymCost)) {
    const costRecord = await getRecord(mbCostId, ymCost);
    if (costRecord) {
      await updateRecord(mbCostId, ymCost, {
        extra: { ...costRecord.extra, linked_result_id: mbResultId },
      });
    }
  }
};

// ─────────────────────────────────────────
// グループH：仮保存（チェーン未確定レコード）
// ─────────────────────────────────────────

const PENDING_KEY = 'pending_records';

/**
 * チェーンが未確定のレコードを仮保存する
 * 取込確認一覧でチェーンを選択するまで数値には反映されない
 *
 * @param {object} data  saveRecord と同じ形式（chain: null でOK）
 * @returns {PendingRecord}
 */
const savePendingRecord = async (data) => {
  try {
    const now = new Date().toISOString();
    const pending = {
      id:          generateId(),
      created_at:  now,
      chain:       null,           // 未確定
      status:      'pending',      // 'pending' | 'confirmed'
      category:    data.category,
      type:        CATEGORY_TYPE[data.category] || 'info',
      gst_amount:  data.gst_amount  ?? null,
      gmt_amount:  data.gmt_amount  ?? null,
      extra:       data.extra       ?? {},
      confidence:  data.confidence  ?? null,
      warnings:    data.warnings    ?? [],
      memo:        data.memo        ?? '',
    };

    const raw = await AsyncStorage.getItem(PENDING_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.push(pending);
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(list));
    return pending;
  } catch (e) {
    console.error('[StorageService] savePendingRecord error:', e);
    throw e;
  }
};

/**
 * 仮保存レコード一覧を取得する
 * 取込確認一覧画面で表示するために使う
 *
 * @returns {PendingRecord[]}
 */
const getPendingRecords = async () => {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[StorageService] getPendingRecords error:', e);
    throw e;
  }
};

/**
 * 仮保存レコードにチェーンを設定して正式保存する
 * 取込確認一覧でチェーンボタンを押したときに呼ぶ
 *
 * @param {string} pendingId  仮保存レコードの ID
 * @param {string} chain      確定チェーン 'SOL' | 'BNB' | 'POL'
 * @returns {Record}          正式保存されたレコード
 */
const confirmPending = async (pendingId, chain) => {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const idx  = list.findIndex((p) => p.id === pendingId);
    if (idx === -1) throw new Error(`PendingRecord not found: ${pendingId}`);

    const pending = list[idx];

    // 正式保存
    const saved = await saveRecord({
      category:     pending.category,
      chain,
      gst_amount:   pending.gst_amount,
      gmt_amount:   pending.gmt_amount,
      extra:        pending.extra,
      confidence:   pending.confidence,
      memo:         pending.memo,
    });

    // 仮保存リストから削除
    list.splice(idx, 1);
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(list));

    return saved;
  } catch (e) {
    console.error('[StorageService] confirmPending error:', e);
    throw e;
  }
};

/**
 * 仮保存レコードを削除する（取込キャンセル時）
 *
 * @param {string} pendingId
 */
const deletePending = async (pendingId) => {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((p) => p.id !== pendingId);
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('[StorageService] deletePending error:', e);
    throw e;
  }
};

/**
 * 仮保存レコードを全件削除する（一括キャンセル）
 */
const clearAllPending = async () => {
  try {
    await AsyncStorage.removeItem(PENDING_KEY);
  } catch (e) {
    console.error('[StorageService] clearAllPending error:', e);
    throw e;
  }
};
// ─────────────────────────────────────────
// グループE：修正履歴
// ─────────────────────────────────────────

/** 修正履歴を全件取得 */
const getModifications = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.MODIFICATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[StorageService] getModifications error:', e);
    throw e;
  }
};

/**
 * 特定レコードの修正履歴を取得
 *
 * @param {string} recordId
 * @returns {Modification[]}
 */
const getModificationsByRecord = async (recordId) => {
  const all = await getModifications();
  return all.filter((m) => m.record_id === recordId);
};

/**
 * 修正履歴を追記（内部用）
 * 上限 MAX_MODIFICATIONS 件を超えたら古い順に削除
 */
const _appendModification = async (modification) => {
  try {
    const all = await getModifications();
    const entry = {
      id: generateId(),
      ...modification,
    };
    all.push(entry);

    // 上限超過分を古い順（先頭）から削除
    const trimmed = all.length > MAX_MODIFICATIONS
      ? all.slice(all.length - MAX_MODIFICATIONS)
      : all;

    await AsyncStorage.setItem(KEYS.MODIFICATIONS, JSON.stringify(trimmed));
    return entry;
  } catch (e) {
    console.error('[StorageService] _appendModification error:', e);
    throw e;
  }
};

// ─────────────────────────────────────────
// グループG：重複検出
// ─────────────────────────────────────────

const IMAGE_HASHES_KEY = 'image_hashes';

/** 画像ハッシュが既に保存済みかチェック */
const checkImageHash = async (hash) => {
  try {
    const raw = await AsyncStorage.getItem(IMAGE_HASHES_KEY);
    const hashes = raw ? JSON.parse(raw) : {};
    return !!hashes[hash];
  } catch (e) {
    console.error('[StorageService] checkImageHash error:', e);
    return false;
  }
};

/** 画像ハッシュを保存 */
const saveImageHash = async (hash) => {
  try {
    const raw = await AsyncStorage.getItem(IMAGE_HASHES_KEY);
    const hashes = raw ? JSON.parse(raw) : {};
    hashes[hash] = new Date().toISOString();
    await AsyncStorage.setItem(IMAGE_HASHES_KEY, JSON.stringify(hashes));
  } catch (e) {
    console.error('[StorageService] saveImageHash error:', e);
  }
};

/**
 * 内容の重複チェック
 * 同カテゴリ・同チェーン・同GST/GMT金額のレコードが
 * 直近3時間以内にあれば重複の可能性あり（毎日同条件ムーブの誤検出防止のため短縮）
 */
const checkContentDuplicate = async ({ category, chain, gst_amount, gmt_amount }) => {
  try {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const records = await getRecords({ from: dayAgo, to: now });

    for (const r of records) {
      if (r.category === category
          && r.chain === chain
          && Math.abs((r.gst_amount ?? 0) - (gst_amount ?? 0)) < 0.01
          && Math.abs((r.gmt_amount ?? 0) - (gmt_amount ?? 0)) < 0.01) {
        return { found: true, record: r };
      }
    }
    return { found: false, record: null };
  } catch (e) {
    console.error('[StorageService] checkContentDuplicate error:', e);
    return { found: false, record: null };
  }
};

// ─────────────────────────────────────────
// エクスポート
// ─────────────────────────────────────────

export const StorageService = {
  // 初期化
  initialize,

  // レコード CRUD
  saveRecord,
  saveRecords,
  getRecord,
  getRecords,
  updateRecord,
  deleteRecords,
  promoteListing,
  updateMbLevel,        // move_result の mb_level を mystery_box_open で上書き
  linkMbResult,         // mb_result と mystery_box_open を紐付け

  // 仮保存（チェーン未確定）
  savePendingRecord,
  getPendingRecords,
  confirmPending,
  deletePending,
  clearAllPending,

  // 集計
  calcSummary,
  getDaysWithData,
  getRecordCounts,

  // 修正履歴
  getModifications,
  getModificationsByRecord,

  // Spending 残高照合
  calcSpendingBalance,
  verifySpendingBalance,

  // 設定
  getSettings,
  updateSettings,
  setInitialBalance,

  // インデックス（管理用）
  getIndex,

  // 重複検出
  checkImageHash,
  saveImageHash,
  checkContentDuplicate,

  // 定数（他モジュールから参照用）
  CATEGORY_TYPE,
  CHAINS,
};
