import React from 'react'
import { Modal, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { modalStyles } from './modalStyles'
import type { TFunction } from 'i18next'
import type { ThemeMode } from '@/types/settings'

interface ThemeModalProps {
  visible: boolean
  currentTheme: ThemeMode
  colors: {
    modalOverlay: string
    modalBackground: string
    textColor: string
    secondaryText: string
    accentColor: string
    modalSelected: string
  }
  onClose: () => void
  onSelect: (theme: ThemeMode) => void
  getThemeDisplay: (theme: ThemeMode) => string
  t: TFunction
}

export function ThemeModal({
  visible,
  currentTheme,
  colors,
  onClose,
  onSelect,
  getThemeDisplay,
  t,
}: ThemeModalProps) {
  const themes: ThemeMode[] = ['system', 'light', 'dark']

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={[modalStyles.overlay, { backgroundColor: colors.modalOverlay }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[modalStyles.content, { backgroundColor: colors.modalBackground }]}>
          <View style={modalStyles.header}>
            <Text style={[modalStyles.title, { color: colors.textColor }]}>
              {t('settings.theme.modalTitle', '选择主题')}
            </Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
              <Ionicons name="close" size={24} color={colors.secondaryText} />
            </TouchableOpacity>
          </View>

          {themes.map((theme) => (
            <TouchableOpacity
              key={theme}
              style={[
                modalStyles.option,
                currentTheme === theme && { backgroundColor: colors.modalSelected },
              ]}
              onPress={() => onSelect(theme)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  modalStyles.optionText,
                  { color: colors.textColor },
                  currentTheme === theme && { color: colors.accentColor, fontWeight: '600' },
                ]}
              >
                {getThemeDisplay(theme)}
              </Text>
              {currentTheme === theme && (
                <Ionicons name="checkmark" size={20} color={colors.accentColor} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  )
}
