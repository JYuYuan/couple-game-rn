import React, { useEffect, useState } from 'react'
import { Dimensions, Platform, StyleSheet, TouchableOpacity, View } from 'react-native'
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { createBoardPath } from '@/utils/board'
import { PathCell, Player } from '@/types/game'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Colors } from '@/constants/theme'
import { PlayerIcon } from './icons'

const BOARD_SIZE = 7
const { width: screenWidth } = Dimensions.get('window')
const BOARD_PADDING = 20
const BOARD_WIDTH = screenWidth - BOARD_PADDING * 2
const CELL_SIZE = (BOARD_WIDTH / BOARD_SIZE) * 0.8

interface GameBoardProps {
  players: Player[]
  currentPlayer: number
  boardData?: PathCell[]
  onCellPress?: (cell: PathCell) => void
}

interface CellComponentProps {
  cell: PathCell
  players: Player[]
  currentPlayer: number
  isHighlighted?: boolean
  onPress?: () => void
}

const CellComponent: React.FC<CellComponentProps> = ({
  cell,
  players,
  currentPlayer,
  isHighlighted = false,
  onPress,
}) => {
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme] as any

  const scale = useSharedValue(1)
  const glowAnimation = useSharedValue(0)

  useEffect(() => {
    if (isHighlighted) {
      glowAnimation.value = withRepeat(
        withSequence(withTiming(1, { duration: 800 }), withTiming(0, { duration: 800 })),
        -1,
      )
    } else {
      glowAnimation.value = withTiming(0, { duration: 400 })
    }
  }, [isHighlighted])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowAnimation.value, [0, 1], [0, 0.8]),
    transform: [{ scale: interpolate(glowAnimation.value, [0, 1], [1, 1.1]) }],
  }))

  const handlePress = () => {
    scale.value = withSequence(withSpring(0.9, { duration: 100 }), withSpring(1, { duration: 200 }))
    if (onPress) {
      runOnJS(onPress)()
    }
  }

  const getCellColors = () => {
    switch (cell.type) {
      case 'start':
        return ['#52c41a', '#73d13d', '#95de64']
      case 'end':
        return ['#ff4d4f', '#ff7875', '#ffa39e']
      case 'star':
        return ['#faad14', '#ffc53d', '#ffd666']
      case 'trap':
        return ['#722ed1', '#9254de', '#b37feb']
      default:
        // 根据主题模式返回不同的颜色
        return colorScheme === 'dark'
          ? ['#404040', '#363636', '#2a2a2a']
          : ['#f0f0f0', '#e8e8e8', '#d9d9d9']
    }
  }

  const getCellIcon = () => {
    switch (cell.type) {
      case 'start':
        return 'play-circle'
      case 'end':
        return 'trophy'
      case 'star':
        return 'star'
      case 'trap':
        return 'nuclear'
      default:
        return null
    }
  }

  const getIconColor = () => {
    if (cell.type === 'path') {
      return colorScheme === 'dark' ? '#cccccc' : '#666666'
    }
    return 'white'
  }

  // 获取当前格子上的玩家，如果有多个玩家，只显示当前玩家
  const playersOnCell = players.filter((player) => player.position === cell.id)
  const displayPlayers =
    playersOnCell.length > 1
      ? playersOnCell.filter(
          (_, index) =>
            players.findIndex((p) => p.id === playersOnCell[index].id) === currentPlayer,
        )
      : playersOnCell

  return (
    <TouchableOpacity
      style={[
        styles.cell,
        {
          left: cell.x * (BOARD_WIDTH / BOARD_SIZE) + (BOARD_WIDTH / BOARD_SIZE - CELL_SIZE) / 2,
          top: cell.y * (BOARD_WIDTH / BOARD_SIZE) + (BOARD_WIDTH / BOARD_SIZE - CELL_SIZE) / 2,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* 高亮效果 */}
      {isHighlighted && (
        <Animated.View style={[styles.cellGlow, glowStyle]}>
          <LinearGradient
            colors={['rgba(94, 92, 230, 0.5)', 'rgba(191, 90, 242, 0.5)']}
            style={styles.cellGlowGradient}
          />
        </Animated.View>
      )}

      {/* 格子背景 */}
      <Animated.View style={[styles.cellContent, animatedStyle]}>
        <LinearGradient
          colors={getCellColors() as any}
          style={styles.cellGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* 格子图标 */}
          {getCellIcon() && (
            <Ionicons name={getCellIcon() as any} size={14} color={getIconColor()} />
          )}

          {/* 玩家棋子 */}
          {displayPlayers.length > 0 && (
            <View style={styles.playersContainer}>
              {displayPlayers.map((player, index) => (
                <PlayerPiece
                  key={player.id}
                  player={player}
                  index={index}
                  total={displayPlayers.length}
                />
              ))}
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  )
}

interface PlayerPieceProps {
  player: Player
  index: number
  total: number
}

const PlayerPiece: React.FC<PlayerPieceProps> = ({ player, index, total }) => {
  const bounceAnimation = useSharedValue(0)
  const glowAnimation = useSharedValue(0)

  useEffect(() => {
    // 弹跳动画
    bounceAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200 + index * 300 }),
        withTiming(0, { duration: 1200 + index * 300 }),
      ),
      -1,
    )

    // 发光动画
    glowAnimation.value = withRepeat(
      withSequence(withTiming(1, { duration: 800 }), withTiming(0.3, { duration: 800 })),
      -1,
    )
  }, [index])

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(bounceAnimation.value, [0, 1], [0, -3]) },
      { scale: interpolate(bounceAnimation.value, [0, 1], [1, 1.05]) },
    ],
  }))

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowAnimation.value,
    transform: [{ scale: interpolate(glowAnimation.value, [0, 1], [1, 1.1]) }],
  }))

  const getPosition = (): any => {
    if (total === 1) {
      // 单个玩家时填满整个格子
      return {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }
    }
    if (total === 2) {
      // 两个玩家时各占一半
      return index === 0
        ? { position: 'absolute' as const, top: 0, left: 0, right: 0, height: '50%' }
        : { position: 'absolute' as const, bottom: 0, left: 0, right: 0, height: '50%' }
    }
    // 更多玩家的布局
    const positions = [
      { position: 'absolute' as const, top: 0, left: 0, width: '50%', height: '50%' },
      { position: 'absolute' as const, top: 0, right: 0, width: '50%', height: '50%' },
      { position: 'absolute' as const, bottom: 0, left: 0, width: '50%', height: '50%' },
      { position: 'absolute' as const, bottom: 0, right: 0, width: '50%', height: '50%' },
    ]
    return (
      positions[index] || {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }
    )
  }

  return (
    <Animated.View style={[styles.playerPiece, bounceStyle, getPosition()]}>
      {/* 发光背景 */}
      <Animated.View
        style={[styles.playerGlow, glowStyle, { backgroundColor: player.color + '40' }]}
      />

      <View
        style={[
          styles.playerPieceInner,
          {
            backgroundColor: player.color,
            borderWidth: 1,
            borderColor: 'white',
            shadowColor: player.color,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.6,
            shadowRadius: 2,
            elevation: 4,
          },
        ]}
      >
        <PlayerIcon
          type={(player.iconType as any) || (player.id === 1 ? 'airplane' : 'helicopter')}
          size={CELL_SIZE * 0.4}
          color="white"
        />
      </View>
    </Animated.View>
  )
}

const GameBoard: React.FC<GameBoardProps> = ({
  players,
  currentPlayer,
  boardData,
  onCellPress,
}) => {
  const [board, setBoard] = useState<PathCell[]>([])
  const colorScheme = useColorScheme() ?? 'light'
  useEffect(() => {
    if (boardData) {
      setBoard(boardData)
    } else {
      const newBoard = createBoardPath()
      setBoard(newBoard)
    }
  }, [boardData])

  const handleCellPress = (cell: PathCell) => {
    if (onCellPress) {
      onCellPress(cell)
    }
  }

  return (
    <View style={styles.boardContainer}>
      {/* 棋盘阴影层 */}
      <View
        style={[
          {
            backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)',
          },
        ]}
      />

      {/* 棋盘背景层 */}

      <View style={styles.board}>
        {/* 连接线 */}
        {board.map((cell, index) => {
          if (index === board.length - 1 || !cell.direction) return null
          return (
            <ConnectionLine
              key={`line-${cell.id}`}
              from={cell}
              to={board[index + 1]}
              direction={cell.direction}
            />
          )
        })}

        {/* 格子 */}
        {board.map((cell) => (
          <CellComponent
            key={cell.id}
            cell={cell}
            players={players}
            currentPlayer={currentPlayer}
            isHighlighted={false}
            onPress={() => handleCellPress(cell)}
          />
        ))}
      </View>
    </View>
  )
}

interface ConnectionLineProps {
  from: PathCell
  to: PathCell
  direction: 'right' | 'down' | 'left' | 'up'
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({ from, to, direction }) => {
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme] as any

  const getLineStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      backgroundColor: colorScheme === 'dark' ? colors.homeCardBorder : colors.homeCardBorder,
      opacity: colorScheme === 'dark' ? 0.3 : 0.5,
    }

    const gridCellSize = BOARD_WIDTH / BOARD_SIZE
    const cellCenter = gridCellSize / 2
    const lineThickness = 2

    // 计算格子在网格中的实际位置
    const fromX = from.x * gridCellSize + cellCenter
    const fromY = from.y * gridCellSize + cellCenter

    switch (direction) {
      case 'right':
        return {
          ...baseStyle,
          left: fromX,
          top: fromY - lineThickness / 2,
          width: gridCellSize,
          height: lineThickness,
        }
      case 'down':
        return {
          ...baseStyle,
          left: fromX - lineThickness / 2,
          top: fromY,
          width: lineThickness,
          height: gridCellSize,
        }
      case 'left':
        return {
          ...baseStyle,
          left: to.x * gridCellSize + cellCenter,
          top: fromY - lineThickness / 2,
          width: gridCellSize,
          height: lineThickness,
        }
      case 'up':
        return {
          ...baseStyle,
          left: fromX - lineThickness / 2,
          top: to.y * gridCellSize + cellCenter,
          width: lineThickness,
          height: gridCellSize,
        }
      default:
        return baseStyle
    }
  }

  return <View style={getLineStyle()} />
}

const styles = StyleSheet.create({
  boardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: BOARD_PADDING,
  },
  board: {
    width: BOARD_WIDTH,
    height: BOARD_WIDTH,
    position: 'relative',
  },
  cell: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
    padding: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  cellGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 50,
    overflow: 'hidden',
    zIndex: 0,
  },
  cellGlowGradient: {
    flex: 1,
    borderRadius: 50,
  },
  cellContent: {
    flex: 1,
    borderRadius: 50,
    overflow: 'hidden',
    zIndex: 1,
  },
  cellGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  cellNumber: {
    fontSize: 10,
    fontWeight: '600',
    position: 'absolute',
    top: 2,
    left: 2,
  },
  cellIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  playersContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  playerPiece: {
    borderRadius: 50,
    zIndex: 10,
  },
  playerGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 50,
    zIndex: 9,
  },
  playerPieceInner: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 11,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
})

export default GameBoard
