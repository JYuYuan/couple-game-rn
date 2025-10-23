import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Colors } from '@/constants/theme'
import { useTranslation } from 'react-i18next'
import { OnlinePlayer } from '@/types/online'
import * as Clipboard from 'expo-clipboard'
import { showConfirmDialog } from '@/components/ConfirmDialog'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import toast from '@/utils/toast'

interface RoomWaitingProps {
  roomId: string
  players: OnlinePlayer[]
  maxPlayers: number
  isHost: boolean
  onStartGame: () => void
  onLeaveRoom: () => void
  isStartingGame?: boolean
  isConnected?: boolean
  isLANRoom?: boolean
  lanIP?: string
  lanPort?: number
}

export const RoomWaiting: React.FC<RoomWaitingProps> = ({
  roomId = '',
  players = [],
  maxPlayers,
  isHost,
  onStartGame,
  onLeaveRoom,
  isStartingGame = false,
  isConnected = true,
  isLANRoom = false,
  lanIP,
  lanPort,
}) => {
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme] as any
  const { t } = useTranslation()

  const canStartGame = players.length >= 2 && players.every((p) => p.isConnected)

  // 复制房间代码到剪贴板
  const copyRoomId = async () => {
    try {
      await Clipboard.setStringAsync(roomId.toUpperCase())
      toast.success(t('online.roomCodeCopied', '房间代码已复制到剪贴板'))
    } catch {
      toast.error(t('online.copyFailed', '复制失败，请手动复制房间代码'))
    }
  }

  // 复制局域网连接信息
  const copyLANInfo = async () => {
    if (!lanIP || !lanPort) return

    try {
      const lanInfo = `IP: ${lanIP}\n端口: ${lanPort}`
      await Clipboard.setStringAsync(lanInfo)
      toast.success(t('online.lan.infoCopied', '局域网信息已复制到剪贴板'))
    } catch {
      toast.error(t('online.copyFailed', '复制失败，请手动复制房间代码'))
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.homeBackground }]}>
      {/* 背景渐变 */}
      <LinearGradient
        colors={[colors.homeGradientStart, colors.homeGradientMiddle, colors.homeGradientEnd]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.content}>
        {/* 房间信息 */}
        <View style={[styles.roomInfo, { backgroundColor: colors.homeCardBackground }]}>
          <View style={styles.roomHeader}>
            <View style={styles.roomTitleContainer}>
              <View style={styles.roomCodeContainer}>
                <Text style={[styles.roomCodeLabel, { color: colors.homeCardDescription }]}>
                  {t('online.roomCode', '房间代码')}:
                </Text>
                <Text
                  style={[styles.roomCode, { color: colors.settingsAccent }]}
                  onPress={() => copyRoomId()}
                >
                  {roomId.toUpperCase()}
                </Text>
              </View>

              {/* 局域网信息 */}
              {isLANRoom && lanIP && lanPort && (
                <View style={styles.lanInfoContainer}>
                  <View style={[styles.lanBadge, { backgroundColor: '#2196F3' + '20' }]}>
                    <Ionicons name="wifi" size={14} color="#2196F3" />
                    <Text style={[styles.lanBadgeText, { color: '#2196F3' }]}>
                      {t('online.lan.mode', '局域网模式')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.lanInfoRow}
                    onPress={copyLANInfo}
                    activeOpacity={0.7}
                  >
                    <View style={styles.lanInfoContent}>
                      <Text style={[styles.lanInfoLabel, { color: colors.homeCardDescription }]}>
                        IP:{' '}
                        <Text style={[styles.lanInfoValue, { color: colors.homeCardTitle }]}>
                          {lanIP}
                        </Text>
                      </Text>
                      <Text style={[styles.lanInfoLabel, { color: colors.homeCardDescription }]}>
                        {t('online.lan.port', '端口')}:{' '}
                        <Text style={[styles.lanInfoValue, { color: colors.homeCardTitle }]}>
                          {lanPort}
                        </Text>
                      </Text>
                    </View>
                    <Ionicons name="copy-outline" size={20} color={colors.settingsAccent} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.leaveButton, { backgroundColor: '#FF6B6B' + '20' }]}
              onPress={onLeaveRoom}
            >
              <Ionicons name="exit" size={20} color="#FF6B6B" />
              <Text style={[styles.leaveButtonText, { color: '#FF6B6B' }]}>
                {t('online.leaveRoom', '离开房间')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 玩家列表 */}
        <View style={[styles.playersSection, { backgroundColor: colors.homeCardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.homeCardTitle }]}>
            {t('online.players', '玩家')} ({players.length}/{maxPlayers})
          </Text>

          <View style={styles.playersList}>
            {Array.from({ length: maxPlayers }, (_, index) => {
              const player = players[index]
              return (
                <View
                  key={index}
                  style={[
                    styles.playerSlot,
                    {
                      backgroundColor: player ? player.color + '15' : colors.homeBackground,
                      borderColor: player ? player.color : colors.homeCardBorder,
                    },
                  ]}
                >
                  {player ? (
                    <>
                      <PlayerAvatar avatarId={player.avatarId} color={player.color} />
                      <View style={styles.playerInfo}>
                        <View style={styles.playerNameRow}>
                          <Text style={[styles.playerName, { color: colors.homeCardTitle }]}>
                            {player.name}
                          </Text>
                          {player.isHost && (
                            <View style={[styles.hostBadge, { backgroundColor: '#FFD700' + '20' }]}>
                              <Ionicons name="map" size={12} color="#FFD700" />
                              <Text style={[styles.hostText, { color: '#FFD700' }]}>
                                {t('online.host', '房主')}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.connectionStatus}>
                          <View
                            style={[
                              styles.connectionDot,
                              { backgroundColor: player.isConnected ? '#4CAF50' : '#FF6B6B' },
                            ]}
                          />
                          <Text
                            style={[styles.connectionText, { color: colors.homeCardDescription }]}
                          >
                            {player.isConnected
                              ? t('online.connected', '已连接')
                              : t('online.disconnected', '已断线')}
                          </Text>
                        </View>
                      </View>
                    </>
                  ) : (
                    <View style={styles.emptySlot}>
                      <Ionicons name="person-add" size={32} color={colors.homeCardDescription} />
                      <Text style={[styles.emptySlotText, { color: colors.homeCardDescription }]}>
                        {t('online.waitingPlayer', '等待玩家加入')}
                      </Text>
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        </View>

        {/* 游戏控制 */}
        <View style={styles.gameControls}>
          {isHost ? (
            <TouchableOpacity
              style={[
                styles.startGameButton,
                { opacity: canStartGame && isConnected && !isStartingGame ? 1 : 0.5 },
              ]}
              onPress={onStartGame}
              disabled={!canStartGame || !isConnected || isStartingGame}
            >
              <LinearGradient
                colors={
                  canStartGame && isConnected && !isStartingGame
                    ? ['#4CAF50', '#66BB6A']
                    : ['#CCCCCC', '#AAAAAA']
                }
                style={styles.startGameGradient}
              >
                <Ionicons name={isStartingGame ? 'hourglass' : 'play'} size={20} color="white" />
                <Text style={styles.startGameText}>
                  {isStartingGame
                    ? t('online.starting', '正在开始...')
                    : !isConnected
                      ? t('online.connecting', '连接中...')
                      : canStartGame
                        ? t('online.startGame', '开始游戏')
                        : t('online.waitingPlayers', '等待玩家')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={[styles.waitingMessage, { backgroundColor: colors.homeCardBackground }]}>
              <Ionicons name="time" size={24} color={colors.homeCardDescription} />
              <Text style={[styles.waitingText, { color: colors.homeCardDescription }]}>
                {t('online.waitingHost', '等待房主开始游戏')}
              </Text>
            </View>
          )}
        </View>

        {/* 房间说明 */}
        <View style={[styles.instructions, { backgroundColor: colors.homeCardBackground }]}>
          <Text style={[styles.instructionTitle, { color: colors.homeCardTitle }]}>
            {t('online.instructions.title', '游戏说明')}
          </Text>
          <Text style={[styles.instructionText, { color: colors.homeCardDescription }]}>
            • {t('online.instructions.minPlayers', '至少需要2名玩家才能开始游戏')}
          </Text>
          <Text style={[styles.instructionText, { color: colors.homeCardDescription }]}>
            • {t('online.instructions.hostControl', '房主可以开始游戏')}
          </Text>
          <Text style={[styles.instructionText, { color: colors.homeCardDescription }]}>
            • {t('online.instructions.shareCode', '分享房间代码邀请朋友加入')}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 20,
  },
  roomInfo: {
    borderRadius: 16,
    padding: 20,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomTitleContainer: {
    flex: 1,
  },
  roomTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  roomCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomCodeLabel: {
    fontSize: 14,
  },
  roomCode: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
  },
  lanInfoContainer: {
    marginTop: 12,
    gap: 8,
  },
  lanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    alignSelf: 'flex-start',
  },
  lanBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  lanInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  lanInfoContent: {
    flex: 1,
    gap: 4,
  },
  lanInfoLabel: {
    fontSize: 13,
  },
  lanInfoValue: {
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  leaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  playersSection: {
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  playersList: {
    gap: 12,
  },
  playerSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  playerInfo: {
    flex: 1,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  hostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  hostText: {
    fontSize: 10,
    fontWeight: '600',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionText: {
    fontSize: 12,
  },
  emptySlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptySlotText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  gameControls: {
    alignItems: 'center',
  },
  startGameButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  startGameGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  startGameText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  waitingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  waitingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  instructions: {
    borderRadius: 16,
    padding: 20,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
})
