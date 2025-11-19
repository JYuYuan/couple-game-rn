import React, { useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSettingsStore } from '@/store'
import { useTranslation } from 'react-i18next'
import { usePageBase } from '@/hooks/usePageBase'
import { useSettingsSections } from '@/hooks/useSettingsSections'
import {
  AIConfigModal,
  LanguageModal,
  ThemeModal,
  SocketUrlModal,
  LanConfigModal,
} from '@/components/settings'
import type { LanguageMode, ThemeMode } from '@/types/settings'

interface SettingItem {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  type?: 'switch'
  switchValue?: boolean
  onPress?: () => void
  disabled?: boolean
}

const Settings: React.FC = () => {
  const insets = useSafeAreaInsets()
  const {
    themeMode,
    languageMode,
    soundSettings,
    networkSettings,
    aiSettings,
    setThemeMode,
    setLanguageMode,
    setSoundSettings,
    setNetworkSettings,
    setAISettings,
  } = useSettingsStore()
  const { i18n } = useTranslation()
  const { colors, t } = usePageBase()

  // Modal visibility states
  const [showLanguageModal, setShowLanguageModal] = useState(false)
  const [showThemeModal, setShowThemeModal] = useState(false)
  const [showSocketUrlModal, setShowSocketUrlModal] = useState(false)
  const [showLanConfigModal, setShowLanConfigModal] = useState(false)
  const [showAIConfigModal, setShowAIConfigModal] = useState(false)

  const backgroundColor = colors.settingsBackground
  const cardBackground = colors.settingsCardBackground
  const cardBorder = colors.settingsCardBorder
  const textColor = colors.settingsText
  const secondaryText = colors.settingsSecondaryText
  const accentColor = colors.settingsAccent

  const modalColors = {
    modalOverlay: colors.modalOverlay,
    modalBackground: colors.modalBackground,
    modalSelected: colors.modalSelected,
    textColor,
    secondaryText,
    accentColor,
    cardBorder,
  }

  const getLanguageDisplay = (lang: LanguageMode) => {
    return t(`settings.language.config.${lang}`)
  }

  const getThemeDisplay = (theme: ThemeMode) => {
    return t(`settings.theme.config.${theme}`)
  }

  const handleLanguageChange = async (lang: LanguageMode) => {
    setLanguageMode(lang)
    await i18n.changeLanguage(lang)
    setShowLanguageModal(false)
  }

  const handleThemeChange = (theme: ThemeMode) => {
    setThemeMode(theme)
    setShowThemeModal(false)
  }

  const { settingsSections, fetchIp } = useSettingsSections({
    themeMode,
    languageMode,
    soundSettings,
    networkSettings,
    aiSettings,
    setSoundSettings,
    setNetworkSettings,
    setAISettings,
    getLanguageDisplay,
    getThemeDisplay,
    onShowLanguageModal: () => setShowLanguageModal(true),
    onShowThemeModal: () => setShowThemeModal(true),
    onShowSocketUrlModal: () => setShowSocketUrlModal(true),
    onShowLanConfigModal: () => setShowLanConfigModal(true),
    onShowAIConfigModal: () => setShowAIConfigModal(true),
    t,
  })

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: textColor }]}>{t('settings.title')}</Text>

        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: secondaryText }]}>{section.title}</Text>
            <View style={styles.sectionContent}>
              <View
                style={[
                  styles.blurCard,
                  { backgroundColor: cardBackground, borderColor: cardBorder },
                ]}
              >
                {section.items.map((item, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.settingItem,
                      index < section.items.length - 1 && styles.settingItemBorder,
                      item.disabled && styles.settingItemDisabled,
                    ]}
                    onPress={
                      (item as SettingItem).type === 'switch'
                        ? undefined
                        : (item as SettingItem).onPress
                    }
                    activeOpacity={
                      (item as SettingItem).disabled || (item as SettingItem).type === 'switch'
                        ? 1
                        : 0.7
                    }
                    disabled={
                      (item as SettingItem).disabled || (item as SettingItem).type === 'switch'
                    }
                  >
                    <View style={styles.settingItemLeft}>
                      <View style={[styles.iconContainer, { backgroundColor: `${accentColor}20` }]}>
                        {item.icon === 'refresh' && fetchIp.loading ? (
                          <ActivityIndicator size="small" color={accentColor} />
                        ) : (
                          <Ionicons
                            name={(item as SettingItem).icon}
                            size={22}
                            color={accentColor}
                          />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.settingLabel,
                          { color: textColor },
                          item.disabled && styles.settingLabelDisabled,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                    <View style={styles.settingItemRight}>
                      {(item as SettingItem).type === 'switch' ? (
                        <Switch
                          value={(item as SettingItem).switchValue}
                          onValueChange={() => (item as SettingItem).onPress?.()}
                          trackColor={{ false: '#767577', true: accentColor }}
                          thumbColor={(item as SettingItem).switchValue ? '#ffffff' : '#f4f3f4'}
                        />
                      ) : (
                        <>
                          <Text style={[styles.settingValue, { color: secondaryText }]}>
                            {item.value}
                          </Text>
                          {!item.disabled && (
                            <Ionicons name="chevron-forward" size={20} color={secondaryText} />
                          )}
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Language Modal */}
      <LanguageModal
        visible={showLanguageModal}
        currentLanguage={languageMode}
        colors={modalColors}
        onClose={() => setShowLanguageModal(false)}
        onSelect={handleLanguageChange}
        getLanguageDisplay={getLanguageDisplay}
        t={t}
      />

      {/* Theme Modal */}
      <ThemeModal
        visible={showThemeModal}
        currentTheme={themeMode}
        colors={modalColors}
        onClose={() => setShowThemeModal(false)}
        onSelect={handleThemeChange}
        getThemeDisplay={getThemeDisplay}
        t={t}
      />

      {/* Socket URL Modal */}
      <SocketUrlModal
        visible={showSocketUrlModal}
        currentUrl={networkSettings.socketUrl}
        colors={modalColors}
        onClose={() => setShowSocketUrlModal(false)}
        onSave={(url) => setNetworkSettings({ socketUrl: url })}
        t={t}
      />

      {/* LAN Config Modal */}
      <LanConfigModal
        visible={showLanConfigModal}
        currentPort={networkSettings.lanPort || 8080}
        localIP={fetchIp.data}
        colors={modalColors}
        onClose={() => setShowLanConfigModal(false)}
        onSave={(port, ip) => setNetworkSettings({ lanIP: ip, lanPort: port })}
        t={t}
      />

      {/* AI Config Modal */}
      <AIConfigModal
        visible={showAIConfigModal}
        aiSettings={aiSettings}
        colors={modalColors}
        onClose={() => setShowAIConfigModal(false)}
        onSave={(settings) => setAISettings(settings)}
        t={t}
      />
    </View>
  )
}

export default Settings

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 30,
    letterSpacing: -0.5,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 16,
  },
  sectionContent: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  blurCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingItemBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(60, 60, 67, 0.12)',
  },
  settingItemDisabled: {
    opacity: 0.6,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '400',
  },
  settingLabelDisabled: {
    opacity: 0.5,
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 15,
    marginRight: 8,
  },
})
