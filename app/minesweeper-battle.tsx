import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { usePageBase } from '@/hooks/usePageBase'
import { spacing } from '@/constants/commonStyles'
import { useGameTasks } from '@/hooks/use-game-tasks'
import MineTaskModal, { MineTaskData } from '@/components/MineTaskModal'
import VictoryModal from '@/components/VictoryModal'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { PLAYER_COLORS } from '@/types/player'
import { AvatarGender } from '@/types/settings'
import { getRandomAvatarByGender } from '@/constants/avatars'
import { getWindow } from '@/utils'

const { width: screenWidth, height: screenHeight } = getWindow()
// 扫雷游戏难度配置
const DIFFICULTY_CONFIGS = {
  easy: { rows: 9, cols: 9, mines: 10, name: '简单' },
  medium: { rows: 12, cols: 12, mines: 20, name: '中等' },
  hard: { rows: 16, cols: 16, mines: 40, name: '困难' },
}

// 格子状态
interface Cell {
  isMine: boolean
  isRevealed: boolean
  isFlagged: boolean
  neighborMines: number
  revealedBy?: number // 谁揭示的这个格子
}

// 玩家信息
interface Player {
  id: number
  name: string
  color: string
  cellsRevealed: number // 获得的格子数
  minesHit: number
  avatarId: string
  gender: AvatarGender
}

type Difficulty = keyof typeof DIFFICULTY_CONFIGS
type GameStatus = 'waiting' | 'playing' | 'finished'

export default function MinesweeperBattle() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { t, colors } = usePageBase()

  // 获取传入的参数
  const taskSetId = params.taskSetId as string
  const gameTasks = useGameTasks(taskSetId)

  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [gameStatus, setGameStatus] = useState<GameStatus>('waiting')
  const [board, setBoard] = useState<Cell[][]>([])
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [revealedCells, setRevealedCells] = useState(0)
  const [timer, setTimer] = useState(0)

  // 玩家设置
  const [players] = useState<Player[]>(() => {
    return Array.from({ length: 2 }, (_, index) => {
      // 随机分配性别：第一个玩家随机，第二个玩家随机
      const gender: AvatarGender = index % 2 === 0 ? 'man' : 'woman'
      const randomAvatar = getRandomAvatarByGender(gender)

      return {
        id: index + 1,
        name: t(`minesweeper.players.player${index + 1}`, `玩家${index + 1}`),
        color: PLAYER_COLORS[index],
        cellsRevealed: 0,
        minesHit: 0,
        avatarId: randomAvatar.id,
        gender: gender,
      }
    })
  })

  // 任务弹窗状态
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskModalData, setTaskModalData] = useState<MineTaskData | null>(null)

  // 胜利弹窗状态
  const [showVictoryModal, setShowVictoryModal] = useState(false)
  const [winner, setWinner] = useState<Player | null>(null)

  const config = DIFFICULTY_CONFIGS[difficulty]
  // 计算格子大小 - 考虑屏幕高度和布局空间
  const availableWidth = screenWidth - 40
  const availableHeight = screenHeight * 0.55 // 中央区域占55%高度
  const cellSize = Math.min(availableWidth / config.cols, availableHeight / config.rows, 32)
  const currentPlayer = players[currentPlayerIndex]

  // 进入页面时自动开始游戏
  useEffect(() => {
    if (gameStatus === 'waiting' && gameTasks.selectedTaskSet) {
      initializeBoard()
      setGameStatus('playing')
    }
  }, [gameStatus, gameTasks.selectedTaskSet])

  // 初始化游戏板
  const initializeBoard = useCallback(() => {
    const newBoard: Cell[][] = []

    // 创建空白棋盘
    for (let row = 0; row < config.rows; row++) {
      newBoard[row] = []
      for (let col = 0; col < config.cols; col++) {
        newBoard[row][col] = {
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          neighborMines: 0,
        }
      }
    }

    // 随机放置地雷
    const mines = new Set<string>()
    while (mines.size < config.mines) {
      const row = Math.floor(Math.random() * config.rows)
      const col = Math.floor(Math.random() * config.cols)
      const key = `${row}-${col}`

      if (!mines.has(key)) {
        mines.add(key)
        newBoard[row][col].isMine = true
      }
    }

    // 计算每个格子周围的地雷数量
    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.cols; col++) {
        if (!newBoard[row][col].isMine) {
          let count = 0
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const newRow = row + dr
              const newCol = col + dc
              if (
                newRow >= 0 &&
                newRow < config.rows &&
                newCol >= 0 &&
                newCol < config.cols &&
                newBoard[newRow][newCol].isMine
              ) {
                count++
              }
            }
          }
          newBoard[row][col].neighborMines = count
        }
      }
    }

    setBoard(newBoard)
    setRevealedCells(0)
    setTimer(0)

    // 重置玩家数据
    players.forEach((player) => {
      player.cellsRevealed = 0
      player.minesHit = 0
    })
  }, [config.rows, config.cols, config.mines, players])

  // 揭示格子
  const revealCell = useCallback(
    (row: number, col: number) => {
      if (gameStatus !== 'playing') return
      if (board[row][col].isRevealed || board[row][col].isFlagged) return

      const newBoard = board.map((row) => row.map((cell) => ({ ...cell })))
      newBoard[row][col].isRevealed = true
      newBoard[row][col].revealedBy = currentPlayer.id

      // 如果是地雷，触发任务
      if (newBoard[row][col].isMine) {
        setBoard(newBoard)
        triggerMineTask(row, col)
        return
      }

      // 如果周围没有地雷，自动揭示周围的格子
      if (newBoard[row][col].neighborMines === 0) {
        const queue = [[row, col]]
        const visited = new Set<string>()

        while (queue.length > 0) {
          const [currentRow, currentCol] = queue.shift()!
          const key = `${currentRow}-${currentCol}`

          if (visited.has(key)) continue
          visited.add(key)

          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const newRow = currentRow + dr
              const newCol = currentCol + dc

              if (
                newRow >= 0 &&
                newRow < config.rows &&
                newCol >= 0 &&
                newCol < config.cols &&
                !newBoard[newRow][newCol].isRevealed &&
                !newBoard[newRow][newCol].isFlagged &&
                !newBoard[newRow][newCol].isMine
              ) {
                newBoard[newRow][newCol].isRevealed = true
                newBoard[newRow][newCol].revealedBy = currentPlayer.id
                if (newBoard[newRow][newCol].neighborMines === 0) {
                  queue.push([newRow, newCol])
                }
              }
            }
          }
        }
      }

      setBoard(newBoard)

      // 计算已揭示的格子数量和每个玩家的格子数
      let newRevealedCount = 0
      const playerCellCounts = [0, 0] // 玩家1和玩家2的格子数

      for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
          if (newBoard[r][c].isRevealed && !newBoard[r][c].isMine) {
            newRevealedCount++
            if (newBoard[r][c].revealedBy === 1) {
              playerCellCounts[0]++
            } else if (newBoard[r][c].revealedBy === 2) {
              playerCellCounts[1]++
            }
          }
        }
      }

      // 更新玩家的格子数
      players[0].cellsRevealed = playerCellCounts[0]
      players[1].cellsRevealed = playerCellCounts[1]

      setRevealedCells(newRevealedCount)

      // 检查是否游戏结束（所有非地雷格子都被揭示）
      if (newRevealedCount === config.rows * config.cols - config.mines) {
        endGame()
      } else {
        // 切换到下一个玩家
        setCurrentPlayerIndex((prev) => (prev + 1) % players.length)
      }
    },
    [board, gameStatus, currentPlayer.id, config.rows, config.cols, config.mines, players.length],
  )

  // 触发踩雷任务
  const triggerMineTask = (row: number, col: number) => {
    const task = gameTasks.getRandomTask()

    if (!task) {
      console.log('任务获取失败')
      return
    }

    const taskData: MineTaskData = {
      id: task.id,
      title: task.title,
      description: task.description,
      playerName: currentPlayer.name,
      playerColor: currentPlayer.color,
      minePosition: { row, col },
    }

    setTaskModalData(taskData)
    setShowTaskModal(true)
  }

  // 处理任务完成结果
  const handleTaskComplete = (_completed: boolean) => {
    if (!taskModalData) return

    // 更新玩家踩雷数据
    const player = players.find((p) => p.id === currentPlayer.id)
    if (player) {
      player.minesHit += 1
      // 任务成功失败不影响积分，积分只看获得格子数
    }

    // 关闭弹窗
    setShowTaskModal(false)
    setTaskModalData(null)

    // 检查是否游戏结束
    setTimeout(() => {
      if (revealedCells === config.rows * config.cols - config.mines) {
        endGame()
      } else {
        // 切换到下一个玩家
        setCurrentPlayerIndex((prev) => (prev + 1) % players.length)
      }
    }, 500)
  }

  // 结束游戏
  const endGame = () => {
    setGameStatus('finished')

    // 计算获胜者：格子数多的获胜，如果格子数相同则踩雷少的获胜
    let winnerPlayer = players[0]
    for (let i = 1; i < players.length; i++) {
      const player = players[i]
      if (player.cellsRevealed > winnerPlayer.cellsRevealed) {
        winnerPlayer = player
      } else if (
        player.cellsRevealed === winnerPlayer.cellsRevealed &&
        player.minesHit < winnerPlayer.minesHit
      ) {
        winnerPlayer = player
      }
    }

    setWinner(winnerPlayer)
    setShowVictoryModal(true)
  }

  // 标记/取消标记格子
  const toggleFlag = useCallback(
    (row: number, col: number) => {
      if (gameStatus !== 'playing') return
      if (board[row][col].isRevealed) return

      const newBoard = board.map((row) => row.map((cell) => ({ ...cell })))
      newBoard[row][col].isFlagged = !newBoard[row][col].isFlagged
      setBoard(newBoard)
    },
    [board, gameStatus],
  )

  // 计时器
  useEffect(() => {
    let interval: number
    if (gameStatus === 'playing') {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [gameStatus])

  // 重新开始游戏
  const restartGame = () => {
    setGameStatus('waiting')
    setCurrentPlayerIndex(0)
    setShowVictoryModal(false)
    setWinner(null)
  }

  // 获取格子显示内容
  const getCellContent = (cell: Cell) => {
    if (cell.isFlagged) return '🚩'
    if (!cell.isRevealed) return ''
    if (cell.isMine) return '💣'
    if (cell.neighborMines === 0) return ''
    return cell.neighborMines.toString()
  }

  // 获取格子颜色
  const getCellTextColor = (neighborMines: number) => {
    const colorMap = {
      1: '#1976D2',
      2: '#388E3C',
      3: '#D32F2F',
      4: '#7B1FA2',
      5: '#F57C00',
      6: '#C2185B',
      7: '#000000',
      8: '#424242',
    }
    return colorMap[neighborMines as keyof typeof colorMap] || '#000000'
  }

  // 获取格子背景颜色
  const getCellBackgroundColor = (cell: Cell, colors: any) => {
    if (!cell.isRevealed) {
      return cell.isFlagged ? '#FFD700' + '30' : '#E3F2FD'
    }

    if (cell.isMine) {
      return '#F44336'
    }

    if (cell.revealedBy === 1) {
      return '#5E5CE6' + '15'
    } else if (cell.revealedBy === 2) {
      return '#FF6482' + '15'
    }

    return '#F5F5F5'
  }

  // 获取格子边框颜色
  const getCellBorderColor = (cell: Cell, colors: any) => {
    if (!cell.isRevealed) {
      return cell.isFlagged ? '#FFD700' : '#BDBDBD'
    }

    if (cell.isMine) {
      return '#D32F2F'
    }

    if (cell.revealedBy === 1) {
      return '#5E5CE6' + '40'
    } else if (cell.revealedBy === 2) {
      return '#FF6482' + '40'
    }

    return '#E0E0E0'
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `${gameTasks.selectedTaskSet?.name || ''}-${t('minesweeper.title', '扫雷对战')}`,
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.homeBackground,
          },
          headerTintColor: colors.homeTitle,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
          headerBackTitle: t('common.back', '返回'),
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.homeBackground }]}>
        {/* 背景渐变 */}
        <LinearGradient
          colors={[colors.homeGradientStart, colors.homeGradientMiddle, colors.homeGradientEnd]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* 顶部玩家HUD */}
        <View style={styles.playersHUD}>
          {players.map((player, index) => {
            const isCurrentPlayer = currentPlayerIndex === index
            const isLeftPlayer = index === 0

            return (
              <View
                key={player.id}
                style={[
                  styles.playerHUDCard,
                  {
                    alignItems: isLeftPlayer ? 'flex-start' : 'flex-end',
                  },
                ]}
              >
                <View
                  style={[
                    styles.playerHUDContent,
                    {
                      flexDirection: isLeftPlayer ? 'row' : 'row-reverse',
                      backgroundColor: colors.homeCardBackground + 'CC',
                      borderColor: isCurrentPlayer ? player.color : 'transparent',
                      borderWidth: isCurrentPlayer ? 3 : 0,
                    },
                  ]}
                >
                  <PlayerAvatar avatarId={player.avatarId} color={player.color} size={44} />
                  <View
                    style={[
                      styles.playerHUDInfo,
                      { alignItems: isLeftPlayer ? 'flex-start' : 'flex-end' },
                    ]}
                  >
                    <Text style={[styles.playerHUDName, { color: colors.homeCardTitle }]}>
                      {player.name}
                    </Text>
                    <View style={styles.playerHUDStats}>
                      <Text style={[styles.playerHUDStatText, { color: player.color }]}>
                        🏆 {player.cellsRevealed}
                      </Text>
                      <Text style={[styles.playerHUDStatText, { color: colors.error }]}>
                        💣 {player.minesHit}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )
          })}
        </View>

        {/* 中央游戏区 */}
        <View style={styles.gameCenterSection}>
          {gameStatus === 'waiting' ? (
            /* 难度选择 */
            <View style={styles.difficultySelectionContainer}>
              <Text style={[styles.difficultyTitle, { color: colors.homeCardTitle }]}>
                {t('minesweeper.difficulty.title', '选择难度')}
              </Text>
              <View style={styles.difficultyGrid}>
                {Object.entries(DIFFICULTY_CONFIGS).map(([key, config]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.difficultyCard,
                      {
                        backgroundColor:
                          difficulty === key
                            ? colors.success + '20'
                            : colors.homeCardBackground + 'CC',
                        borderColor: difficulty === key ? colors.success : 'transparent',
                        borderWidth: difficulty === key ? 3 : 0,
                      },
                    ]}
                    onPress={() => setDifficulty(key as Difficulty)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.difficultyCardName,
                        {
                          color: difficulty === key ? colors.success : colors.homeCardTitle,
                        },
                      ]}
                    >
                      {t(`minesweeper.difficulty.${key}`, config.name)}
                    </Text>
                    <Text
                      style={[
                        styles.difficultyCardInfo,
                        {
                          color: difficulty === key ? colors.success : colors.homeCardDescription,
                        },
                      ]}
                    >
                      {config.rows}×{config.cols}
                    </Text>
                    <Text style={[styles.difficultyCardMines, { color: colors.error }]}>
                      💣 {config.mines}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            /* 游戏板 */
            <View style={styles.gameBoardContainer}>
              <View
                style={[
                  styles.boardWrapper,
                  {
                    width: cellSize * config.cols,
                    height: cellSize * config.rows,
                    backgroundColor: colors.homeCardBackground + 'E6',
                  },
                ]}
              >
                {board.map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.boardRow}>
                    {row.map((cell, colIndex) => (
                      <TouchableOpacity
                        key={`${rowIndex}-${colIndex}`}
                        style={[
                          styles.cell,
                          {
                            width: cellSize,
                            height: cellSize,
                            backgroundColor: getCellBackgroundColor(cell, colors),
                            borderColor: getCellBorderColor(cell, colors),
                          },
                        ]}
                        onPress={() => revealCell(rowIndex, colIndex)}
                        onLongPress={() => toggleFlag(rowIndex, colIndex)}
                        delayLongPress={200}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.cellText,
                            {
                              fontSize: cellSize * 0.5,
                              color:
                                cell.isRevealed && !cell.isMine
                                  ? getCellTextColor(cell.neighborMines)
                                  : '#000000',
                            },
                          ]}
                        >
                          {getCellContent(cell)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* 底部状态栏 */}
        <View style={styles.bottomStatusBar}>
          <View
            style={[styles.statusBarContent, { backgroundColor: colors.homeCardBackground + 'CC' }]}
          >
            {gameStatus === 'playing' ? (
              <>
                {/* 左侧：当前玩家指示 */}
                <View style={styles.statusLeft}>
                  <View style={[styles.turnIndicator, { backgroundColor: currentPlayer.color }]} />
                  <Text style={[styles.turnText, { color: colors.homeCardTitle }]}>
                    {currentPlayer.name}
                  </Text>
                </View>

                {/* 中间：进度 */}
                <View style={styles.statusCenter}>
                  <Text style={[styles.progressText, { color: colors.homeCardDescription }]}>
                    {revealedCells}/{config.rows * config.cols - config.mines}
                  </Text>
                </View>

                {/* 右侧：计时器 */}
                <View style={styles.statusRight}>
                  <Ionicons name="time-outline" size={16} color={colors.homeCardDescription} />
                  <Text style={[styles.timerText, { color: colors.homeCardDescription }]}>
                    {formatTime(timer)}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={[styles.statusText, { color: colors.homeCardTitle }]}>
                {t('minesweeper.status.selectDifficulty', '选择难度开始游戏')}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* 踩雷任务弹窗 */}
      <MineTaskModal
        visible={showTaskModal}
        task={taskModalData}
        onComplete={handleTaskComplete}
        onClose={() => setShowTaskModal(false)}
      />

      {/* 胜利弹窗 */}
      <VictoryModal
        visible={showVictoryModal}
        winner={
          winner
            ? ({
                ...winner,
                position: 0, // 扫雷游戏不需要位置，设为默认值
                iconType: 1, // 设置默认 iconType
              } as any)
            : null
        }
        isWinner={true}
        onRestart={() => {
          setShowVictoryModal(false)
          restartGame()
        }}
        onExit={() => {
          setShowVictoryModal(false)
          router.back()
        }}
        onClose={() => setShowVictoryModal(false)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // 顶部玩家HUD
  playersHUD: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  playerHUDCard: {
    flex: 1,
  },
  playerHUDContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 16,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  playerHUDInfo: {
    flex: 1,
    gap: 4,
  },
  playerHUDName: {
    fontSize: 14,
    fontWeight: '600',
  },
  playerHUDStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  playerHUDStatText: {
    fontSize: 14,
    fontWeight: '700',
  },
  // 中央游戏区
  gameCenterSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  // 难度选择
  difficultySelectionContainer: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  difficultyTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  difficultyGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  difficultyCard: {
    width: 100,
    height: 120,
    padding: spacing.md,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  difficultyCardName: {
    fontSize: 18,
    fontWeight: '700',
  },
  difficultyCardInfo: {
    fontSize: 14,
    fontWeight: '600',
  },
  difficultyCardMines: {
    fontSize: 12,
    fontWeight: '600',
  },
  // 游戏板
  gameBoardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  boardRow: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#FFFFFF',
  },
  cellText: {
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  // 底部状态栏
  bottomStatusBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  statusBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  turnIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  turnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  statusCenter: {
    flex: 1,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    justifyContent: 'flex-end',
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
})
