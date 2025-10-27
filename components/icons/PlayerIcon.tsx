import React, { useMemo } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { AVATARS } from '@/constants/avatars'
import { AvatarGender } from '@/types/settings'

interface PlayerIconProps {
  avatarId?: string
  gender?: AvatarGender
  size?: number
}

export const PlayerIcon: React.FC<PlayerIconProps> = ({ avatarId, gender = 'man', size = 40 }) => {
  const avatarSource = useMemo(() => {
    // 如果有 avatarId，尝试匹配
    if (avatarId) {
      // 先在指定性别中查找
      const avatars = AVATARS[gender]
      const matchedAvatar = avatars.find((a) => a.id === avatarId)
      if (matchedAvatar) {
        return matchedAvatar.source
      }

      // 如果在指定性别中没找到，尝试在另一个性别中查找
      const otherGender: AvatarGender = gender === 'man' ? 'woman' : 'man'
      const otherAvatars = AVATARS[otherGender]
      const otherMatchedAvatar = otherAvatars.find((a) => a.id === avatarId)
      if (otherMatchedAvatar) {
        return otherMatchedAvatar.source
      }
    }

    // 如果没有匹配成功，随机选择一个
    const avatars = AVATARS[gender]
    const randomIndex = Math.floor(Math.random() * avatars.length)
    return avatars[randomIndex].source
  }, [avatarId, gender])

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image source={avatarSource} style={styles.avatar} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
})

// 导出所有图标类型
