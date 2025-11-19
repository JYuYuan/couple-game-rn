import { Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import { useRequest } from 'ahooks'
import { Linking } from 'react-native'
import { checkForUpdates, getAppInfo } from '@/utils/app-info'
import { getLocalIP } from '@/utils'
import { showConfirmDialog } from '@/components/ConfirmDialog'
import toast from '@/utils/toast'
import type { TFunction } from 'i18next'
import type { LanguageMode, ThemeMode, AISettings, NetworkSettings, SoundSettings } from '@/types/settings'

interface SettingItem {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  type?: 'switch'
  switchValue?: boolean
  onPress?: () => void
  disabled?: boolean
}

interface SettingSection {
  title: string
  items: SettingItem[]
}

interface UseSettingsSectionsProps {
  themeMode: ThemeMode
  languageMode: LanguageMode
  soundSettings: SoundSettings
  networkSettings: NetworkSettings
  aiSettings: AISettings
  setSoundSettings: (settings: Partial<SoundSettings>) => void
  setNetworkSettings: (settings: Partial<NetworkSettings>) => void
  setAISettings: (settings: Partial<AISettings>) => void
  getLanguageDisplay: (lang: LanguageMode) => string
  getThemeDisplay: (theme: ThemeMode) => string
  onShowLanguageModal: () => void
  onShowThemeModal: () => void
  onShowSocketUrlModal: () => void
  onShowLanConfigModal: () => void
  onShowAIConfigModal: () => void
  t: TFunction
}

/**
 * Settings Sections Hook
 * 管理设置页面的所有配置项
 */
export function useSettingsSections(props: UseSettingsSectionsProps) {
  const {
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
    onShowLanguageModal,
    onShowThemeModal,
    onShowSocketUrlModal,
    onShowLanConfigModal,
    onShowAIConfigModal,
    t,
  } = props

  const appInfo = getAppInfo()
  const fetchIp = useRequest(getLocalIP)

  const handleAboutPress = async (type: string) => {
    switch (type) {
      case 'update':
        try {
          const updateInfo = await checkForUpdates()

          if (updateInfo.hasUpdate) {
            const confirmed = await showConfirmDialog({
              title: t('settings.updateCheck.alertTitle', '检查更新'),
              message:
                updateInfo.message ||
                t('settings.updateCheck.hasUpdate', '发现新版本 {{version}}！', {
                  version: updateInfo.latestVersion,
                }),
              confirmText: t('settings.updateCheck.update', '立即更新'),
              cancelText: t('settings.updateCheck.later', '稍后更新'),
              icon: 'download-outline',
              iconColor: '#4CAF50',
            })

            if (confirmed && updateInfo.updateUrl) {
              Linking.openURL(updateInfo.updateUrl)
            }
          } else {
            await showConfirmDialog({
              title: t('settings.updateCheck.alertTitle', '检查更新'),
              message: updateInfo.message || t('settings.updateCheck.noUpdate', '当前已是最新版本'),
              confirmText: t('common.ok', '确定'),
              cancelText: false,
              icon: 'checkmark-circle-outline',
              iconColor: '#4CAF50',
            })
          }
        } catch {
          await showConfirmDialog({
            title: t('settings.updateCheck.alertTitle', '检查更新'),
            message: t('settings.updateCheck.error', '检查更新失败，请稍后再试'),
            confirmText: t('common.ok', '确定'),
            cancelText: false,
            icon: 'alert-circle-outline',
            iconColor: '#FF6B6B',
          })
        }
        break
      case 'privacy':
        await showConfirmDialog({
          title: t('settings.privacyPolicy.alertTitle', '隐私政策'),
          message: t(
            'settings.privacyPolicy.alertMessage',
            '我们重视您的隐私，所有数据均存储在本地，不会上传到服务器。',
          ),
          confirmText: t('common.ok', '确定'),
          cancelText: false,
          icon: 'shield-checkmark-outline',
          iconColor: '#4CAF50',
        })
        break
      case 'terms':
        await showConfirmDialog({
          title: t('settings.userAgreement.alertTitle', '用户协议'),
          message: t(
            'settings.userAgreement.alertMessage',
            '感谢使用我们的应用，请合理使用本应用的各项功能。',
          ),
          confirmText: t('common.ok', '确定'),
          cancelText: false,
          icon: 'document-text-outline',
          iconColor: '#4CAF50',
        })
        break
    }
  }

  const settingsSections: SettingSection[] = [
    {
      title: t('settings.sections.general', '通用'),
      items: [
        {
          icon: 'language',
          label: t('settings.language.label'),
          value: getLanguageDisplay(languageMode),
          onPress: onShowLanguageModal,
        },
        {
          icon: 'moon',
          label: t('settings.theme.label'),
          value: getThemeDisplay(themeMode),
          onPress: onShowThemeModal,
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
                icon: 'server' as keyof typeof Ionicons.glyphMap,
                label: t('settings.network.socketUrl', 'Socket 地址'),
                value: networkSettings.socketUrl,
                onPress: onShowSocketUrlModal,
              },
            ]
          : []),
        ...(Platform.OS !== 'web'
          ? [
              {
                icon: 'wifi' as keyof typeof Ionicons.glyphMap,
                label: t('settings.network.lanMode', '局域网模式'),
                value: '',
                type: 'switch' as const,
                switchValue: networkSettings.lanMode,
                onPress: () => {
                  setNetworkSettings({ lanMode: !networkSettings.lanMode })
                },
              },
              ...(networkSettings.lanMode
                ? [
                    {
                      icon: 'information-circle' as keyof typeof Ionicons.glyphMap,
                      label: t('settings.lan.label', '本机IP地址'),
                      disabled: fetchIp.loading || !fetchIp.data,
                      value: fetchIp.loading
                        ? t('settings.lan.loading', '获取中...')
                        : fetchIp.error
                          ? t('settings.lan.error', '获取失败')
                          : fetchIp.data || t('settings.lan.unavailable', '不可用'),
                      onPress: async () => {
                        if (!fetchIp.data) {
                          toast.error(
                            t('settings.lan.error', '获取失败'),
                            t('settings.lan.errorMessage', '无法获取本机 IP 地址，请检查网络连接'),
                          )
                          return
                        }
                        await Clipboard.setStringAsync(fetchIp.data)

                        toast.success(
                          t('common.success', '成功'),
                          t('settings.lan.copied', 'IP地址已复制到剪贴板'),
                        )
                      },
                    },
                    {
                      icon: 'settings-outline' as keyof typeof Ionicons.glyphMap,
                      label: t('settings.lan.port', '局域网端口'),
                      value: (networkSettings.lanPort || 8080).toString(),
                      onPress: onShowLanConfigModal,
                    },
                  ]
                : []),
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
      title: t('settings.sections.aiSettings', 'AI 设置'),
      items: [
        {
          icon: 'sparkles',
          label: t('settings.ai.enabled', '启用 AI 功能'),
          value: '',
          type: 'switch',
          switchValue: aiSettings.enabled,
          onPress: () => {
            setAISettings({ enabled: !aiSettings.enabled })
          },
        },
        ...(aiSettings.enabled
          ? [
              {
                icon: 'construct' as keyof typeof Ionicons.glyphMap,
                label: t('settings.ai.config', 'AI 配置'),
                value: aiSettings.apiKey
                  ? t('settings.ai.configured', '已配置')
                  : t('settings.ai.notConfigured', '未配置'),
                onPress: onShowAIConfigModal,
              },
            ]
          : []),
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
          value: '',
          onPress: () => handleAboutPress('update'),
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

  return {
    settingsSections,
    handleAboutPress,
    fetchIp,
    appInfo,
  }
}
