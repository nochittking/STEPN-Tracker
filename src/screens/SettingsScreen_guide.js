/**
 * SettingsScreen_guide.js
 *
 * アプリ取扱説明書（使い方ガイド）
 */

import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView,
} from 'react-native';

export default function GuideScreen({ navigation }) {
  return (
    <SafeAreaView style={s.container}>
      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 60 }}>

        <Text style={s.title}>📖 STEPN Tracker 使い方ガイド</Text>

        <Section title="🏠 ホーム画面">
          {`チェーン（SOL/BNB/POL）を切り替えて、今月の収支サマリーを確認できるで。

チェーン選択は次回起動時も保持される。

ボタンの説明：
・📸 スクショ取込 → STEPNのスクショから自動でデータ読み取り
・✏️ 手動入力 → 手動でレコードを追加
・📋 記録一覧 → 保存済みレコードの確認・編集・削除
・⚙️ 設定 → 初期残高・残高照合・このガイド
・📊 CSV出力 → 確定申告用のCSVファイルを共有`}
        </Section>

        <Section title="📸 スクショ取込">
          {`カメラロールからSTEPNのスクショを最大20枚まで選択。

ML Kit OCRで自動解析して、カテゴリ・金額を自動判定するで。

対応カテゴリ（自動判定）：
・ムーブ結果（GST/GMT獲得）
・Durability修復 / HP修復
・レベルアップ
・ジェムアップグレード
・ミントコスト / ミント結果
・マーケット購入 / 出品
・MBオープン / MB開封結果
・Spending出金 / 入金
・エンハンスコスト
・成功率UP / ポイント振直し
など

チェーンはスクショのアイコン色から自動判定を試みるけど、
確認画面で手動変更もできるで。`}
        </Section>

        <Section title="✏️ 手動入力">
          {`スクショが撮れへんかった取引を手動で記録できる。

大分類 → 細分類の2段階でカテゴリを選んで、
チェーン・金額・日時・メモを入力して保存するだけ。

種別（収入/支出/情報）はカテゴリに応じて自動設定されるで。`}
        </Section>

        <Section title="📋 記録一覧">
          {`保存済みのレコードを一覧表示。

タブ切替：ALL / 収入 / 支出 / 情報 / 売却中 / 仮保存
チェーンフィルタ：ALL / SOL / BNB / POL
ソート：新しい順 / 古い順

レコードをタップ → 詳細画面で編集・メモ追加
選択ボタン → 複数選択してまとめて削除`}
        </Section>

        <Section title="📊 CSV出力">
          {`確定申告用にCSVファイルを出力できる。

出力条件：
・チェーン：全チェーン / SOL / BNB / POL
・期間：今月 / 今年 / 全期間 / 月を指定

出力後はAndroidの共有シートが開くから、
Gmail・Googleドライブ・LINE等で自由に共有してや。

ファイル名の例：stepn_SOL_2026-06.csv`}
        </Section>

        <Section title="💰 Spending残高照合">
          {`設定画面から残高照合ができるで。

仕組み：
  初期残高 ＋ 収入合計 − 支出合計 ＝ 計算残高

この計算残高とSTEPNアプリの実際の残高を比較して、
差異があれば未記録の取引がある可能性を通知する。

差異が0なら ✅、差異があれば ⚠️ で表示。`}
        </Section>

        <Section title="🔗 チェーンについて">
          {`STEPNは3つのチェーンで動いてる：

・SOL（Solana） → STEPN Greenカラー
・BNB（BNB Smart Chain） → BNB黄色
・POL（Polygon） → STEPN GO紫

GST（ユーティリティトークン）はチェーン別に独立。
GMT（ガバナンストークン）は全チェーン共通。

収支はチェーン別に分けて集計されるで。`}
        </Section>

        <Section title="⚠️ 注意事項">
          {`・画像データは取込後に破棄（端末には保存しない）
・OCR解析は100%正確ではないので、確認画面で必ずチェック
・Spending→Wallet出金手数料は変動するので都度確認
・確定申告の最終判断は税理士に相談してな
・データはAsyncStorage（端末ローカル）に保存
・アプリを削除するとデータも消えるので注意`}
        </Section>

        <Section title="📱 アプリ情報">
          {`STEPN Tracker v3.2
開発：のっち × Claude
技術：React Native / Expo / ML Kit OCR
対応：Android（Development Build）

お問い合わせやフィードバックは開発者まで。`}
        </Section>

      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <Text style={s.body}>{children}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0a0a0a' },
  scroll:       { flex: 1, padding: 16 },
  title:        { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  section:      { backgroundColor: '#1a1a1a', borderRadius: 12,
                  padding: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#00ff88', marginBottom: 8 },
  body:         { fontSize: 13, color: '#bbb', lineHeight: 20 },
});
