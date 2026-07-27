/**
 * StorageService_query.js
 *
 * STEPN 収支管理ツール - 集計・設定・照合
 * StorageService.js から分割（トークン節約のため）
 *
 * 含まれる内容：
 *   - getRecords     レコード取得・フィルタリング
 *   - calcSummary    収支集計
 *   - getDaysWithData カレンダー用データ有無
 *   - calcSpendingBalance / verifySpendingBalance  Spending残高照合
 *   - getSettings / updateSettings / setInitialBalance  設定管理
 *   - getRecordCounts  件数サマリー
 *
 * ※ このファイルは StorageService.js に import されて StorageService に統合される
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────
// 共有ユーティリティ（StorageService.js と同値・import循環を避けるため複製）
// ─────────────────────────────────────────

const KEYS = {
  INDEX:         'records_index',
  SETTINGS:      'settings',
  MODIFICATIONS: 'modifications',
  records: (ym) => `records_${ym}`,
};

const toYearMonth = (timestamp) => {
  const d = new Date(timestamp);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}_${m}`;
};

const ymToDate = (ym) => {
  const [y, m] = ym.split('_');
  return new Date(Date.UTC(Number(y), Number(m) - 1, 1));
};

const signedAmount = (amount, type) => {
  if (amount == null) return 0;
  if (type === 'income')  return  Math.abs(amount);
  if (type === 'expense') return -Math.abs(amount);
  return 0;
};

const _getIndex = async () => {
  const raw = await AsyncStorage.getItem(KEYS.INDEX);
  return raw ? JSON.parse(raw) : [];
};

const _getMonthRecords = async (ym) => {
  const raw = await AsyncStorage.getItem(KEYS.records(ym));
  return raw ? JSON.parse(raw) : [];
};

/** シンプルなオブジェクトのディープマージ */
const deepMerge = (target, source) => {
  const result = { ...target };
  for (const [k, v] of Object.entries(source)) {
    if (v !== null && typeof v === 'object' && !Array.isArray(v)
        && typeof result[k] === 'object' && result[k] !== null) {
      result[k] = deepMerge(result[k], v);
    } else {
      result[k] = v;
    }
  }
  return result;
};

// ─────────────────────────────────────────
// グループD：集計・フィルタリング
// ─────────────────────────────────────────

/**
 * 期間・チェーン・カテゴリでフィルタしてレコードを返す
 *
 * @param {object} options
 *   from       Date     期間開始（UTC）
 *   to         Date     期間終了（UTC）
 *   chain      string   "SOL" | "BNB" | "POL"（省略で全チェーン）
 *   types      string[] ["income", "expense", "info", "listing"]
 *   categories string[] カテゴリ名の配列
 *   sort       string   "asc" | "desc"（timestamp ソート、デフォルト desc）
 * @returns {Record[]}
 */
const getRecords = async (options = {}) => {
  try {
    const {
      from,
      to,
      chain,
      types,
      categories,
      sort = 'desc',
    } = options;

    const index = await _getIndex();

    // 対象月を絞り込む（全月ループを避ける）
    const targetMonths = index.filter((ym) => {
      if (!from && !to) return true;
      const monthStart = ymToDate(ym);
      const monthEnd   = new Date(monthStart);
      monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
      if (from && monthEnd   <= from) return false;
      if (to   && monthStart >= to)   return false;
      return true;
    });

    let results = [];
    for (const ym of targetMonths) {
      const records = await _getMonthRecords(ym);
      results.push(...records);
    }

    // フィルタリング
    results = results.filter((r) => {
      const ts = new Date(r.timestamp);
      if (from && ts < from) return false;
      if (to   && ts > to)   return false;
      if (chain      && r.chain    !== chain)            return false;
      if (types      && !types.includes(r.type))         return false;
      if (categories && !categories.includes(r.category)) return false;
      return true;
    });

    // ソート
    results.sort((a, b) => {
      const diff = new Date(a.timestamp) - new Date(b.timestamp);
      return sort === 'asc' ? diff : -diff;
    });

    return results;
  } catch (e) {
    console.error('[StorageService] getRecords error:', e);
    throw e;
  }
};

/**
 * 指定期間・チェーンの収支を集計する
 *
 * @param {object} options  getRecords と同じ（types / categories は無視）
 * @returns {object}
 *   {
 *     chain: "BNB",
 *     period: { from, to },
 *     gst:  { income: 100.0, expense: 50.0, net: 50.0 },
 *     gmt:  { income: 10.0,  expense: 5.0,  net: 5.0  },
 *     fiat: { expense: 1600, currency: "JPY" },    // VIP のみ
 *     record_count: 42,
 *   }
 */
const calcSummary = async (options = {}) => {
  try {
    const records = await getRecords(options);

    const gst  = { income: 0, expense: 0, net: 0 };
    const gmt  = { income: 0, expense: 0, net: 0 };
    const fiat = { expense: 0, currency: null };

    for (const r of records) {
      if (r.type === 'info' || r.type === 'listing') continue;

      // GST
      if (r.gst_amount != null) {
        if (r.type === 'income')  gst.income  += r.gst_amount;
        if (r.type === 'expense') gst.expense += r.gst_amount;
      }
      // GMT
      if (r.gmt_amount != null) {
        if (r.type === 'income')  gmt.income  += r.gmt_amount;
        if (r.type === 'expense') gmt.expense += r.gmt_amount;
      }
      // 法定通貨（VIP）
      if (r.fiat_amount != null && r.type === 'expense') {
        fiat.expense  += r.fiat_amount;
        fiat.currency  = r.fiat_currency;
      }
    }

    // 小数点誤差対策で小数第2位に丸める
    const round2 = (v) => Math.round(v * 100) / 100;
    gst.net = round2(gst.income - gst.expense);
    gmt.net = round2(gmt.income - gmt.expense);
    gst.income  = round2(gst.income);
    gst.expense = round2(gst.expense);
    gmt.income  = round2(gmt.income);
    gmt.expense = round2(gmt.expense);

    return {
      chain:  options.chain || 'ALL',
      period: { from: options.from, to: options.to },
      gst,
      gmt,
      fiat,
      record_count: records.filter(
        (r) => r.type !== 'info' && r.type !== 'listing'
      ).length,
    };
  } catch (e) {
    console.error('[StorageService] calcSummary error:', e);
    throw e;
  }
};

/**
 * データが存在する日付の Set を返す（カレンダー表示用）
 *
 * @param {string} ym     "YYYY_MM"
 * @param {string} chain  省略可
 * @returns {Set<string>}  "YYYY-MM-DD" の Set
 */
const getDaysWithData = async (ym, chain) => {
  try {
    const records = await _getMonthRecords(ym);
    const days = new Set();
    for (const r of records) {
      if (chain && r.chain !== chain) continue;
      const day = r.timestamp.slice(0, 10);  // "YYYY-MM-DD"
      days.add(day);
    }
    return days;
  } catch (e) {
    console.error('[StorageService] getDaysWithData error:', e);
    throw e;
  }
};

// ─────────────────────────────────────────
// グループF：Spending残高照合
// ─────────────────────────────────────────

// ─────────────────────────────────────────
// グループF：Spending 残高照合
// ─────────────────────────────────────────

/**
 * チェーン別の Spending 計算残高を求める
 *
 * 計算式：
 *   計算残高 = 初期残高 + 累計収入 - 累計支出
 *
 * @param {string} chain  "SOL" | "BNB" | "POL"
 * @returns {object}
 *   {
 *     chain: "BNB",
 *     gst: { initial: 0, income: 100, expense: 50, calculated: 50 },
 *     gmt: { initial: 0, income: 10,  expense: 5,  calculated: 5  },
 *   }
 */
const calcSpendingBalance = async (chain) => {
  try {
    const settings = await getSettings();
    const initialGst = settings.initial_balances?.[chain]?.gst ?? 0;
    const initialGmt = settings.initial_balances?.[chain]?.gmt ?? 0;

    // 全期間・指定チェーン・収支のみ集計
    const summary = await calcSummary({ chain });

    const round2 = (v) => Math.round(v * 100) / 100;

    return {
      chain,
      gst: {
        initial:    round2(initialGst),
        income:     round2(summary.gst.income),
        expense:    round2(summary.gst.expense),
        calculated: round2(initialGst + summary.gst.income - summary.gst.expense),
      },
      gmt: {
        initial:    round2(initialGmt),
        income:     round2(summary.gmt.income),
        expense:    round2(summary.gmt.expense),
        calculated: round2(initialGmt + summary.gmt.income - summary.gmt.expense),
      },
    };
  } catch (e) {
    console.error('[StorageService] calcSpendingBalance error:', e);
    throw e;
  }
};

/**
 * STEPN アプリの実残高と計算残高を比較する
 *
 * @param {string} chain
 * @param {object} actual  { gst: number, gmt: number }  STEPN 画面から手入力した実残高
 * @returns {object}
 *   {
 *     chain: "BNB",
 *     gst: { calculated: 50.0, actual: 50.0, diff: 0.0, ok: true },
 *     gmt: { calculated: 5.0,  actual: 5.1,  diff: -0.1, ok: false },
 *   }
 */
const verifySpendingBalance = async (chain, actual) => {
  try {
    const balance = await calcSpendingBalance(chain);
    const round2  = (v) => Math.round(v * 100) / 100;

    const gstDiff = round2(balance.gst.calculated - (actual.gst ?? 0));
    const gmtDiff = round2(balance.gmt.calculated - (actual.gmt ?? 0));

    return {
      chain,
      gst: {
        calculated: balance.gst.calculated,
        actual:     actual.gst ?? null,
        diff:       gstDiff,
        ok:         gstDiff === 0,
      },
      gmt: {
        calculated: balance.gmt.calculated,
        actual:     actual.gmt ?? null,
        diff:       gmtDiff,
        ok:         gmtDiff === 0,
      },
    };
  } catch (e) {
    console.error('[StorageService] verifySpendingBalance error:', e);
    throw e;
  }
};

// ─────────────────────────────────────────
// グループG：設定（settings）
// ─────────────────────────────────────────

/** 設定を取得 */
const getSettings = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('[StorageService] getSettings error:', e);
    throw e;
  }
};

/**
 * 設定を更新（部分更新・ディープマージ）
 *
 * @param {object} partial  変更したい項目のみ
 */
const updateSettings = async (partial) => {
  try {
    const current = await getSettings();
    const merged  = deepMerge(current, partial);
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(merged));
    return merged;
  } catch (e) {
    console.error('[StorageService] updateSettings error:', e);
    throw e;
  }
};

/**
 * チェーン別の初期残高を設定する
 *
 * @param {string} chain  "SOL" | "BNB" | "POL"
 * @param {object} balance  { gst: number, gmt: number }
 */
const setInitialBalance = async (chain, balance) => {
  return updateSettings({
    initial_balances: {
      [chain]: balance,
    },
  });
};


// ─────────────────────────────────────────
// インデックス情報（管理用）
// ─────────────────────────────────────────

// ─────────────────────────────────────────
// インデックス情報（デバッグ・管理用）
// ─────────────────────────────────────────

/** 月の目次を取得 */
const getIndex = async () => _getIndex();

/**
 * 全データの件数サマリーを返す（ホーム画面「総記録数」用）
 *
 * @param {string} chain  省略で全チェーン
 * @returns {{ total: number, byType: object, byCategory: object }}
 */
const getRecordCounts = async (chain) => {
  try {
    const index = await _getIndex();
    const byType = { income: 0, expense: 0, info: 0, listing: 0 };
    const byCategory = {};
    let total = 0;

    for (const ym of index) {
      const records = await _getMonthRecords(ym);
      for (const r of records) {
        if (chain && r.chain !== chain) continue;
        total++;
        byType[r.type] = (byType[r.type] || 0) + 1;
        byCategory[r.category] = (byCategory[r.category] || 0) + 1;
      }
    }
    return { total, byType, byCategory };
  } catch (e) {
    console.error('[StorageService] getRecordCounts error:', e);
    throw e;
  }
};

export {
  getRecords, calcSummary, getDaysWithData,
  calcSpendingBalance, verifySpendingBalance,
  getSettings, updateSettings, setInitialBalance,
  getIndex, getRecordCounts,
};
