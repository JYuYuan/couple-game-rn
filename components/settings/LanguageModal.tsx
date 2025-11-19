import React from 'react'
import { Modal, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { modalStyles } from './modalStyles'
import type { TFunction } from 'i18next'
import type { LanguageMode } from '@/types/settings'

interface LanguageModalProps {
  visible: boolean
  currentLanguage: LanguageMode
  colors: {
    modalOverlay: string
    modalBackground: string
    textColor: string
    secondaryText: string
    accentColor: string
    modalSelected: string
  }
  onClose: () => void
  onSelect: (lang: LanguageMode) => void
  getLanguageDisplay: (lang: LanguageMode) => string
  t: TFunction
}

export function LanguageModal({
  visible,
  currentLanguage,
  colors,
  onClose,
  onSelect,
  getLanguageDisplay,
  t,
}: LanguageModalProps) {
  const languages: LanguageMode[] = ['zh', 'en', 'ja']

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
              {t('settings.language.modalTitle', '选择语言')}
            </Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
              <Ionicons name="close" size={24} color={colors.secondaryText} />
            </TouchableOpacity>
          </View>

          {languages.map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[
                modalStyles.option,
                currentLanguage === lang && { backgroundColor: colors.modalSelected },
              ]}
              onPress={() => onSelect(lang)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  modalStyles.optionText,
                  { color: colors.textColor },
                  currentLanguage === lang && { color: colors.accentColor, fontWeight: '600' },
                ]}
              >
                {getLanguageDisplay(lang)}
              </Text>
              {currentLanguage === lang && (
                <Ionicons name="checkmark" size={20} color={colors.accentColor} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  )
}
