import React from 'react'
import { StyleSheet, View } from 'react-native'
import { PlayerIcon } from './icons'

interface PlayerAvatarProps {
  see: number
  color: string
  size?: number
  backgroundColor?: string
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  see,
  color,
  size = 40,
  backgroundColor,
}) => {
  const iconSize = size * 0.6 // SVG图标占头像的60%

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: backgroundColor || color,
        },
      ]}
    >
      <PlayerIcon see={see} />
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
})
