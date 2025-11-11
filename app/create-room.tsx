import React, { useEffect, useState } from 'react'
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { usePageBase } from '@/hooks/usePageBase'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { commonStyles, spacing } from '@/constants/commonStyles'
import { useSocket } from '@/hooks/use-socket'
import { CreateRoomData } from '@/types/online'
import { useSettingsStore } from '@/store'
import { AvatarGender } from '@/types/settings'
import { AvatarOption, getRandomAvatarByGender } from '@/constants/avatars'
import { AvatarPicker } from '@/components/AvatarPicker'
import { useTasksStore } from '@/store/tasksStore'
import { GameInfoCard } from '@/components/online/GameInfoCard'
import { ModeSelector } from '@/components/online/ModeSelector'
import { generateRoomName, useGameTypeText } from '@/components/online/RoomUtils'

export default function CreateRoomPage() {
  const { colors, t, router } = usePageBase()
  const { showError } = useErrorHandler()
  const params = useLocalSearchParams()
  const socket = useSocket()
  const { networkSettings, playerProfile, setPlayerProfile } = useSettingsStore()
  const { taskSets } = useTasksStore()
  const getGameTypeText = useGameTypeText()

  // 从路由参数获取游戏配置
  const gameType = (params.gameType as 'fly' | 'wheel' | 'minesweeper') || 'fly'
  const taskSetId = params.taskSetId as string
  const taskSet = taskSets.find((set) => set.id === taskSetId) || null

  // 状态管理
  const [connectionMode, setConnectionMode] = useState<'online' | 'lan'>(
    Platform.OS === 'web'
      ? 'online'
      : networkSettings.lanMode && !networkSettings.enabled
        ? 'lan'
        : 'online',
  )
  const [playerName, setPlayerName] = useState(playerProfile.playerName || '')
  const [roomName, setRoomName] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(2)
  const [isLoading, setIsLoading] = useState(false)

  // 头像和性别状态
  const [selectedGender, setSelectedGender] = useState<AvatarGender>(playerProfile.gender || 'man')
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarOption | null>(null)

  // 检查平台是否支持局域网功能
  const isLANSupported = Platform.OS !== 'web'
  const canCreateLANRoom = Platform.OS !== 'web'
  const isOnlineEnabled = networkSettings.enabled
  const isLANEnabled = isLANSupported && networkSettings.lanMode

  // 根据游戏类型和任务集设置默认房间名
  useEffect(() => {
    setRoomName(generateRoomName(gameType, taskSet?.id, getGameTypeText))
  }, [gameType, taskSet?.id])

  // 初始化默认头像
  useEffect(() => {
    if (!selectedAvatar) {
      // 优先从缓存加载头像，如果没有则随机生成
      if (playerProfile.avatarId) {
        // 这里可以根据 avatarId 找到对应的头像，暂时先随机生成
        const defaultAvatar = getRandomAvatarByGender(selectedGender)
        setSelectedAvatar(defaultAvatar)
      } else {
        const defaultAvatar = getRandomAvatarByGender(selectedGender)
        setSelectedAvatar(defaultAvatar)
      }
    }
  }, [])

  // 自动保存玩家资料到缓存
  useEffect(() => {
    if (playerName && selectedAvatar) {
      setPlayerProfile({
        playerName: playerName.trim(),
        avatarId: selectedAvatar.id,
        gender: selectedGender,
      })
    }
  }, [playerName, selectedAvatar, selectedGender])

  // 监听房间创建成功后跳转
  useEffect(() => {
    const currentRoom = connectionMode === 'lan' ? socket.currentLANRoom : socket.currentRoom

    if (currentRoom) {
      router.replace({
        pathname: '/waiting-room',
        params: {
          taskSetId: taskSet?.id || '',
          onlineMode: 'true',
          roomId: currentRoom.id,
        },
      })
    }
  }, [socket.currentRoom, socket.currentLANRoom, connectionMode])

  const handleCreateRoom = async () => {
    if (!playerName.trim() || !roomName.trim()) {
      showError(t('common.error', '错误'), t('online.error.fillRequired', '请填写所有必需信息'))
      return
    }

    if (!selectedAvatar) {
      showError(t('common.error', '错误'), t('online.error.selectAvatar', '请选择头像'))
      return
    }

    if (connectionMode === 'lan' && !canCreateLANRoom) {
      showError(
        t('common.error', '错误'),
        t('online.lan.webNotSupported', 'Web平台不支持创建局域网房间,请使用移动应用'),
      )
      return
    }

    setIsLoading(true)
    try {
      const createData: CreateRoomData = {
        roomName: roomName.trim(),
        playerName: playerName.trim(),
        maxPlayers,
        gameType,
        taskSet: taskSet,
        avatarId: selectedAvatar.id,
        gender: selectedGender,
      }

      if (connectionMode === 'lan' && canCreateLANRoom) {
        await socket.switchToLANMode()
        await socket.createLANRoom(createData)
      } else {
        await socket.createRoom(createData)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 检查是否有可用的模式
  const availableModes = []
  if (isOnlineEnabled) availableModes.push('online')
  if (isLANEnabled) availableModes.push('lan')

  if (availableModes.length === 0) {
    return (
      <>
        <Stack.Screen
          options={{
            title: '创建房间',
            headerBackTitle: '返回',
          }}
        />
        <View style={[styles.container, { backgroundColor: colors.homeBackground }]}>
          <View style={styles.emptyState}>
            <Ionicons name="settings-outline" size={64} color={colors.homeCardDescription} />
            <Text style={[styles.emptyStateTitle, { color: colors.homeCardTitle }]}>
              未启用网络功能
            </Text>
            <Text style={[styles.emptyStateDesc, { color: colors.homeCardDescription }]}>
              请在设置中启用&ldquo;在线模式&rdquo;或&ldquo;局域网模式&rdquo;
            </Text>
            <TouchableOpacity
              style={[styles.settingsButton, { backgroundColor: colors.settingsAccent }]}
              onPress={() => router.push('/(tabs)/settings')}
            >
              <Ionicons name="settings" size={20} color="white" />
              <Text style={styles.settingsButtonText}>前往设置</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    )
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: '创建房间',
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
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 游戏信息卡片 */}
          <GameInfoCard
            gameType={gameType}
            taskSetName={taskSet?.name}
            connectionMode={connectionMode}
            getGameTypeText={getGameTypeText}
          />

          {/* 连接状态 */}
          {connectionMode === 'online' && (
            <View
              style={[
                styles.connectionStatus,
                {
                  backgroundColor: socket.isConnected ? '#4CAF5020' : '#FF6B6B20',
                },
              ]}
            >
              <Ionicons
                name={socket.isConnected ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={socket.isConnected ? '#4CAF50' : '#FF6B6B'}
              />
              <Text
                style={[
                  styles.connectionText,
                  { color: socket.isConnected ? '#4CAF50' : '#FF6B6B' },
                ]}
              >
                {socket.isConnected
                  ? t('online.connected', '已连接')
                  : socket.connectionError || t('online.disconnected', '未连接')}
              </Text>
              {!socket.isConnected && (
                <TouchableOpacity onPress={socket.connect}>
                  <Text style={[styles.retryText, { color: colors.settingsAccent }]}>
                    {t('online.retry', '重试')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* 模式切换器 */}
          <ModeSelector
            connectionMode={connectionMode}
            onModeChange={setConnectionMode}
            isOnlineEnabled={isOnlineEnabled}
            isLANEnabled={isLANEnabled}
          />

          <View style={styles.createSection}>
            {/* Web 平台局域网不支持提示 */}
            {connectionMode === 'lan' && !canCreateLANRoom && (
              <View style={styles.warningCard}>
                <Ionicons name="warning" size={24} color="#FF9500" />
                <View style={styles.warningContent}>
                  <Text style={styles.warningTitle}>功能受限</Text>
                  <Text style={styles.warningDesc}>
                    Web 平台暂不支持局域网房间创建,请使用移动应用
                  </Text>
                </View>
              </View>
            )}

            {/* 头像选择 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.homeCardTitle }]}>选择头像</Text>
              <AvatarPicker
                selectedGender={selectedGender}
                selectedAvatar={selectedAvatar}
                onGenderChange={setSelectedGender}
                onAvatarChange={setSelectedAvatar}
              />
            </View>

            {/* 玩家名称 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.homeCardTitle }]}>玩家名称</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.settingsCardBackground,
                    borderColor: colors.homeCardBorder,
                    color: colors.homeCardTitle,
                  },
                ]}
                value={playerName}
                onChangeText={setPlayerName}
                placeholder="请输入你的名称"
                placeholderTextColor={colors.homeCardDescription}
                maxLength={20}
              />
            </View>

            {/* 房间名称 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.homeCardTitle }]}>房间名称</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.settingsCardBackground,
                    borderColor: colors.homeCardBorder,
                    color: colors.homeCardTitle,
                  },
                ]}
                value={roomName}
                onChangeText={setRoomName}
                placeholder="请输入房间名称"
                placeholderTextColor={colors.homeCardDescription}
                maxLength={30}
              />
            </View>

            {/* 最大玩家数 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.homeCardTitle }]}>最大玩家数</Text>
              <View style={styles.playerCountSelector}>
                {[2, 3, 4].map((count) => (
                  <TouchableOpacity
                    key={count}
                    style={[
                      styles.playerCountButton,
                      {
                        backgroundColor:
                          maxPlayers === count
                            ? colors.settingsAccent + '20'
                            : colors.settingsCardBackground,
                        borderColor:
                          maxPlayers === count ? colors.settingsAccent : colors.homeCardBorder,
                      },
                    ]}
                    onPress={() => setMaxPlayers(count)}
                  >
                    <Text
                      style={[
                        styles.playerCountText,
                        {
                          color:
                            maxPlayers === count
                              ? colors.settingsAccent
                              : colors.homeCardDescription,
                        },
                      ]}
                    >
                      {count}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 创建按钮 */}
            <TouchableOpacity
              style={[
                styles.createButton,
                {
                  opacity:
                    isLoading ||
                    (connectionMode === 'online' && !socket.isConnected) ||
                    (connectionMode === 'lan' && !canCreateLANRoom)
                      ? 0.6
                      : 1,
                },
              ]}
              onPress={handleCreateRoom}
              disabled={
                isLoading ||
                (connectionMode === 'online' && !socket.isConnected) ||
                (connectionMode === 'lan' && !canCreateLANRoom)
              }
            >
              <LinearGradient
                colors={connectionMode === 'lan' ? ['#FF9500', '#FF6B35'] : ['#5E5CE6', '#BF5AF2']}
                style={styles.buttonGradient}
              >
                <Ionicons name="add-circle" size={20} color="white" />
                <Text style={styles.buttonText}>
                  {isLoading
                    ? '创建中...'
                    : connectionMode === 'lan'
                      ? canCreateLANRoom
                        ? '创建局域网房间'
                        : 'Web平台不支持'
                      : '创建房间'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    ...commonStyles.container,
  },
  content: {
    ...commonStyles.container,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...commonStyles.card,
    ...commonStyles.marginBottom12,
    marginHorizontal: spacing.lg,
    gap: 8,
  },
  connectionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  createSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 32,
  },
  section: {
    ...commonStyles.marginBottom20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    ...commonStyles.marginBottom12,
  },
  input: {
    ...commonStyles.input,
    borderWidth: 1,
  },
  playerCountSelector: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  playerCountButton: {
    flex: 1,
    borderWidth: 2,
    ...commonStyles.button,
    paddingVertical: 14,
    alignItems: 'center',
  },
  playerCountText: {
    fontSize: 18,
    fontWeight: '700',
  },
  createButton: {
    ...commonStyles.button,
    overflow: 'hidden',
    marginTop: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: 8,
    width: '100%',
    borderRadius: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    ...commonStyles.card,
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#FFEAA7',
    gap: spacing.md,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  warningDesc: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
  emptyState: {
    ...commonStyles.centerContainer,
    padding: 32,
    gap: spacing.lg,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyStateDesc: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  settingsButton: {
    flexDirection: 'row',
    ...commonStyles.button,
    paddingHorizontal: 24,
    paddingVertical: spacing.md,
    gap: 8,
    marginTop: 8,
  },
  settingsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})
