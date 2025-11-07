import React from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { AvatarPicker } from '@/components/AvatarPicker'
import { spacing } from '@/constants/commonStyles'
import { AvatarGender } from '@/types/settings'
import { AvatarOption } from '@/constants/avatars'

interface PlayerInfoSectionProps {
  playerName: string
  setPlayerName: (name: string) => void
  selectedGender: AvatarGender
  setSelectedGender: (gender: AvatarGender) => void
  selectedAvatar: AvatarOption | null
  setSelectedAvatar: (avatar: AvatarOption | null) => void
  colors: any
  t: (key: string, fallback: string) => string
}

/**
 * 玩家信息输入组件
 * 包括头像选择和玩家名称输入
 */
export default function PlayerInfoSection({
  playerName,
  setPlayerName,
  selectedGender,
  setSelectedGender,
  selectedAvatar,
  setSelectedAvatar,
  colors,
  t,
}: PlayerInfoSectionProps) {
  return (
    <>
      {/* 头像选择 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.homeCardTitle }]}>
          {t('joinRoom.selectAvatar', '选择头像')}
        </Text>
        <AvatarPicker
          selectedGender={selectedGender}
          selectedAvatar={selectedAvatar}
          onGenderChange={setSelectedGender}
          onAvatarChange={setSelectedAvatar}
        />
      </View>

      {/* 玩家名称 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.homeCardTitle }]}>
          {t('joinRoom.playerName', '玩家名称')}
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.settingsCardBackground,
              borderColor: colors.homeCardBorder,
              color: colors.homeCardTitle,
            },
          ]}
          value={playerName}
          onChangeText={setPlayerName}
          placeholder={t('joinRoom.playerNamePlaceholder', '请输入你的名称')}
          placeholderTextColor={colors.homeCardDescription}
          maxLength={20}
        />
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
})
