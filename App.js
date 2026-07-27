/**
 * App.js  v3.1.0
 * STEPN収支管理ツール - ナビゲーション設定
 *
 * v3.1.0 変更点：
 *   - 多言語対応（LanguageProvider）を追加。アプリ全体を包み、
 *     全画面で言語（日本語/英語）を共有できるようにした。
 *
 * 画面構成：
 *   HomeScreen       - ホーム（メイン）
 *   ImportScreen     - スクショ取込フロー
 *   RecordListScreen - 記録一覧
 *   RecordDetail     - レコード詳細・修正
 *   ManualInput      - 手動入力
 *   Settings         - 設定
 */

import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { StorageService } from './src/services/StorageService';
import { COLORS } from './src/constants';
import { LanguageProvider } from './src/i18n/i18n';   // ★ 多言語対応

// ── 画面インポート ──
import HomeScreen          from './src/screens/HomeScreen';
import ImportScreen        from './src/screens/ImportScreen';
import RecordListScreen    from './src/screens/RecordListScreen';

import ManualInput from './src/screens/ManualInput';
import RecordDetail from './src/screens/RecordDetail';
import SettingsScreen from './src/screens/SettingsScreen';
import GuideScreen from './src/screens/SettingsScreen_guide';

const Stack = createNativeStackNavigator();

// ─────────────────────────────────────────
// 共通ヘッダースタイル
//   ※ ヘッダータイトルの多言語化は各画面を英語化するフェーズで対応予定。
//     現時点では中身が日本語のため、ヘッダーも日本語のままにしている。
// ─────────────────────────────────────────

const SCREEN_OPTIONS = {
  headerStyle: {
    backgroundColor: '#111111',
  },
  headerTintColor: '#ffffff',
  headerTitleStyle: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  headerBackTitle: '戻る',
  contentStyle: {
    backgroundColor: COLORS.bg,
  },
};

// ─────────────────────────────────────────
// App
// ─────────────────────────────────────────

export default function App() {

  // アプリ起動時に StorageService を初期化
  useEffect(() => {
    StorageService.initialize().catch((e) => {
      console.error('[App] StorageService.initialize error:', e);
    });
  }, []);

  return (
    // ★ アプリ全体を LanguageProvider で包む（全画面で言語を共有）
    <LanguageProvider>
      <NavigationContainer>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={SCREEN_OPTIONS}
        >
          {/* ホーム画面 */}
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }} // ホームはカスタムヘッダーを使うので非表示
          />

          {/* スクショ取込フロー */}
          <Stack.Screen
            name="Import"
            component={ImportScreen}
            options={{ title: '📸 スクショ取込' }}
          />

          {/* 記録一覧 */}
          <Stack.Screen
            name="RecordList"
            component={RecordListScreen}
            options={{ title: '📋 記録一覧' }}
          />

          {/* レコード詳細・修正 */}
          <Stack.Screen
            name="RecordDetail"
            component={RecordDetail}
            options={{ title: '📄 レコード詳細' }}
          />

          {/* 手動入力 */}
          <Stack.Screen
            name="ManualInput"
            component={ManualInput}
            options={{ title: '✏️ 手動入力' }}
          />

          {/* 設定 */}
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: '⚙️ 設定' }}
          />

          {/* 取扱説明書 */}
          <Stack.Screen
            name="Guide"
            component={GuideScreen}
            options={{ title: '📖 使い方ガイド' }}
          />

        </Stack.Navigator>
      </NavigationContainer>
    </LanguageProvider>
  );
}
