/**
 * App.js  v3.4.0
 * STEPN収支管理ツール - ナビゲーション設定
 *
 * v3.4.0 変更点：
 *   - ヘッダータイトルと戻るボタンを多言語化（nav_* キー）。
 *   - App() 自身は LanguageProvider の外側にいるため useI18n() が効かない。
 *     そのため Navigator を RootNavigator として内側に切り出している。
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
import { LanguageProvider, useI18n } from './src/i18n/i18n';   // ★ 多言語対応

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
// ルートナビゲーター
//   ※ LanguageProvider の内側に置くこと。
//     App() 自身は Provider の外側なので、そこで useI18n() を呼んでも
//     デフォルト値（日本語固定）しか取れず、言語切替に追従しない。
// ─────────────────────────────────────────

function RootNavigator() {
  const { t } = useI18n();   // ★ 多言語対応

  const screenOptions = {
    headerStyle: {
      backgroundColor: '#111111',
    },
    headerTintColor: '#ffffff',
    headerTitleStyle: {
      fontWeight: 'bold',
      fontSize: 16,
    },
    headerBackTitle: t('nav_back'),
    contentStyle: {
      backgroundColor: COLORS.bg,
    },
  };

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={screenOptions}
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
          options={{ title: t('nav_import') }}
        />

        {/* 記録一覧 */}
        <Stack.Screen
          name="RecordList"
          component={RecordListScreen}
          options={{ title: t('nav_recordlist') }}
        />

        {/* レコード詳細・修正 */}
        <Stack.Screen
          name="RecordDetail"
          component={RecordDetail}
          options={{ title: t('nav_recorddetail') }}
        />

        {/* 手動入力 */}
        <Stack.Screen
          name="ManualInput"
          component={ManualInput}
          options={{ title: t('nav_manualinput') }}
        />

        {/* 設定 */}
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: t('nav_settings') }}
        />

        {/* 取扱説明書 */}
        <Stack.Screen
          name="Guide"
          component={GuideScreen}
          options={{ title: t('nav_guide') }}
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}

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
      <RootNavigator />
    </LanguageProvider>
  );
}
