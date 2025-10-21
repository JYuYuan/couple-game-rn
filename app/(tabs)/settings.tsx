import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSettingsStore } from '@/store'
import { useTranslation } from 'react-i18next'
import { LanguageMode, ThemeMode } from '@/types/settings'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Colors } from '@/constants/theme'
import { checkForUpdates, getAppInfo } from '@/utils/app-info'
import { getLocalIP } from '@/utils'
import { useRequest } from 'ahooks'
import * as Clipboard from 'expo-clipboard'

const Settings: React.FC = () => {
  const insets = useSafeAreaInsets()
  const {
    themeMode,
    languageMode,
    soundSettings,
    networkSettings,
    setThemeMode,
    setLanguageMode,
    setSoundSettings,
    setNetworkSettings,
  } = useSettingsStore()
  const { t, i18n } = useTranslation()
  const [showLanguageModal, setShowLanguageModal] = useState(false)
  const [showThemeModal, setShowThemeModal] = useState(false)
  const [showSocketUrlModal, setShowSocketUrlModal] = useState(false)
  const [showLanConfigModal, setShowLanConfigModal] = useState(false)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [socketUrlInput, setSocketUrlInput] = useState(networkSettings.socketUrl)
  const [lanPortInput, setLanPortInput] = useState((networkSettings.lanPort || 8080).toString())

  // 获取应用信息
  const appInfo = getAppInfo()
  const fetchIp = useRequest(getLocalIP)

  // 主题颜色
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme] as any

  const backgroundColor = colors.settingsBackground
  const cardBackground = colors.settingsCardBackground
  const cardBorder = colors.settingsCardBorder
  const textColor = colors.settingsText
  const secondaryText = colors.settingsSecondaryText
  const accentColor = colors.settingsAccent
  const modalOverlay = colors.modalOverlay
  const modalBg = colors.modalBackground
  const modalSelected = colors.modalSelected

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
    // 注意：在React Native中，Appearance.setColorScheme 主要用于监听系统主题变化
    // 实际的主题切换应该通过应用内的状态管理来实现
  }

  const handleAboutPress = async (type: string) => {
    switch (type) {
      case 'update':
        setIsCheckingUpdate(true)
        try {
          const updateInfo = await checkForUpdates()
          Alert.alert(
            t('settings.updateCheck.alertTitle', '检查更新'),
            updateInfo.message ||
              (updateInfo.hasUpdate
                ? t('settings.updateCheck.hasUpdate', '发现新版本 {{version}}！', {
                    version: updateInfo.latestVersion,
                  })
                : t('settings.updateCheck.noUpdate', '当前已是最新版本')),
            updateInfo.hasUpdate
              ? [
                  { text: t('settings.updateCheck.later', '稍后更新'), style: 'cancel' },
                  {
                    text: t('settings.updateCheck.update', '立即更新'),
                    onPress: () => {
                      // 打开 GitHub 页面
                      if (updateInfo.updateUrl) {
                        Linking.openURL(updateInfo.updateUrl)
                      }
                    },
                  },
                ]
              : [{ text: t('common.ok', '确定') }],
          )
        } catch {
          Alert.alert(
            t('settings.updateCheck.alertTitle', '检查更新'),
            t('settings.updateCheck.error', '检查更新失败，请稍后再试'),
          )
        } finally {
          setIsCheckingUpdate(false)
        }
        break
      case 'privacy':
        Alert.alert(
          t('settings.privacyPolicy.alertTitle', '隐私政策'),
          t(
            'settings.privacyPolicy.alertMessage',
            '我们重视您的隐私，所有数据均存储在本地，不会上传到服务器。',
          ),
        )
        break
      case 'terms':
        Alert.alert(
          t('settings.userAgreement.alertTitle', '用户协议'),
          t(
            'settings.userAgreement.alertMessage',
            '感谢使用我们的应用，请合理使用本应用的各项功能。',
          ),
        )
        break
    }
  }

  const settingsSections = [
    {
      title: t('settings.sections.general', '通用'),
      items: [
        {
          icon: 'language',
          label: t('settings.language.label'),
          value: getLanguageDisplay(languageMode),
          onPress: () => setShowLanguageModal(true),
        },
        {
          icon: 'moon',
          label: t('settings.theme.label'),
          value: getThemeDisplay(themeMode),
          onPress: () => setShowThemeModal(true),
        },
      ],
    },
    {
      title: t('settings.sections.network', '网络设置'),
      items: [
        {
          icon: 'cloud',
          label: t('settings.network.enabled', '网络模式'),
          value: '',
          type: 'switch',
          switchValue: networkSettings.enabled,
          onPress: () => {
            setNetworkSettings({ enabled: !networkSettings.enabled })
          },
        },
        ...(networkSettings.enabled
          ? [
              {
                icon: 'server',
                label: t('settings.network.socketUrl', 'Socket 地址'),
                value: networkSettings.socketUrl,
                onPress: () => {
                  setSocketUrlInput(networkSettings.socketUrl)
                  setShowSocketUrlModal(true)
                },
              },
            ]
          : []),
        {
          icon: 'wifi',
          label: t('settings.network.lanMode', '局域网模式'),
          value: '',
          type: 'switch',
          switchValue: networkSettings.lanMode,
          onPress: () => {
            setNetworkSettings({ lanMode: !networkSettings.lanMode })
          },
        },
        ...(networkSettings.lanMode
          ? [
              {
                icon: 'information-circle',
                label: t('settings.lan.label', '本机IP地址'),
                disabled: fetchIp.loading || !fetchIp.data,
                value: fetchIp.loading
                  ? t('settings.lan.loading', '获取中...')
                  : fetchIp.error
                    ? t('settings.lan.error', '获取失败')
                    : fetchIp.data || t('settings.lan.unavailable', '不可用'),
                onPress: () => {
                  if (!fetchIp.data) {
                    Alert.alert(
                      t('settings.lan.error', '获取失败'),
                      t(
                        'settings.lan.errorMessage',
                        Platform.OS === 'web'
                          ? '浏览器可能不支持或限制了 IP 获取功能，请手动输入 IP 地址'
                          : '无法获取本机 IP 地址，请检查网络连接',
                      ),
                    )
                    return
                  }
                  Clipboard.setStringAsync(fetchIp.data)
                  Alert.alert(
                    t('common.success', '成功'),
                    t('settings.lan.copied', 'IP地址已复制到剪贴板'),
                  )
                },
              },
              {
                icon: 'settings-outline',
                label: t('settings.lan.port', '局域网端口'),
                value: (networkSettings.lanPort || 8080).toString(),
                onPress: () => {
                  setLanPortInput((networkSettings.lanPort || 8080).toString())
                  setShowLanConfigModal(true)
                },
              },
            ]
          : []),
      ],
    },
    {
      title: t('settings.sections.gameSettings', '游戏设置'),
      items: [
        {
          icon: 'musical-notes',
          label: t('settings.sound.label', '声音设置'),
          value: '',
          type: 'switch',
          switchValue: !soundSettings.globalMute,
          onPress: () => {
            setSoundSettings({ globalMute: !soundSettings.globalMute })
          },
        },
        {
          icon: 'volume-high',
          label: t('settings.sound.bgm', '背景音乐'),
          value: '',
          type: 'switch',
          switchValue: soundSettings.bgmEnabled,
          onPress: () => {
            setSoundSettings({ bgmEnabled: !soundSettings.bgmEnabled })
          },
        },
      ],
    },
    {
      title: t('settings.sections.about', '关于'),
      items: [
        {
          icon: 'information-circle',
          label: t('settings.version.label', '版本信息'),
          value: appInfo.version,
        },
        {
          icon: 'refresh',
          label: t('settings.updateCheck.label', '检查更新'),
          value: isCheckingUpdate ? t('settings.updateCheck.checking', '检查中...') : '',
          onPress: isCheckingUpdate ? undefined : () => handleAboutPress('update'),
          disabled: isCheckingUpdate,
        },
        {
          icon: 'document-text',
          label: t('settings.userAgreement.label', '用户协议'),
          value: '',
          onPress: () => handleAboutPress('terms'),
        },
        {
          icon: 'shield-checkmark',
          label: t('settings.privacyPolicy.label', '隐私政策'),
          value: '',
          onPress: () => handleAboutPress('privacy'),
        },
      ],
    },
  ]

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
                {section.items.map((item: any, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.settingItem,
                      index < section.items.length - 1 && styles.settingItemBorder,
                      item.disabled && styles.settingItemDisabled,
                    ]}
                    onPress={item.type === 'switch' ? undefined : item.onPress}
                    activeOpacity={item.disabled || item.type === 'switch' ? 1 : 0.7}
                    disabled={item.disabled || item.type === 'switch'}
                  >
                    <View style={styles.settingItemLeft}>
                      <View style={[styles.iconContainer, { backgroundColor: `${accentColor}20` }]}>
                        {item.icon === 'refresh' && isCheckingUpdate ? (
                          <ActivityIndicator size="small" color={accentColor} />
                        ) : (
                          <Ionicons name={item.icon} size={22} color={accentColor} />
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
                      {item.type === 'switch' ? (
                        <Switch
                          value={item.switchValue}
                          onValueChange={() => item.onPress?.()}
                          trackColor={{ false: '#767577', true: accentColor }}
                          thumbColor={item.switchValue ? '#ffffff' : '#f4f3f4'}
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

      {/* 语言选择模态框 */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: modalOverlay }]}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: modalBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                {t('settings.language.modalTitle', '选择语言')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowLanguageModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={secondaryText} />
              </TouchableOpacity>
            </View>
            {(['zh', 'en', 'ja'] as LanguageMode[]).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.modalOption,
                  languageMode === lang && { backgroundColor: modalSelected },
                ]}
                onPress={() => handleLanguageChange(lang)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    { color: textColor },
                    languageMode === lang && { color: accentColor, fontWeight: '600' },
                  ]}
                >
                  {getLanguageDisplay(lang)}
                </Text>
                {languageMode === lang && (
                  <Ionicons name="checkmark" size={20} color={accentColor} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 主题选择模态框 */}
      <Modal
        visible={showThemeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: modalOverlay }]}
          activeOpacity={1}
          onPress={() => setShowThemeModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: modalBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                {t('settings.theme.modalTitle', '选择主题')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowThemeModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={secondaryText} />
              </TouchableOpacity>
            </View>
            {(['system', 'light', 'dark'] as ThemeMode[]).map((theme) => (
              <TouchableOpacity
                key={theme}
                style={[
                  styles.modalOption,
                  themeMode === theme && { backgroundColor: modalSelected },
                ]}
                onPress={() => handleThemeChange(theme)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    { color: textColor },
                    themeMode === theme && { color: accentColor, fontWeight: '600' },
                  ]}
                >
                  {getThemeDisplay(theme)}
                </Text>
                {themeMode === theme && <Ionicons name="checkmark" size={20} color={accentColor} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Socket URL 设置模态框 */}
      <Modal
        visible={showSocketUrlModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSocketUrlModal(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: modalOverlay }]}
          activeOpacity={1}
          onPress={() => setShowSocketUrlModal(false)}
        >
          <View
            style={[styles.modalContent, { backgroundColor: modalBg }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                {t('settings.network.socketUrl', 'Socket 地址')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowSocketUrlModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={secondaryText} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.modalDescription, { color: secondaryText }]}>
                {t(
                  'settings.network.socketUrlDescription',
                  '请输入 Socket 服务器地址（例如: http://192.168.1.100:3001）',
                )}
              </Text>
              <TextInput
                style={[styles.input, { color: textColor, borderColor: cardBorder }]}
                value={socketUrlInput}
                onChangeText={setSocketUrlInput}
                placeholder="http://localhost:3001"
                placeholderTextColor={secondaryText}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel, { borderColor: cardBorder }]}
                onPress={() => setShowSocketUrlModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: secondaryText }]}>
                  {t('common.cancel', '取消')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: accentColor }]}
                onPress={() => {
                  setNetworkSettings({ socketUrl: socketUrlInput })
                  setShowSocketUrlModal(false)
                  Alert.alert(
                    t('common.success', '成功'),
                    t('settings.network.socketUrlSaved', 'Socket 地址已保存'),
                  )
                }}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>
                  {t('common.confirm', '确认')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 局域网配置模态框 */}
      <Modal
        visible={showLanConfigModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanConfigModal(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: modalOverlay }]}
          activeOpacity={1}
          onPress={() => setShowLanConfigModal(false)}
        >
          <View
            style={[styles.modalContent, { backgroundColor: modalBg }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                {t('settings.lan.port', '局域网端口')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowLanConfigModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={secondaryText} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.modalDescription, { color: secondaryText }]}>
                {t(
                  'settings.lan.portDescription',
                  '设置局域网服务端口。其他玩家可以使用本机IP和此端口连接到您的房间。',
                )}
              </Text>

              <Text style={[styles.label, { color: textColor, marginTop: 16 }]}>
                {t('settings.lan.port', '端口号')}
              </Text>
              <TextInput
                style={[styles.input, { color: textColor, borderColor: cardBorder }]}
                value={lanPortInput}
                onChangeText={setLanPortInput}
                placeholder="8080"
                placeholderTextColor={secondaryText}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
              />

              <Text style={[styles.modalDescription, { color: secondaryText, marginTop: 12, fontSize: 12 }]}>
                {t(
                  'settings.lan.portHint',
                  '端口范围：1024-65535。创建房间时，系统会使用此端口启动服务。',
                )}
              </Text>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel, { borderColor: cardBorder }]}
                onPress={() => setShowLanConfigModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: secondaryText }]}>
                  {t('common.cancel', '取消')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: accentColor }]}
                onPress={() => {
                  const port = parseInt(lanPortInput, 10)
                  if (isNaN(port) || port < 1024 || port > 65535) {
                    Alert.alert(
                      t('common.error', '错误'),
                      t('settings.lan.invalidPort', '端口号必须在 1024-65535 之间'),
                    )
                    return
                  }

                  setNetworkSettings({
                    lanIP: fetchIp.data || '',
                    lanPort: port
                  })
                  setShowLanConfigModal(false)
                  Alert.alert(
                    t('common.success', '成功'),
                    t('settings.lan.portSaved', '局域网端口已保存'),
                  )
                }}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>
                  {t('common.confirm', '确认')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5E5',
  },
  modalOptionText: {
    fontSize: 16,
  },
  modalBody: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    borderWidth: 1,
  },
  modalButtonConfirm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
})
