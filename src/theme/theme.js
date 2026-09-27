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

/** ブランドカラー（各チェーンの公式色。ダークテーマではこのまま使う） */
export const CHAIN_COLORS = {
  SOL: '#9FFB50',  // STEPN Green
  BNB: '#F3BA2F',  // BNB 公式 Yellow
  POL: '#9063CD',  // STEPN GO Purple
};

/** ライトテーマ用のチェーンカラー
 *
 *  ブランド色をそのまま明るい背景に置くと、文字として読めない（SOL 1.14:1 等）。
 *  かといって 4.5:1 を満たすまで暗くすると、緑と黄色は彩度まで落ちて
 *  「どんより」した色になってしまう（緑・黄は彩度が高いほど物理的に明るいため、
 *  鮮やかさと文字コントラストは両立しない）。
 *
 *  そこで本アプリでは「鮮やかさを優先し、文字は濃い縁取りで浮かせる」方針を採る。
 *  ここの色は開発者が実機で見比べて選んだ値であり、コントラスト比だけを根拠に
 *  変更してはいけない。読みやすさは下の chainTextShadow が担保する。
 */
export const CHAIN_COLORS_LIGHT = {
  SOL: '#68e001',
  BNB: '#f3b00c',
  POL: '#9063CD',
};

// ─────────────────────────────────────────
// ダークテーマ（既存の見た目をそのまま維持）
//   ※ 現行アプリの配色。移行前後で見た目が変わらないことが重要。
// ─────────────────────────────────────────

export const DARK = {
  name: 'dark',
  chain: CHAIN_COLORS,        // ダークはブランド色をそのまま

  // 背景
  bg:            '#0a0a0a',
  bgCard:        '#1a1a1a',
  bgInput:       '#111111',
  bgModal:       '#0a0a0a',
  bgSubtle:      '#222222',
  overlay:       'rgba(0,0,0,0.85)',
  overlaySoft:   'rgba(0,0,0,0.7)',    // モーダルの背面（CSV出力）

  // ボーダー
  border:        '#2a2a2a',
  borderLight:   '#333333',

  // テキスト
  //   ※ 無彩色は #fff → #333 までの階調を全段そろえてある。
  //     画面側で近い値に寄せるとダークの見た目がずれるため、必ず該当段を使うこと。
  textPrimary:   '#ffffff',
  textBright:    '#cccccc',
  textBody:      '#bbbbbb',
  textSecondary: '#aaaaaa',
  textMuted:     '#888888',
  textHint:      '#555555',
  textFaint:     '#444444',
  textMid:       '#777777',
  textDim:       '#666666',
  textFaintest:  '#333333',   // フッター等、最も控えめな装飾文字

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

  // アクセント地のボタン背景（HomeScreen の取込／CSV／期間タブ）
  accentSurface:   '#1a2a1a',   // 取込ボタンの地
  accentSurfaceOn: '#1a3a2a',   // 選択中の期間タブの地
  infoSurface:     '#1a1a2a',   // CSV出力ボタンの地
  infoAlt:         '#44aaff',   // カテゴリ選択など info とは別系統の青
  infoAltBg:       '#44aaff22',

  // 状態を示す地（RecordListScreen）
  selectedSurface: '#001a0d',   // 選択中のレコードカード
  badgeSurface:    '#0d2a1a',   // 選択中カテゴリのバッジ地
  dangerSurface:   '#1a0000',   // 削除ボタンなど危険操作の地
  pendingSurface:  '#1a1200',   // 仮保存カードの地

  // チェーン名の縁取り
  //   ダークは背景が暗くブランド色がそのまま読めるため、縁取りは付けない
  chainTextShadow:       'transparent',
  chainTextShadowRadius: 0,

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
  chain: CHAIN_COLORS_LIGHT,  // ライトは明度を落としたチェーンカラー

  // 背景
  //   ※ 純白（#ffffff）は実機で眩しすぎたため、5段階トーンダウンしている。
  //     カードは純白比で約33%ダウン。ダークから切り替えた瞬間の眩しさ
  //     （目の順応によるもの）を抑えることを優先した配色。
  //     背景との明度差はトーンを落とすほど広がっており（純白時 1.091:1 →
  //     現在 1.188:1）、カードの輪郭はむしろ見やすくなっている。
  //
  //   ★ さらにトーンを落とす場合の注意
  //     カードが暗くなるぶん、その上に載る濃い文字のコントラストは必ず下がる。
  //     文字色はコントラスト目標から逆算しているので、カード色を変えたら
  //     textPrimary=12:1 / textSecondary=8:1 / textMuted=6:1 / textHint=4.6:1
  //     を満たす値に引き直すこと。意味色（income等）も 4.5:1 の再確認が必要。
  bg:            '#c0c5ce',
  bgCard:        '#d2d6dd',
  bgInput:       '#e0e3e8',   // 入力欄はカードより明るくして「欄」だと分かるようにする
  bgModal:       '#d2d6dd',
  bgSubtle:      '#b6bcc6',
  overlay:       'rgba(0,0,0,0.55)',
  overlaySoft:   'rgba(0,0,0,0.45)',   // モーダルの背面（CSV出力）

  // ボーダー
  border:        '#a8afbb',
  borderLight:   '#98a0ae',

  // テキスト（カード #d2d6dd 上でのコントラスト目標から逆算）
  textPrimary:   '#151920',   // 12.09:1
  textBright:    '#23272e',
  textBody:      '#2b2f36',
  textSecondary: '#34383f',   //  8.08:1
  textMuted:     '#474b52',   //  6.01:1
  textHint:      '#585c63',   //  4.61:1
  textFaint:     '#767b84',   // 区切り線・バッジ等の装飾用（本文には使わない）
  textMid:       '#4f545c',
  textDim:       '#545960',
  textFaintest:  '#8b9098',   // フッター等、最も控えめな装飾文字

  // 意味を持つ色（すべてカード上で 4.5:1 以上）
  income:        '#006937',
  expense:       '#af2323',
  warning:       '#7e5000',
  pending:       '#944300',
  info:          '#1257a8',
  infoBg:        '#c2d2e8',   // 照合結果などの情報ボックス背景

  // ボタン
  btnPrimary:    '#00a457',   // 上に黒文字を載せる前提のグリーン
  onPrimary:     '#000000',
  btnSecondary:  '#c4c9d2',
  btnDanger:     '#af2323',
  onDanger:      '#ffffff',
  btnDisabled:   '#a3bfae',

  // 選択状態のアクセント背景
  accentBg:      '#00a45726',
  accentBgSolid: '#b4d8c4',

  // アクセント地のボタン背景（HomeScreen の取込／CSV／期間タブ）
  accentSurface:   '#c7e3d3',   // 取込ボタンの地
  accentSurfaceOn: '#b6dbc5',   // 選択中の期間タブの地
  infoSurface:     '#cfdef3',   // CSV出力ボタンの地
  infoAlt:         '#0d5698',   // カテゴリ選択など info とは別系統の青
  infoAltBg:       '#0d569826',

  // 状態を示す地（RecordListScreen）
  selectedSurface: '#c2e2d0',   // 選択中のレコードカード
  badgeSurface:    '#c9e5d5',   // 選択中カテゴリのバッジ地
  dangerSurface:   '#eed3d1',   // 削除ボタンなど危険操作の地
  pendingSurface:  '#ebdfc2',   // 仮保存カードの地

  // チェーン名の縁取り
  //   明るい背景の上で鮮やかな文字を浮かせるための縁。
  //   ※ 白っぽい縁では背景と同化して効果がないため、必ず濃い色にすること。
  //   文字が潰れて見える場合は radius を下げる（1.2〜2.4 が目安）。
  chainTextShadow:       'rgba(18,22,28,0.92)',
  chainTextShadowRadius: 2,

  // 信頼度バッジ
  confHigh:      '#006937',
  confMid:       '#7e5000',
  confLow:       '#af2323',
  confUnknown:   '#585c63',
};

const THEMES = { dark: DARK, light: LIGHT };

// ─────────────────────────────────────────
// Context 本体
// ─────────────────────────────────────────

const ThemeContext = createContext({
  theme:    'dark',
  setTheme: () => {},
  colors:   DARK,
  chainColors: DARK.chain,
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
    // ★ チェーンカラーはテーマで切り替わる。画面側は CHAIN_COLORS を直接
    //   import せず、必ず useTheme() の chainColors を使うこと。
    chainColors: (THEMES[theme] ?? DARK).chain,
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
