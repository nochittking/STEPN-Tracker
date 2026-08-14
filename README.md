# STEPN Tracker（STEPN収支管理ツール）

STEPN のスクリーンショットを **端末内の OCR** で自動解析し、GST / GMT の収支を
チェーン別に記録・集計する Android 向けアプリです。確定申告用の CSV 出力にも対応しています。

> 個人開発プロジェクト。STEPN 公式とは一切関係ありません。

---

## 📱 何ができるか

| 機能 | 内容 |
|---|---|
| 📸 スクショ自動取込 | カメラロールから最大20枚をまとめて選択 → OCRで自動解析・カテゴリ判定 |
| 🎯 信頼度判定 | 解析結果を信頼度でランク分けし、低いものだけ手動確認を促す |
| 🔗 チェーン別集計 | SOL / BNB / POL を独立集計（GSTはチェーンごとに別通貨のため合算しない） |
| 📊 収支サマリー | 日 / 月 / 年 / 任意期間で GST・GMT の収入・支出・合計を表示 |
| 💰 残高照合 | 「初期残高 + 収入 − 支出」の計算値と STEPN 実残高の差異を検出 |
| 📋 記録一覧 | 収入 / 支出 / 情報 / 売却中 / 修正履歴のタブ、ソート・フィルタ・複数削除 |
| ✏️ 手動入力・修正 | OCRで拾えない分の手入力と、既存レコードの修正（履歴を全件保持） |
| 📤 CSV出力 | 確定申告用にエクスポート |
| 🌐 多言語対応 | 日本語 / English の即時切替（実装進行中） |

**画像はアプリ内で解析後に破棄**され、端末外には一切送信されません。

---

## 🛠 技術構成

| 項目 | 採用技術 |
|---|---|
| フレームワーク | React Native 0.81.5 / Expo SDK 54 |
| ランタイム | React 19.1.0 / New Architecture 有効 |
| OCR | `@react-native-ml-kit/text-recognition`（**端末内処理・外部API不使用**） |
| ストレージ | AsyncStorage（月別分割 + インデックス管理） |
| ナビゲーション | React Navigation 7（native-stack） |
| 画像処理 | expo-image-picker / expo-image-manipulator |
| 多言語化 | 自前実装（React Context + AsyncStorage・ネイティブ依存なし） |
| ビルド | EAS Build |

### 設計上の方針

- **OCR は ML Kit 一択。** Google Cloud Vision 等の有料 API は使用しません（コストゼロ・オフライン動作・プライバシー保護のため）
- **多言語化はネイティブライブラリ不使用。** Dev Build のリビルドが不要になるよう、React Context のみで実装
- **テキスト解析とピクセル解析の二段構え。** OCR文字列だけでは判別できないミステリーボックスの品質等は、画像のピクセル色から判定

### ディレクトリ構成

```
├── App.js                          ナビゲーション定義 + LanguageProvider
├── index.js                        エントリポイント
└── src/
    ├── constants/index.js          チェーン定義・カラー・カテゴリ・共通スタイル
    ├── i18n/i18n.js                多言語辞書 + LanguageProvider / useI18n
    ├── screens/
    │   ├── HomeScreen.js           ホーム（収支サマリー・残高照合）
    │   ├── ImportScreen.js         スクショ取込フロー
    │   ├── ImportScreen_item.js    取込結果の1件分UI
    │   ├── RecordListScreen.js     記録一覧
    │   ├── RecordDetail.js         レコード詳細・修正
    │   ├── ManualInput.js          手動入力
    │   ├── SettingsScreen.js       設定
    │   ├── SettingsScreen_guide.js 使い方ガイド
    │   └── CsvExportModal.js       CSV出力
    └── services/
        ├── StorageService.js       永続化・集計・修正履歴・残高照合
        ├── StorageService_query.js クエリ・集計ロジック
        ├── VisionAnalyzer.js       解析の統合窓口
        ├── VisionAnalyzer_parsers.js  OCRテキストのパース
        └── VisionAnalyzer_pixel.js    ピクセル色による判定
```

---

## 🚀 起動方法

### 必要なもの

- Node.js（LTS推奨）
- Android 実機（**ML Kit がネイティブモジュールのため Expo Go では動きません**）
- EAS CLI（Dev Build を作る場合）

### セットアップ

```bash
git clone https://github.com/nochittking/STEPN-Tracker.git
cd STEPN-Tracker
npm install
```

### Dev Client のビルド（初回のみ）

ML Kit を含むため、素の Expo Go ではなく **Development Build** が必要です。

```bash
set EAS_NO_VCS=1 && npx eas build --profile development --platform android
```

ビルドされた APK を Android 実機にインストールします。

### 開発サーバー起動

```bash
npm start
# または
npm run android
```

インストール済みの Dev Client から接続してください。

### 構文チェック

JSX を含むため `node` 単体では構文エラーを検出できません。必ずコンパイルを通して確認します。

```bash
npx --yes esbuild --loader=jsx --log-level=warning --outfile=/dev/null src/screens/HomeScreen.js
```

---

## 📈 現在の進捗

**総コード量：約 9,158 行（24ファイル）**

### ✅ 完了

- ストレージ層（月別分割・修正履歴・Spending残高照合）
- OCR解析エンジン（テキストパース + ピクセル解析）
- ホーム画面（チェーン別・期間別の収支集計）
- スクショ取込フロー（最大20枚一括・信頼度判定）
- 記録一覧（タブ・ソート・フィルタ・複数削除）
- レコード詳細・修正 / 手動入力
- 設定画面 / 使い方ガイド
- CSV出力
- 多言語化の基盤（辞書 + Context + 永続化）

### 🔄 進行中：多言語化（i18n）

| 画面 | 状態 |
|---|---|
| HomeScreen | ✅ |
| ImportScreen 系 | ✅ |
| RecordListScreen | ✅ |
| SettingsScreen | 🔲 |
| RecordDetail | 🔲 |
| ManualInput | 🔲 |
| CsvExportModal | 🔲 |
| SettingsScreen_guide | 🔲 |

### 🔲 今後

- カテゴリ表記を i18n 辞書に一本化（現在4箇所に重複定義があり、CSV出力側で11カテゴリのラベルが欠落）
- 重複ファイルの整理
- ダーク/ライトテーマ・文字サイズ3段階
- CSV円換算レート（CoinGecko API）

---

## 📖 ドキュメント

| ドキュメント | 内容 |
|---|---|
| [`STEPN_引き継ぎドキュメント_v9_20260814.md`](./STEPN_引き継ぎドキュメント_v9_20260814.md) | **現行版**。仕様・進捗・開発ルール・技術仕様のすべて |
| [`docs/handoff/`](./docs/handoff/) | 過去の引き継ぎドキュメント（v2〜v8）と全コンテキスト統合アーカイブ |
| [`docs/reference/`](./docs/reference/) | 初期のJSONスキーマ設計書など参考資料 |

新しくこのプロジェクトに関わる場合は **v9 だけを読めば足ります**。
過去の経緯を追いたい場合のみ `docs/handoff/` の統合アーカイブを参照してください。

---

## 📄 ライセンス

未設定（Private use）
