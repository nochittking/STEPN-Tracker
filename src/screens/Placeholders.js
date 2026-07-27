/**
 * src/screens/Placeholders.js
 * 第2〜4回実装予定の画面プレースホルダー
 * 第1回の動作確認用：各画面に遷移できることを確認できる
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants';

function PlaceholderScreen({ title, emoji, navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>この画面は実装予定やで！</Text>
      <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
        <Text style={styles.btnText}>← ホームに戻る</Text>
      </TouchableOpacity>
    </View>
  );
}

export function PlaceholderImport({ navigation }) {
  return <PlaceholderScreen title="スクショ取込フロー" emoji="📸" navigation={navigation} />;
}

export function PlaceholderRecordList({ navigation }) {
  return <PlaceholderScreen title="記録一覧" emoji="📋" navigation={navigation} />;
}

export function PlaceholderRecordDetail({ navigation }) {
  return <PlaceholderScreen title="レコード詳細" emoji="📄" navigation={navigation} />;
}

export function PlaceholderManualInput({ navigation }) {
  return <PlaceholderScreen title="手動入力" emoji="✏️" navigation={navigation} />;
}

export function PlaceholderSettings({ navigation }) {
  return <PlaceholderScreen title="設定" emoji="⚙️" navigation={navigation} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emoji:     { fontSize: 64, marginBottom: 16 },
  title:     { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  sub:       { fontSize: 14, color: COLORS.textMuted, marginBottom: 32 },
  btn:       { backgroundColor: '#1a1a1a', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, borderWidth: 1, borderColor: '#333' },
  btnText:   { color: '#aaa', fontSize: 14, fontWeight: 'bold' },
});
