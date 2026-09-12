/**
 * src/theme/theme.js  v1.0.0
 *
 * テーマ（ダーク / ライト）の土台
 *
 * 設計方針：
 *   - i18n.js と同じ React Context パターン。
 *     ネイティブモジュールを使わないため Dev Build の再ビルドは不要。
 *   - 選択したテーマは AsyncStorage に保存し、次回起動時に復元する。
 *   - 画面側は StyleSheet.create をそのまま書かず、
 *     makeStyles(c) 形式の関数にして useMemo で組み立てる。
 *     （StyleSheet.create はモジュールスコープで1回しか走らないため、
 *       直書きのままではテーマ切替に追従できない）
 *
 * 画面側の使い方：
 *   const makeStyles = (c) => StyleSheet.create({
 *     container: { backgroundColor: c.bg },
 *   });
 *
 *   export default function Screen() {
 *     const { colors } = useTheme();
 *     const s = useMemo(() => makeStyles(colors), [colors]);
 *     ...
 *   }
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'settings_theme';

// ─────────────────────────────────────────
// チェーンカラー（両テーマ共通・変更不可）
//   SOL/BNB/POL は各チェーンの公式ブランドカラーであり、
//   テーマによって変えてはいけない。
// ─────────────────────────────────────────

export const CHAIN_COLORS = {
  SOL: '#9FFB50',  // STEPN Green
  BNB: '#F3BA2F',  // BNB 公式 Yellow
  POL: '#9063CD',  // STEPN GO Purple
};

// ─────────────────────────────────────────
// ダークテーマ（既存の見た目をそのまま維持）
//   ※ 現行アプリの配色。移行前後で見た目が変わらないことが重要。
// ─────────────────────────────────────────

export const DARK = {
  name: 'dark',

  // 背景
  bg:            '#0a0a0a',
  bgCard:        '#1a1a1a',
  bgInput:       '#111111',
  bgModal:       '#0a0a0a',
  bgSubtle:      '#222222',
  overlay:       'rgba(0,0,0,0.85)',

  // ボーダー
  border:        '#2a2a2a',
  borderLight:   '#333333',

  // テキスト
  textPrimary:   '#ffffff',
  textSecondary: '#aaaaaa',
  textMuted:     '#888888',
  textHint:      '#555555',
  textFaint:     '#444444',

  // 意味を持つ色
  income:        '#00ff88',
  expense:       '#ff4444',
  warning:       '#ffaa00',
  pending:       '#ff8800',
  info:          '#4488ff',
  infoBg:        '#0d1a2a',   // 照合結果などの情報ボックス背景

  // ボタン
  btnPrimary:    '#00ff88',
  onPrimary:     '#000000',   // primary ボタン上の文字色
  btnSecondary:  '#1a1a1a',
  btnDanger:     '#ff4444',
  onDanger:      '#ffffff',
  btnDisabled:   '#1a4a33',

  // 選択状態のアクセント背景（旧 '#00ff8822' 相当）
  accentBg:      '#00ff8822',
  accentBgSolid: '#003322',

  // 信頼度バッジ
  confHigh:      '#00ff88',
  confMid:       '#ffaa00',
  confLow:       '#ff4444',
  confUnknown:   '#555555',
};

// ─────────────────────────────────────────
// ライトテーマ
//   ※ ダークの色をそのまま白背景に載せると読めない。
//     例：#00ff88 は白背景でのコントラスト比が約1.4:1 しかなく、
//         可読性の最低ライン 4.5:1 を大きく下回る。
//     そのため意味を持つ色は白背景で読める濃さに落としている。
//     （チェーンカラーだけはブランド色なので据え置き）
// ─────────────────────────────────────────

export const LIGHT = {
  name: 'light',

  // 背景
  bg:            '#f4f5f7',
  bgCard:        '#ffffff',
  bgInput:       '#ffffff',
  bgModal:       '#ffffff',
  bgSubtle:      '#eceef1',
  overlay:       'rgba(0,0,0,0.55)',

  // ボーダー
  border:        '#dcdfe4',
  borderLight:   '#c8ccd2',

  // テキスト
  textPrimary:   '#14161a',
  textSecondary: '#4a4f57',
  textMuted:     '#6b7280',
  textHint:      '#8a9099',
  textFaint:     '#a6abb3',

  // 意味を持つ色（白背景で読める濃さに調整）
  income:        '#00703a',
  expense:       '#c62828',
  warning:       '#9a6200',
  pending:       '#b25000',
  info:          '#1257a8',
  infoBg:        '#e9f1fc',   // 照合結果などの情報ボックス背景

  // ボタン
  btnPrimary:    '#00b862',   // 上に黒文字を載せる前提の明るめグリーン
  onPrimary:     '#000000',
  btnSecondary:  '#e8eaee',
  btnDanger:     '#c62828',
  onDanger:      '#ffffff',
  btnDisabled:   '#b9d9c7',

  // 選択状態のアクセント背景
  accentBg:      '#00b8621f',
  accentBgSolid: '#d8f3e4',

  // 信頼度バッジ
  confHigh:      '#00703a',
  confMid:       '#9a6200',
  confLow:       '#c62828',
  confUnknown:   '#8a9099',
};

const THEMES = { dark: DARK, light: LIGHT };

// ─────────────────────────────────────────
// Context 本体
// ─────────────────────────────────────────

const ThemeContext = createContext({
  theme:    'dark',
  setTheme: () => {},
  colors:   DARK,
  chainColors: CHAIN_COLORS,
});

/**
 * ThemeProvider
 *   App.js でアプリ全体を包む。LanguageProvider と入れ子にして使う。
 */
export function ThemeProvider({ children }) {
  // 初期値 'dark'（現行の見た目。AsyncStorage読み込みまでの一瞬もチラつかない）
  const [theme, setThemeState] = useState('dark');

  // 起動時に保存済みテーマを復元
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((saved) => {
        if (saved === 'dark' || saved === 'light') setThemeState(saved);
      })
      .catch(() => {});
  }, []);

  // テーマを切り替えて保存
  const setTheme = (next) => {
    setThemeState(next);
    AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
  };

  // colors はテーマが変わったときだけ作り直す
  const value = useMemo(() => ({
    theme,
    setTheme,
    colors: THEMES[theme] ?? DARK,   // 未知の値が入ってもダークに落とす
    chainColors: CHAIN_COLORS,
  }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * useTheme : 各画面でテーマを使うためのフック
 *   const { colors, theme, setTheme } = useTheme();
 */
export function useTheme() {
  return useContext(ThemeContext);
}
