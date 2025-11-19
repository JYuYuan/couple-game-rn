import React, { useState } from 'react'
import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { showConfirmDialog } from '@/components/ConfirmDialog'
import { modalStyles } from './modalStyles'
import type { TFunction } from 'i18next'

interface LanConfigModalProps {
  visible: boolean
  currentPort: number
  localIP: string | undefined
  colors: {
    modalOverlay: string
    modalBackground: string
    textColor: string
    secondaryText: string
    cardBorder: string
    accentColor: string
  }
  onClose: () => void
  onSave: (port: number, ip: string) => void
  t: TFunction
}

export function LanConfigModal({
  visible,
  currentPort,
  localIP,
  colors,
  onClose,
  onSave,
  t,
}: LanConfigModalProps) {
  const [portInput, setPortInput] = useState(currentPort.toString())

  React.useEffect(() => {
    if (visible) {
      setPortInput(currentPort.toString())
    }
  }, [visible, currentPort])

  const handleSave = async () => {
    const port = parseInt(portInput, 10)

    if (isNaN(port) || port < 1024 || port > 65535) {
      await showConfirmDialog({
        title: t('common.error', '错误'),
        message: t('settings.lan.invalidPort', '端口号必须在 1024-65535 之间'),
        confirmText: t('common.ok', '确定'),
        cancelText: false,
        icon: 'alert-circle-outline',
        iconColor: '#FF6B6B',
      })
      return
    }

    onSave(port, localIP || '')
    onClose()

    await showConfirmDialog({
      title: t('common.success', '成功'),
      message: t('settings.lan.portSaved', '局域网端口已保存'),
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
              {t('settings.lan.port', '局域网端口')}
            </Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
              <Ionicons name="close" size={24} color={colors.secondaryText} />
            </TouchableOpacity>
          </View>

          <View style={modalStyles.body}>
            <Text style={[modalStyles.description, { color: colors.secondaryText }]}>
              {t(
                'settings.lan.portDescription',
                '设置局域网服务端口。其他玩家可以使用本机IP和此端口连接到您的房间。',
              )}
            </Text>

            <Text style={[modalStyles.label, { color: colors.textColor, marginTop: 16 }]}>
              {t('settings.lan.port', '端口号')}
            </Text>
            <TextInput
              style={[
                modalStyles.input,
                { color: colors.textColor, borderColor: colors.cardBorder },
              ]}
              value={portInput}
              onChangeText={setPortInput}
              placeholder="8080"
              placeholderTextColor={colors.secondaryText}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="number-pad"
            />

            <Text
              style={[
                modalStyles.description,
                { color: colors.secondaryText, marginTop: 12, fontSize: 12 },
              ]}
            >
              {t(
                'settings.lan.portHint',
                '端口范围：1024-65535。创建房间时，系统会使用此端口启动服务。',
              )}
            </Text>
          </View>

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
