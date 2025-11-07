import React, { useEffect, useRef, useState } from 'react'
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { usePageBase } from '@/hooks/usePageBase'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { commonStyles, spacing } from '@/constants/commonStyles'
import { useSocket } from '@/hooks/use-socket'
import { JoinLANRoomData, JoinRoomData, LANRoomDiscovery, OnlineRoom } from '@/types/online'
import { useSettingsStore } from '@/store'
import { getAvatarById, getRandomAvatarByGender } from '@/constants/avatars'
import { useTasksStore } from '@/store/tasksStore'
import { GameInfoCard } from '@/components/online/GameInfoCard'
import { ModeSelector } from '@/components/online/ModeSelector'
import { useGameTypeText } from '@/components/online/RoomUtils'
import PlayerInfoSection from './PlayerInfoSection'
import OnlineRoomSection from './OnlineRoomSection'
import LANRoomSection from './LANRoomSection'
import { LANTabType, OnlineTabType } from './types'

/**
 * 加入房间页面主组件
 * 支持在线模式和局域网模式房间加入
 */
export default function JoinRoomPage() {
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

  // ========== 状态管理 ==========
  const [connectionMode, setConnectionMode] = useState<'online' | 'lan'>(
    Platform.OS === 'web'
      ? 'online'
      : networkSettings.lanMode && !networkSettings.enabled
        ? 'lan'
        : 'online',
  )
  const [playerName, setPlayerName] = useState(playerProfile.playerName || '')
  const [roomCode, setRoomCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 在线房间状态
  const [onlineRooms, setOnlineRooms] = useState<OnlineRoom[]>([])
  const [isLoadingOnlineRooms, setIsLoadingOnlineRooms] = useState(false)
  const [onlineTab, setOnlineTab] = useState<OnlineTabType>('browse')

  // 局域网房间状态
  const [discoveredRooms, setDiscoveredRooms] = useState<LANRoomDiscovery[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [manualLanIP, setManualLanIP] = useState('')
  const [manualLanPort, setManualLanPort] = useState('3306')
  const [manualLanRoomId, setManualLanRoomId] = useState('')
  const [lanTab, setLanTab] = useState<LANTabType>('scan')

  // 头像和性别状态
  const [selectedGender, setSelectedGender] = useState(playerProfile.gender || 'man')
  const [selectedAvatar, setSelectedAvatar] = useState(
    playerProfile.avatarId ? getAvatarById(playerProfile.avatarId) : null,
  )

  // 其他状态
  const [refreshing, setRefreshing] = useState(false)
  const hasNavigatedRef = useRef(false)
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 检查平台是否支持局域网功能
  const isLANSupported = Platform.OS !== 'web'
  const isOnlineEnabled = networkSettings.enabled
  const isLANEnabled = isLANSupported && networkSettings.lanMode

  // ========== 初始化和副作用 ==========

  // 初始化默认头像
  useEffect(() => {
    if (!selectedAvatar) {
      const defaultAvatar = getRandomAvatarByGender(selectedGender)
      setSelectedAvatar(defaultAvatar)
    }
  }, [])

  // 保存玩家信息到缓存
  useEffect(() => {
    if (playerName && selectedAvatar) {
      setPlayerProfile({
        playerName: playerName.trim(),
        avatarId: selectedAvatar.id,
        gender: selectedGender,
      })
    }
  }, [playerName, selectedAvatar, selectedGender])

  // 监听房间更新 - 只在首次加入房间时跳转一次
  useEffect(() => {
    const currentRoom = connectionMode === 'lan' ? socket.currentLANRoom : socket.currentRoom

    if (currentRoom && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true
      handleRoomJoined(currentRoom.id)
    }
  }, [socket.currentRoom, socket.currentLANRoom, connectionMode])

  // 局域网房间扫描
  useEffect(() => {
    if (connectionMode === 'lan' && isLANSupported && isLANEnabled && lanTab === 'scan') {
      handleStartScan()
    }
    return () => {
      if (connectionMode === 'lan' && isLANSupported) {
        socket.stopRoomScan?.()
        setIsScanning(false)
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current)
          scanIntervalRef.current = null
        }
      }
    }
  }, [connectionMode, isLANEnabled, lanTab])

  // 在线房间列表监听
  useEffect(() => {
    if (connectionMode === 'online' && isOnlineEnabled) {
      handleRefreshOnlineRooms()

      const handleRoomList = (rooms: OnlineRoom[]) => {
        setOnlineRooms(Object.values(rooms))
        setIsLoadingOnlineRooms(false)
        setRefreshing(false)
      }

      socket.on('room:list', handleRoomList)

      const refreshInterval = setInterval(() => {
        handleRefreshOnlineRooms()
      }, 5000)

      return () => {
        socket.off('room:list', handleRoomList)
        clearInterval(refreshInterval)
      }
    }
  }, [connectionMode, isOnlineEnabled])

  // ========== 事件处理函数 ==========

  /**
   * 处理成功加入房间后的跳转
   */
  const handleRoomJoined = (roomId: string) => {
    router.replace({
      pathname: '/waiting-room',
      params: {
        taskSetId: taskSet?.id || '',
        onlineMode: 'true',
        roomId: roomId,
      },
    })
  }

  /**
   * 处理加入房间
   */
  const handleJoinRoom = async (roomId?: string, lanRoomData?: LANRoomDiscovery) => {
    if (!playerName.trim()) {
      showError(t('common.error', '错误'), t('online.error.fillRequired', '请填写玩家名称'))
      return
    }

    if (!selectedAvatar) {
      showError(t('common.error', '错误'), t('online.error.selectAvatar', '请选择头像'))
      return
    }

    if (connectionMode === 'lan') {
      await handleJoinLANRoom(lanRoomData)
    } else {
      await handleJoinOnlineRoom(roomId)
    }
  }

  /**
   * 处理加入局域网房间
   */
  const handleJoinLANRoom = async (lanRoomData?: LANRoomDiscovery) => {
    if (!isLANSupported) {
      showError(
        t('common.error', '错误'),
        'Web 浏览器不支持局域网功能,请使用移动应用或切换到在线模式',
      )
      return
    }

    const targetIP = lanRoomData?.hostIP || manualLanIP.trim()
    const targetPort = lanRoomData?.tcpPort || parseInt(manualLanPort, 10)
    const targetRoomId = lanRoomData?.roomId || manualLanRoomId.trim()

    if (!targetIP) {
      showError(
        t('common.error', '错误'),
        t('online.lan.error.noIP', '请选择一个房间或输入IP地址'),
      )
      return
    }

    if (!targetPort || isNaN(targetPort)) {
      showError(
        t('common.error', '错误'),
        t('online.lan.error.invalidPort', '请输入有效的端口号'),
      )
      return
    }

    if (!targetRoomId) {
      showError(t('common.error', '错误'), '请输入房间号')
      return
    }

    setIsLoading(true)
    try {
      await socket.switchToLANMode()

      const joinData: JoinLANRoomData = {
        hostIP: targetIP,
        hostPort: targetPort,
        roomId: targetRoomId,
        playerName: playerName.trim(),
        avatarId: selectedAvatar!.id,
        gender: selectedGender,
      }

      await socket.joinLANRoom(joinData)
    } catch (error) {
      console.error('加入局域网房间失败:', error)
      showError(
        t('common.error', '错误'),
        error instanceof Error ? error.message : t('online.error.joinFailed', '加入房间失败'),
      )
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 处理加入在线房间
   */
  const handleJoinOnlineRoom = async (roomId?: string) => {
    const targetRoomId = roomId || roomCode.trim()
    if (!targetRoomId) {
      showError(t('common.error', '错误'), t('online.error.fillRequired', '请填写房间代码'))
      return
    }

    setIsLoading(true)
    try {
      const joinData: JoinRoomData = {
        roomId: targetRoomId,
        playerName: playerName.trim(),
        avatarId: selectedAvatar!.id,
        gender: selectedGender,
      }
      await socket.joinRoom(joinData)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 开始扫描局域网房间
   */
  const handleStartScan = async () => {
    if (isScanning) return

    setIsScanning(true)
    try {
      await socket.startRoomScan?.()
      const updateInterval = setInterval(() => {
        const rooms = socket.getDiscoveredRooms?.() as LANRoomDiscovery[] | undefined
        if (rooms) {
          setDiscoveredRooms(rooms)
        }
      }, 500)

      scanIntervalRef.current = updateInterval
    } catch (error) {
      console.error('启动扫描失败:', error)
      showError(t('common.error', '错误'), '启动局域网扫描失败')
      setIsScanning(false)
    }
  }

  /**
   * 停止扫描局域网房间
   */
  const handleStopScan = () => {
    socket.stopRoomScan?.()
    setIsScanning(false)
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
  }

  /**
   * 刷新在线房间列表
   */
  const handleRefreshOnlineRooms = () => {
    if (socket.isConnected) {
      setIsLoadingOnlineRooms(true)
      socket.emit('room:getRoomList')
    }
  }

  /**
   * 下拉刷新
   */
  const handleRefresh = () => {
    setRefreshing(true)
    if (connectionMode === 'online') {
      handleRefreshOnlineRooms()
    } else {
      if (lanTab === 'scan') {
        handleStartScan()
      }
      setTimeout(() => setRefreshing(false), 1000)
    }
  }

  // ========== 渲染 ==========

  // 检查是否有可用的模式
  const availableModes = []
  if (isOnlineEnabled) availableModes.push('online')
  if (isLANEnabled) availableModes.push('lan')

  // 如果没有可用模式,显示空状态
  if (availableModes.length === 0) {
    return (
      <>
        <Stack.Screen
          options={{
            title: t('joinRoom.title', '加入房间'),
            headerBackTitle: t('common.back', '返回'),
          }}
        />
        <View style={[styles.container, { backgroundColor: colors.homeBackground }]}>
          <View style={styles.emptyState}>
            <Ionicons name="settings-outline" size={64} color={colors.homeCardDescription} />
            <Text style={[styles.emptyStateTitle, { color: colors.homeCardTitle }]}>
              {t('joinRoom.noNetworkEnabled', '未启用网络功能')}
            </Text>
            <Text style={[styles.emptyStateDesc, { color: colors.homeCardDescription }]}>
              {t('joinRoom.enableNetworkHint', '请在设置中启用在线模式或局域网模式')}
            </Text>
            <TouchableOpacity
              style={[styles.settingsButton, { backgroundColor: colors.settingsAccent }]}
              onPress={() => router.push('/(tabs)/settings')}
            >
              <Ionicons name="settings" size={20} color="white" />
              <Text style={styles.settingsButtonText}>
                {t('joinRoom.goToSettings', '前往设置')}
              </Text>
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
          title: t('joinRoom.title', '加入房间'),
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
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.settingsAccent}
            />
          }
        >
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

          <View style={styles.joinSection}>
            {/* 玩家信息输入 */}
            <PlayerInfoSection
              playerName={playerName}
              setPlayerName={setPlayerName}
              selectedGender={selectedGender}
              setSelectedGender={setSelectedGender}
              selectedAvatar={selectedAvatar}
              setSelectedAvatar={setSelectedAvatar}
              colors={colors}
              t={t}
            />

            {/* 在线房间部分 */}
            <OnlineRoomSection
              visible={connectionMode === 'online'}
              rooms={onlineRooms}
              isLoading={isLoadingOnlineRooms}
              roomCode={roomCode}
              setRoomCode={setRoomCode}
              onRefresh={handleRefreshOnlineRooms}
              onJoinRoom={handleJoinRoom}
              isConnected={socket.isConnected}
              onlineTab={onlineTab}
              setOnlineTab={setOnlineTab}
              getGameTypeText={getGameTypeText}
              colors={colors}
              t={t}
            />

            {/* 局域网房间部分 */}
            <LANRoomSection
              visible={connectionMode === 'lan'}
              discoveredRooms={discoveredRooms}
              isScanning={isScanning}
              manualIP={manualLanIP}
              setManualIP={setManualLanIP}
              manualPort={manualLanPort}
              setManualPort={setManualLanPort}
              manualRoomId={manualLanRoomId}
              setManualRoomId={setManualLanRoomId}
              onStartScan={handleStartScan}
              onStopScan={handleStopScan}
              onJoinRoom={handleJoinRoom}
              isLoading={isLoading}
              lanTab={lanTab}
              setLanTab={setLanTab}
              isLANSupported={isLANSupported}
              getGameTypeText={getGameTypeText}
              colors={colors}
              t={t}
            />
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
  joinSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 32,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: spacing.md,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  settingsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})
