import React from 'react'
import Avatar from '@/components/icons/Avatar'

export type PlayerIconType = 'airplane' | 'helicopter' | 'rocket' | 'ufo'

interface PlayerIconProps {
  type: PlayerIconType
  size?: number
  color?: string
}

// 生成100-1000之间的随机seed
function generateRandomSeed() {
  // 生成100到1000之间的随机整数
  return Math.floor(Math.random() * 901) + 100
}

export const PlayerIcon: React.FC<PlayerIconProps> = () => {
  return <Avatar seed={generateRandomSeed()} style="random" />
}

// 导出所有图标类型
