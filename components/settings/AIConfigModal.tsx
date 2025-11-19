import React, { useState } from 'react'
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { showConfirmDialog } from '@/components/ConfirmDialog'
import { modalStyles } from './modalStyles'
import type { TFunction } from 'i18next'
import type { AISettings } from '@/types/settings'

interface AIConfigModalProps {
  visible: boolean
  aiSettings: AISettings
  colors: {
    modalOverlay: string
    modalBackground: string
    textColor: string
    secondaryText: string
    cardBorder: string
    accentColor: string
  }
  onClose: () => void
  onSave: (settings: Partial<AISettings>) => void
  t: TFunction
}

export function AIConfigModal({
  visible,
  aiSettings,
  colors,
  onClose,
  onSave,
  t,
}: AIConfigModalProps) {
  const [aiUrlInput, setAiUrlInput] = useState(aiSettings.apiUrl)
  const [aiKeyInput, setAiKeyInput] = useState(aiSettings.apiKey)
  const [aiModelInput, setAiModelInput] = useState(aiSettings.apiModel)

  // 当模态框打开时，重置输入值
  React.useEffect(() => {
    if (visible) {
      setAiUrlInput(aiSettings.apiUrl)
      setAiKeyInput(aiSettings.apiKey)
      setAiModelInput(aiSettings.apiModel)
    }
  }, [visible, aiSettings])

  const handleSave = async () => {
    if (!aiKeyInput.trim()) {
      await showConfirmDialog({
        title: t('common.error', '错误'),
        message: t('settings.ai.apiKeyRequired', 'API Key 不能为空'),
        confirmText: t('common.ok', '确定'),
        cancelText: false,
        icon: 'alert-circle-outline',
        iconColor: '#FF6B6B',
      })
      return
    }

    if (!aiUrlInput.trim()) {
      await showConfirmDialog({
        title: t('common.error', '错误'),
        message: t('settings.ai.apiUrlRequired', 'API 地址不能为空'),
        confirmText: t('common.ok', '确定'),
        cancelText: false,
        icon: 'alert-circle-outline',
        iconColor: '#FF6B6B',
      })
      return
    }

    onSave({
      apiUrl: aiUrlInput.trim(),
      apiKey: aiKeyInput.trim(),
      apiModel: aiModelInput.trim() || 'Qwen/QwQ-32B',
    })

    onClose()

    await showConfirmDialog({
      title: t('common.success', '成功'),
      message: t('settings.ai.configSaved', 'AI 配置已保存'),
      confirmText: t('common.ok', '确定'),
      cancelText: false,
      icon: 'checkmark-circle-outline',
      iconColor: '#4CAF50',
    })
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={[modalStyles.overlay, { backgroundColor: colors.modalOverlay }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[modalStyles.content, { backgroundColor: colors.modalBackground }]}
        >
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: colors.textColor }]}>
              {t('settings.ai.config', 'AI 配置')}
            </Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
              <Ionicons name="close" size={24} color={colors.secondaryText} />
            </TouchableOpacity>
          </View>

          <ScrollView style={modalStyles.body}>
            <Text style={[modalStyles.description, { color: colors.secondaryText }]}>
              {t('settings.ai.description', '配置 AI 服务以启用智能功能，如词语生成、游戏提示等。')}
            </Text>

            <Text style={[modalStyles.label, { color: colors.textColor, marginTop: 16 }]}>
              {t('settings.ai.apiUrl', 'API 地址')}
            </Text>
            <TextInput
              style={[
                modalStyles.input,
                { color: colors.textColor, borderColor: colors.cardBorder },
              ]}
              value={aiUrlInput}
              onChangeText={setAiUrlInput}
              placeholder="https://api.siliconflow.cn/v1/chat/completions"
              placeholderTextColor={colors.secondaryText}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Text style={[modalStyles.label, { color: colors.textColor, marginTop: 12 }]}>
              {t('settings.ai.apiKey', 'API Key')}
            </Text>
            <TextInput
              style={[
                modalStyles.input,
                { color: colors.textColor, borderColor: colors.cardBorder },
              ]}
              value={aiKeyInput}
              onChangeText={setAiKeyInput}
              placeholder="sk-xxxxxx"
              placeholderTextColor={colors.secondaryText}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />

            <Text style={[modalStyles.label, { color: colors.textColor, marginTop: 12 }]}>
              {t('settings.ai.apiModel', 'AI 模型')}
            </Text>
            <TextInput
              style={[
                modalStyles.input,
                { color: colors.textColor, borderColor: colors.cardBorder },
              ]}
              value={aiModelInput}
              onChangeText={setAiModelInput}
              placeholder="THUDM/GLM-Z1-9B-0414"
              placeholderTextColor={colors.secondaryText}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text
              style={[
                modalStyles.description,
                { color: colors.secondaryText, marginTop: 12, fontSize: 12 },
              ]}
            >
              {t(
                'settings.ai.hint',
                '从 SiliconFlow 或其他兼容的 AI 服务提供商获取 API Key。配置后即可使用 AI 功能。',
              )}
            </Text>
          </ScrollView>

          <View style={modalStyles.footer}>
            <TouchableOpacity
              style={[
                modalStyles.button,
                modalStyles.buttonCancel,
                { borderColor: colors.cardBorder },
              ]}
              onPress={onClose}
            >
              <Text style={[modalStyles.buttonText, { color: colors.secondaryText }]}>
                {t('common.cancel', '取消')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                modalStyles.button,
                modalStyles.buttonConfirm,
                { backgroundColor: colors.accentColor },
              ]}
              onPress={handleSave}
            >
              <Text style={[modalStyles.buttonText, { color: '#fff' }]}>
                {t('common.confirm', '确认')}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}
