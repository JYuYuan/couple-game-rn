import React, { useState } from 'react'
import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { showConfirmDialog } from '@/components/ConfirmDialog'
import { modalStyles } from './modalStyles'
import type { TFunction } from 'i18next'

interface SocketUrlModalProps {
  visible: boolean
  currentUrl: string
  colors: {
    modalOverlay: string
    modalBackground: string
    textColor: string
    secondaryText: string
    cardBorder: string
    accentColor: string
  }
  onClose: () => void
  onSave: (url: string) => void
  t: TFunction
}

export function SocketUrlModal({
  visible,
  currentUrl,
  colors,
  onClose,
  onSave,
  t,
}: SocketUrlModalProps) {
  const [urlInput, setUrlInput] = useState(currentUrl)

  React.useEffect(() => {
    if (visible) {
      setUrlInput(currentUrl)
    }
  }, [visible, currentUrl])

  const handleSave = async () => {
    onSave(urlInput)
    onClose()

    await showConfirmDialog({
      title: t('common.success', '成功'),
      message: t('settings.network.socketUrlSaved', 'Socket 地址已保存'),
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
              {t('settings.network.socketUrl', 'Socket 地址')}
            </Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
              <Ionicons name="close" size={24} color={colors.secondaryText} />
            </TouchableOpacity>
          </View>

          <View style={modalStyles.body}>
            <Text style={[modalStyles.description, { color: colors.secondaryText }]}>
              {t(
                'settings.network.socketUrlDescription',
                '请输入 Socket 服务器地址（例如: http://192.168.1.100:8871）',
              )}
            </Text>
            <TextInput
              style={[
                modalStyles.input,
                { color: colors.textColor, borderColor: colors.cardBorder },
              ]}
              value={urlInput}
              onChangeText={setUrlInput}
              placeholder="http://localhost:3001"
              placeholderTextColor={colors.secondaryText}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          <View style={modalStyles.footer}>
            <TouchableOpacity
              style={[modalStyles.button, modalStyles.buttonCancel, { borderColor: colors.cardBorder }]}
              onPress={onClose}
            >
              <Text style={[modalStyles.buttonText, { color: colors.secondaryText }]}>
                {t('common.cancel', '取消')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.button, modalStyles.buttonConfirm, { backgroundColor: colors.accentColor }]}
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
