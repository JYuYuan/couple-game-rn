/**
 * join-room 共享类型定义
 */

import { AvatarGender } from '@/types/settings'
import { AvatarOption } from '@/constants/avatars'

// Tab 类型定义
export type LANTabType = 'scan' | 'manual'
export type OnlineTabType = 'browse' | 'code'

// 玩家信息接口
export interface PlayerInfo {
  playerName: string
  selectedAvatar: AvatarOption | null
  selectedGender: AvatarGender
}
