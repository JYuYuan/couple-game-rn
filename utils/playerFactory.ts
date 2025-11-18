/**
 * 玩家工厂函数 - 统一的玩家初始化逻辑
 *
 * 此文件用于消除玩家初始化代码的重复，提供统一的玩家创建接口
 */

import { LocalPlayer, PLAYER_COLORS } from '@/types/player'
import { AvatarGender } from '@/types/settings'
import { getRandomAvatarByGender } from '@/constants/avatars'

/**
 * 玩家初始化配置
 */
export interface PlayerInitConfig {
  /** 玩家数量 */
  count: number
  /** 玩家名称列表（可选） */
  playerNames?: string[]
  /** 游戏类型（用于特殊字段） */
  gameType?: 'flying' | 'wheel' | 'minesweeper' | 'draw-guess'
  /** 性别分配策略（默认交替：man/woman/man/woman...） */
  genderStrategy?: 'alternate' | 'random' | AvatarGender[]
}

/**
 * 扫雷游戏特有的玩家接口
 */
export interface MinesweeperPlayer {
  id: number
  name: string
  color: string
  cellsRevealed: number
  minesHit: number
  avatarId: string
  gender: AvatarGender
}

/**
 * 分配玩家性别
 */
function assignGender(index: number, strategy: PlayerInitConfig['genderStrategy']): AvatarGender {
  if (!strategy || strategy === 'alternate') {
    return index % 2 === 0 ? 'man' : 'woman'
  }

  if (strategy === 'random') {
    return Math.random() > 0.5 ? 'man' : 'woman'
  }

  // 使用自定义性别数组
  return strategy[index] || 'man'
}

/**
 * 创建本地游戏玩家（飞行棋、转盘等）
 *
 * @param config - 玩家初始化配置
 * @returns 玩家数组
 *
 * @example
 * // 创建飞行棋玩家
 * const players = createLocalPlayers({
 *   count: 2,
 *   playerNames: ['玩家1', '玩家2'],
 *   gameType: 'flying'
 * })
 *
 * @example
 * // 创建转盘游戏玩家
 * const players = createLocalPlayers({
 *   count: 2,
 *   playerNames: getPlayerNames(),
 *   gameType: 'wheel'
 * })
 */
export function createLocalPlayers(config: PlayerInitConfig): LocalPlayer[] {
  const { count, playerNames = [], genderStrategy = 'alternate' } = config

  return Array.from({ length: count }, (_, index) => {
    const gender = assignGender(index, genderStrategy)
    const randomAvatar = getRandomAvatarByGender(gender)

    return {
      id: `${index + 1}`,
      name: playerNames[index] || `玩家${index + 1}`,
      color: PLAYER_COLORS[index] || PLAYER_COLORS[0],
      position: 0,
      score: 0,
      completedTasks: [],
      achievements: [],
      avatarId: randomAvatar.id,
      gender: gender,
      isAI: false,
    }
  })
}

/**
 * 创建扫雷游戏玩家
 *
 * @param config - 玩家初始化配置
 * @returns 扫雷玩家数组
 *
 * @example
 * const players = createMinesweeperPlayers({
 *   count: 2,
 *   playerNames: ['玩家1', '玩家2']
 * })
 */
export function createMinesweeperPlayers(config: PlayerInitConfig): MinesweeperPlayer[] {
  const { count, playerNames = [], genderStrategy = 'alternate' } = config

  return Array.from({ length: count }, (_, index) => {
    const gender = assignGender(index, genderStrategy)
    const randomAvatar = getRandomAvatarByGender(gender)

    return {
      id: index + 1,
      name: playerNames[index] || `玩家${index + 1}`,
      color: PLAYER_COLORS[index] || PLAYER_COLORS[0],
      cellsRevealed: 0,
      minesHit: 0,
      avatarId: randomAvatar.id,
      gender: gender,
    }
  })
}

/**
 * 通用玩家创建函数（根据游戏类型自动选择）
 *
 * @param config - 玩家初始化配置
 * @returns 玩家数组
 */
export function createPlayers(config: PlayerInitConfig): LocalPlayer[] | MinesweeperPlayer[] {
  const { gameType } = config

  if (gameType === 'minesweeper') {
    return createMinesweeperPlayers(config)
  }

  // 飞行棋和转盘使用相同的LocalPlayer类型
  return createLocalPlayers(config)
}

/**
 * 重置玩家游戏数据（保留基本信息）
 *
 * @param players - 玩家数组
 * @param resetAvatar - 是否重新随机头像（默认false）
 * @returns 重置后的玩家数组
 */
export function resetPlayerGameData<T extends LocalPlayer | MinesweeperPlayer>(
  players: T[],
  resetAvatar: boolean = false,
): T[] {
  return players.map((player) => {
    const baseReset = {
      ...player,
    }

    // 重新随机头像
    if (resetAvatar) {
      const randomAvatar = getRandomAvatarByGender(player.gender)
      baseReset.avatarId = randomAvatar.id
    }

    // 根据玩家类型重置不同的字段
    if ('position' in player) {
      // LocalPlayer类型
      return {
        ...baseReset,
        position: 0,
        score: 0,
        completedTasks: [],
        achievements: [],
      } as T
    } else {
      // MinesweeperPlayer类型
      return {
        ...baseReset,
        cellsRevealed: 0,
        minesHit: 0,
      } as T
    }
  })
}
