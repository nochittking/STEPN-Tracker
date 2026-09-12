/**
 * SettingsScreen_guide.js  v3.4.0
 *
 * アプリ取扱説明書（使い方ガイド）
 *
 * v3.4.0 変更点：
 *   - 多言語対応（useI18n）。本文は i18n の guide_* に全移行した。
 *   - バージョン表記を constants の APP_VERSION 参照に変更。
 */

import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { APP_VERSION } from '../constants';
import { useI18n } from '../i18n/i18n';   // ★ 多言語対応

export default function GuideScreen({ navigation }) {
  const { t } = useI18n();   // ★ 多言語対応

  return (
    <SafeAreaView style={s.container}>
      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 60 }}>

        <Text style={s.title}>{t('guide_title')}</Text>

        <Section title={t('guide_home_t')}>{t('guide_home_b')}</Section>
        <Section title={t('guide_import_t')}>{t('guide_import_b')}</Section>
        <Section title={t('guide_manual_t')}>{t('guide_manual_b')}</Section>
        <Section title={t('guide_list_t')}>{t('guide_list_b')}</Section>
        <Section title={t('guide_csv_t')}>{t('guide_csv_b')}</Section>
        <Section title={t('guide_balance_t')}>{t('guide_balance_b')}</Section>
        <Section title={t('guide_chain_t')}>{t('guide_chain_b')}</Section>
        <Section title={t('guide_notes_t')}>{t('guide_notes_b')}</Section>
        <Section title={t('guide_about_t')}>{t('guide_about_b', APP_VERSION)}</Section>

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
