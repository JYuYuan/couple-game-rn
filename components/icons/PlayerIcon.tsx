import React from 'react'
import Avatar from '@/components/icons/Avatar'

export type PlayerIconType = 'airplane' | 'helicopter' | 'rocket' | 'ufo'

export const PlayerIcon: React.FC<{ see: number }> = ({ see = 1 }) => {
  return <Avatar seed={see * 100 + see} style="random" />
}

// 导出所有图标类型
