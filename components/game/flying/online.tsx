import React, { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Colors } from '@/constants/theme'
import GameBoard from '@/components/GameBoard'
import TaskModal, { TaskModalData } from '@/components/TaskModal'
import VictoryModal from '@/components/VictoryModal'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { RoomWaiting } from '@/components/RoomWaiting'
import { GamePlayer } from '@/hooks/use-game-players'
import { useAudioManager } from '@/hooks/use-audio-manager'
import { useOnlineGame } from '@/hooks/use-online-game'
import { useTranslation } from 'react-i18next'
import { OnlinePlayer } from '@/types/online'
import LoadingScreen from '@/components/LoadingScreen'

export default function FlyingChessGame() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme] as any
  const { t } = useTranslation()

  // 获取传入的参数
  const roomId = params.roomId as string

  const onlineGameHook = useOnlineGame()

  const audioManager = useAudioManager()

  const taskSet = useMemo(() => {
    return onlineGameHook.taskSet
  }, [onlineGameHook.taskSet])

  const room = useMemo(() => {
    return onlineGameHook.room
  }, [onlineGameHook.room])

  const players = useMemo(() => {
    return onlineGameHook.players
  }, [onlineGameHook.players])

  // 游戏状态
  const [diceValue, setDiceValue] = useState(0)
  const [isRolling, setIsRolling] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskModalData, setTaskModalData] = useState<TaskModalData | null>(null)
  const [pendingTaskType, setPendingTaskType] = useState<'trap' | 'star' | 'collision' | null>(null)

  // 胜利弹窗状态
  const [showVictoryModal, setShowVictoryModal] = useState(false)
  const [winner, setWinner] = useState<GamePlayer | null>(null)

  const boardPath = useMemo(() => {
    return onlineGameHook.boardPath
  }, [onlineGameHook.boardPath])

  // 动画值
  const diceRotation = useSharedValue(0)

  // 处理胜利
  const handleVictory = async (victoryPlayer: GamePlayer) => {}

  // 检查格子类型并触发任务
  const checkCellAndTriggerTask = (playerId: number, position: number) => {}

  // 触发任务弹窗
  const triggerTask = (taskType: 'trap' | 'star' | 'collision', triggerPlayerId: number) => {}

  // 处理任务完成结果（统一处理线上线下）
  const handleTaskComplete = (completed: boolean) => {}

  // 任务完成后的回调处理（统一处理线上线下）
  const handleTaskCompleteCallback = (playerId: number, finalPosition: number) => {}

  const rollDice = async () => {}

  // 统一的玩家移动处理函数
  const handlePlayerMove = (steps: number) => {}

  const handleResetGame = () => {}

  // 任务奖惩逐步移动
  const movePlayerByTaskReward = (
    playerId: number,
    steps: number,
    isForward: boolean,
    onComplete?: (playerId: number, finalPosition: number) => void,
  ) => {}

  const movePlayerStepByStep = (
    playerIndex: number,
    steps: number,
    onComplete?: (playerId: number, finalPosition: number) => void,
  ) => {}

  const diceAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${diceRotation.value}deg` }],
  }))

  if (!room) return <LoadingScreen />
  console.log(room)
  return (
    <>
      <Stack.Screen
        options={{
          title: `${taskSet?.name || ''}-${t('flyingChess.title', '飞行棋')}(${t('online.mode', '在线模式')})`,
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.homeBackground,
          },
          headerTintColor: colors.homeTitle,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
          headerBackTitle: t('flyingChess.headerBackTitle', '返回'),
        }}
      />

      {/* 根据模式渲染不同内容 */}
      {
        // 在线模式：等待玩家 或 游戏界面
        onlineGameHook.isWaitingForPlayers ? (
          <RoomWaiting
            isHost={onlineGameHook.isHost}
            maxPlayers={onlineGameHook.room?.maxPlayers || 2}
            roomId={onlineGameHook.room?.id || roomId || 'UNKNOWN'}
            players={onlineGameHook.players as OnlinePlayer[]}
            onStartGame={() => onlineGameHook.socket.startGame({ roomId: onlineGameHook.room?.id })}
            onLeaveRoom={() => {
              onlineGameHook.socket.emit('room:leave')
              router.back()
            }}
          />
        ) : (
          // 使用统一的游戏界面
          <GameContent />
        )
      }
    </>
  )

  // 统一的游戏内容组件
  function GameContent() {
    return (
      <View style={[styles.container, { backgroundColor: colors.homeBackground }]}>
        {/* 背景渐变 */}
        <LinearGradient
          colors={[colors.homeGradientStart, colors.homeGradientMiddle, colors.homeGradientEnd]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* 游戏状态栏 */}
          <View style={[styles.statusBar, { backgroundColor: colors.homeCardBackground }]}>
            <View style={styles.statusLeft}>
              <Text style={[styles.statusTitle, { color: colors.homeCardTitle }]}>
                {room?.gameStatus === 'waiting'
                  ? t('flyingChess.gameStatus.waiting', '准备开始')
                  : room?.gameStatus === 'playing'
                    ? t('flyingChess.gameStatus.playing', '游戏进行中')
                    : t('flyingChess.gameStatus.finished', '游戏结束')}
              </Text>
              {room?.gameStatus === 'playing' && onlineGameHook?.currentPlayer && (
                <Text
                  style={[styles.currentPlayerText, { color: onlineGameHook.currentPlayer.color }]}
                >
                  {t('flyingChess.currentPlayer', '轮到 {{playerName}}', {
                    playerName: onlineGameHook.currentPlayer.name,
                  })}
                </Text>
              )}
            </View>

            {room?.gameStatus === 'playing' && (
              <View style={styles.diceContainer}>
                <View style={styles.diceWrapper}>
                  <TouchableOpacity
                    style={[
                      styles.diceButton,
                      {
                        backgroundColor:
                          isRolling || isMoving || !!onlineGameHook?.currentPlayer
                            ? '#FF6B6B'
                            : colors.settingsAccent,
                        borderWidth: 3,
                        borderColor: 'white',
                        opacity: isRolling || isMoving || !!onlineGameHook?.currentPlayer ? 0.6 : 1,
                      },
                    ]}
                    onPress={rollDice}
                    disabled={isRolling || isMoving || !!onlineGameHook?.currentPlayer}
                    activeOpacity={0.8}
                  >
                    {isRolling ? (
                      <Animated.View style={diceAnimatedStyle}>
                        <Text style={styles.diceEmoji}>🎲</Text>
                      </Animated.View>
                    ) : (
                      <Text style={[styles.diceResultText, { color: 'white' }]}>
                        {onlineGameHook.diceValue || '🎲'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                <Text
                  style={[
                    styles.diceText,
                    { color: colors.homeCardDescription, fontWeight: '600' },
                  ]}
                >
                  {!!onlineGameHook.currentPlayer
                    ? t('flyingChess.dice.waitingTurn', '等待其他玩家')
                    : isRolling
                      ? t('flyingChess.dice.rolling', '投掷中...')
                      : isMoving
                        ? t('flyingChess.dice.moving', '棋子移动中...')
                        : t('flyingChess.dice.clickToRoll', '点击投掷骰子')}
                </Text>
              </View>
            )}
          </View>

          {/* 玩家信息 */}
          <View style={[styles.playersInfo, { backgroundColor: colors.homeCardBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.homeCardTitle }]}>
              {t('flyingChess.playersStatus', '玩家状态')}
            </Text>
            <View style={styles.playersGrid}>
              {players.map((player) => (
                <View
                  key={player.id}
                  style={[
                    styles.playerCard,
                    {
                      backgroundColor: player.color + '15',
                      borderColor:
                        onlineGameHook.currentPlayer?.id === player.id
                          ? player.color
                          : 'transparent',
                      borderWidth: onlineGameHook.currentPlayer?.id === player.id ? 2 : 0,
                    },
                  ]}
                >
                  <PlayerAvatar iconType={player.iconType} color={player.color} size={32} />
                  <View style={styles.playerInfo}>
                    <View style={styles.playerNameRow}>
                      <Text style={[styles.playerName, { color: colors.homeCardTitle }]}>
                        {player.name}
                      </Text>
                      {player?.isHost && <Ionicons name="star" size={14} color="#FFD700" />}
                    </View>
                    <Text style={[styles.playerPosition, { color: colors.homeCardDescription }]}>
                      {t('flyingChess.position', '位置: {{position}}', {
                        position: player.position + 1,
                      })}
                    </Text>
                    <View style={styles.connectionStatus}>
                      <View
                        style={[
                          styles.connectionDot,
                          {
                            backgroundColor: player?.isConnected ? '#4CAF50' : '#FF6B6B',
                          },
                        ]}
                      />
                      <Text style={[styles.connectionText, { color: colors.homeCardDescription }]}>
                        {player?.isConnected
                          ? t('online.connected', '在线')
                          : t('online.disconnected', '离线')}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* 游戏棋盘 */}
          <View style={[styles.boardSection, { backgroundColor: colors.homeCardBackground }]}>
            <GameBoard
              players={players as any}
              currentPlayer={onlineGameHook.currentPlayerIndex as number}
              boardData={boardPath}
            />
          </View>
        </ScrollView>

        {/* 任务弹窗 */}
        <TaskModal
          visible={showTaskModal}
          task={taskModalData}
          currentPlayer={onlineGameHook.currentPlayer as any}
          opponentPlayer={onlineGameHook.currentPlayer as any}
          onComplete={handleTaskComplete}
          onClose={() => setShowTaskModal(false)}
        />

        {/* 胜利弹窗 */}
        <VictoryModal
          visible={showVictoryModal}
          winner={winner}
          availableTasks={onlineGameHook.taskSet?.tasks as any}
          onTasksSelected={() => {}}
          onRestart={() => {
            handleResetGame()
            setShowVictoryModal(false)
          }}
          onExit={() => {
            onlineGameHook.socket.emit('game:exit', onlineGameHook.room?.id)
            setShowVictoryModal(false)
            router.back()
          }}
          onClose={() => setShowVictoryModal(false)}
        />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusLeft: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  currentPlayerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  diceContainer: {
    alignItems: 'center',
    gap: 12,
  },
  diceWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceGlow: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    zIndex: 0,
  },
  diceGlowGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
  },
  diceButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1,
  },
  diceEmoji: {
    fontSize: 32,
  },
  diceResultText: {
    fontSize: 24,
    fontWeight: '700',
  },
  diceText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  connectionText: {
    fontSize: 10,
  },
  playersInfo: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  playersGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  playerCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  playerPosition: {
    fontSize: 12,
  },
  boardSection: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
})
