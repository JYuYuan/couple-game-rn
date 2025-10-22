import React from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AvatarGender } from '@/types/settings'
import { AvatarOption, AVATARS, getRandomAvatarByGender } from '@/constants/avatars'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Colors } from '@/constants/theme'
import { useTranslation } from 'react-i18next'

interface AvatarPickerProps {
  selectedGender: AvatarGender
  selectedAvatar: AvatarOption | null
  onGenderChange: (gender: AvatarGender) => void
  onAvatarChange: (avatar: AvatarOption) => void
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  selectedGender,
  selectedAvatar,
  onGenderChange,
  onAvatarChange,
}) => {
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme] as any
  const { t } = useTranslation()

  const handleGenderSelect = (gender: AvatarGender) => {
    onGenderChange(gender)
    // 自动选择该性别的随机头像
    const randomAvatar = getRandomAvatarByGender(gender)
    onAvatarChange(randomAvatar)
  }

  const handleRandomAvatar = () => {
    const randomAvatar = getRandomAvatarByGender(selectedGender)
    onAvatarChange(randomAvatar)
  }

  const currentAvatars = AVATARS[selectedGender]

  return (
    <View style={styles.container}>
      {/* 性别选择 */}
      <View style={styles.genderSection}>
        <Text style={[styles.sectionLabel, { color: colors.homeCardDescription }]}>
          {t('avatar.selectGender', '选择性别')}
        </Text>
        <View style={styles.genderButtons}>
          <TouchableOpacity
            style={[
              styles.genderButton,
              {
                backgroundColor:
                  selectedGender === 'man' ? colors.settingsAccent + '20' : colors.homeBackground,
                borderColor:
                  selectedGender === 'man' ? colors.settingsAccent : colors.homeCardBorder,
              },
            ]}
            onPress={() => handleGenderSelect('man')}
          >
            <Ionicons
              name="male"
              size={20}
              color={selectedGender === 'man' ? colors.settingsAccent : colors.homeCardDescription}
            />
            <Text
              style={[
                styles.genderText,
                {
                  color:
                    selectedGender === 'man' ? colors.settingsAccent : colors.homeCardDescription,
                },
              ]}
            >
              {t('avatar.man', '男生')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.genderButton,
              {
                backgroundColor:
                  selectedGender === 'woman' ? colors.settingsAccent + '20' : colors.homeBackground,
                borderColor:
                  selectedGender === 'woman' ? colors.settingsAccent : colors.homeCardBorder,
              },
            ]}
            onPress={() => handleGenderSelect('woman')}
          >
            <Ionicons
              name="female"
              size={20}
              color={
                selectedGender === 'woman' ? colors.settingsAccent : colors.homeCardDescription
              }
            />
            <Text
              style={[
                styles.genderText,
                {
                  color:
                    selectedGender === 'woman' ? colors.settingsAccent : colors.homeCardDescription,
                },
              ]}
            >
              {t('avatar.woman', '女生')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 头像预览和随机按钮 */}
      <View style={styles.previewSection}>
        <View style={styles.previewHeader}>
          <Text style={[styles.sectionLabel, { color: colors.homeCardDescription }]}>
            {t('avatar.yourAvatar', '你的头像')}
          </Text>
          <TouchableOpacity
            style={[styles.randomButton, { backgroundColor: colors.settingsAccent }]}
            onPress={handleRandomAvatar}
          >
            <Ionicons name="shuffle" size={14} color="white" />
            <Text style={styles.randomButtonText}>{t('avatar.random', '随机')}</Text>
          </TouchableOpacity>
        </View>

        {selectedAvatar && (
          <View
            style={[
              styles.selectedAvatarContainer,
              { backgroundColor: colors.homeBackground, borderColor: colors.settingsAccent },
            ]}
          >
            <Image source={selectedAvatar.source} style={styles.selectedAvatarImage} />
          </View>
        )}
      </View>

      {/* 头像网格选择 */}
      <View style={styles.avatarGrid}>
        {currentAvatars.map((avatar) => (
          <TouchableOpacity
            key={avatar.id}
            style={[
              styles.avatarItem,
              {
                backgroundColor: colors.homeBackground,
                borderColor:
                  selectedAvatar?.id === avatar.id ? colors.settingsAccent : colors.homeCardBorder,
                borderWidth: selectedAvatar?.id === avatar.id ? 2 : 1,
              },
            ]}
            onPress={() => onAvatarChange(avatar)}
          >
            <Image source={avatar.source} style={styles.avatarImage} />
            {selectedAvatar?.id === avatar.id && (
              <View style={[styles.selectedBadge, { backgroundColor: colors.settingsAccent }]}>
                <Ionicons name="checkmark" size={12} color="white" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  genderSection: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewSection: {
    gap: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  randomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  randomButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedAvatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  selectedAvatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  avatarItem: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  selectedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
