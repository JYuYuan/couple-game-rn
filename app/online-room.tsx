import React, { useEffect, useRef, useState } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  RefreshControl,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Colors } from '@/constants/theme'
import { useTranslation } from 'react-i18next'
import { useSocket } from '@/hooks/use-socket'
import {
  CreateRoomData,
  JoinRoomData,
  JoinLANRoomData,
  LANRoomDiscovery,
  OnlineRoom,
} from '@/types/online'
import { LinearGradient } from 'expo-linear-gradient'
import { useSettingsStore } from '@/store'
import { generateRoomId } from '@/utils'
import { showError } from '@/utils/toast'
import { AvatarGender } from '@/types/settings'
import { AvatarOption, getRandomAvatarByGender } from '@/constants/avatars'
import { AvatarPicker } from '@/components/AvatarPicker'
import { TaskSet } from '@/types/tasks'
import { useTasksStore } from '@/store/tasksStore'

export default function OnlineRoomPage() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme] as any
  const { t } = useTranslation()
  const socket = useSocket()
  const { networkSettings } = useSettingsStore()
  const { taskSets } = useTasksStore()

  // 从路由参数获取游戏配置
  const gameType = (params.gameType as 'fly' | 'wheel' | 'minesweeper') || 'fly'
  const taskSetId = params.taskSetId as string
  const taskSet = taskSets.find((set) => set.id === taskSetId) || null

  // 状态管理
  const [activeTab, setActiveTab] = useState<'join' | 'create'>('join')
  // Web 端强制使用在线模式，不支持局域网
  const [connectionMode, setConnectionMode] = useState<'online' | 'lan'>(
    Platform.OS === 'web'
      ? 'online'
      : networkSettings.lanMode && !networkSettings.enabled
        ? 'lan'
        : 'online',
  )
  const [playerName, setPlayerName] = useState('')
  const [roomName, setRoomName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(2)
  const [isLoading, setIsLoading] = useState(false)
  const [discoveredRooms, setDiscoveredRooms] = useState<LANRoomDiscovery[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [onlineRooms, setOnlineRooms] = useState<OnlineRoom[]>([])
  const [isLoadingOnlineRooms, setIsLoadingOnlineRooms] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [manualLanIP, setManualLanIP] = useState('')
  const [manualLanPort, setManualLanPort] = useState('3306')
  const [manualLanRoomId, setManualLanRoomId] = useState('')
  // 头像和性别状态
  const [selectedGender, setSelectedGender] = useState<AvatarGender>('man')
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarOption | null>(null)

  // 使用 ref 追踪是否已经跳转过
  const hasNavigatedRef = useRef(false)
  // 保存扫描更新间隔的 ref
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 检查平台是否支持局域网功能
  // Web 端不支持 UDP 广播，无法自动扫描
  const isLANSupported = Platform.OS !== 'web'
  const canCreateLANRoom = Platform.OS !== 'web'

  // 检查哪些模式可用
  const isOnlineEnabled = networkSettings.enabled
  // Web 端强制禁用局域网模式
  const isLANEnabled = isLANSupported && networkSettings.lanMode

  // 根据游戏类型和任务集设置默认房间名
  useEffect(() => {
    const gameTypeName = getGameTypeText(gameType)
    setRoomName(`${gameTypeName}-${taskSet?.id}_${Date.now().toString().slice(-4)}`)
  }, [gameType, taskSet?.id])

  // 初始化默认头像
  useEffect(() => {
    if (!selectedAvatar) {
      const defaultAvatar = getRandomAvatarByGender(selectedGender)
      setSelectedAvatar(defaultAvatar)
    }
  }, [])

  // 监听房间更新 - 只在首次加入房间时跳转一次
  useEffect(() => {
    const currentRoom = connectionMode === 'lan' ? socket.currentLANRoom : socket.currentRoom

    if (currentRoom && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true
      handleRoomJoined(currentRoom.id)
    }
  }, [socket.currentRoom, socket.currentLANRoom, connectionMode])

  // 局域网房间扫描 - 自动开始并持续扫描
  useEffect(() => {
    if (connectionMode === 'lan' && activeTab === 'join' && isLANSupported && isLANEnabled) {
      // 自动开始扫描
      handleStartScan()
    }
    return () => {
      // 清理：停止扫描并清理定时器
      if (connectionMode === 'lan' && isLANSupported) {
        socket.stopRoomScan?.()
        setIsScanning(false)
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current)
          scanIntervalRef.current = null
        }
      }
    }
  }, [connectionMode, activeTab, isLANEnabled])

  // 局域网模式下 Web 平台强制显示加入房间 tab
  useEffect(() => {
    if (connectionMode === 'lan' && !canCreateLANRoom && activeTab !== 'join') {
      setActiveTab('join')
    }
  }, [connectionMode, canCreateLANRoom, activeTab])

  // 在线房间列表监听
  useEffect(() => {
    if (connectionMode === 'online' && activeTab === 'join' && isOnlineEnabled) {
      handleRefreshOnlineRooms()

      const handleRoomList = (rooms: OnlineRoom[]) => {
        console.log('收到在线房间列表:', rooms)
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
  }, [connectionMode, activeTab, isOnlineEnabled])

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
        avatar: selectedAvatar.id,
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
      // 局域网模式：可以通过发现的房间或手动输入IP、端口和房间号

      // Web 端不支持局域网功能
      if (!isLANSupported) {
        showError(
          t('common.error', '错误'),
          'Web 浏览器不支持局域网功能，请使用移动应用或切换到在线模式',
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
          avatar: selectedAvatar.id,
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
    } else {
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
          avatar: selectedAvatar.id,
          gender: selectedGender,
        }
        await socket.joinRoom(joinData)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const getGameTypeText = (type: string) => {
    switch (type) {
      case 'fly':
        return t('gameMode.flyingChess', '飞行棋')
      case 'wheel':
        return t('gameMode.wheel', '大转盘')
      case 'minesweeper':
        return t('gameMode.minesweeper', '扫雷对战')
      default:
        return type
    }
  }

  const handleStartScan = async () => {
    if (isScanning) return

    setIsScanning(true)
    try {
      await socket.startRoomScan?.()
      // 持续更新发现的房间，不再设置超时
      const updateInterval = setInterval(() => {
        const rooms: any = socket.getDiscoveredRooms?.()
        if (rooms) {
          setDiscoveredRooms(rooms)
        }
      }, 500) // 更频繁地更新（每500ms）

      // 保存 interval ID 以便后续清理
      scanIntervalRef.current = updateInterval
    } catch (error) {
      console.error('启动扫描失败:', error)
      showError(t('common.error', '错误'), '启动局域网扫描失败')
      setIsScanning(false)
    }
  }

  const handleStopScan = () => {
    socket.stopRoomScan?.()
    setIsScanning(false)
    // 清理更新间隔
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
  }

  const handleRefreshOnlineRooms = () => {
    if (socket.isConnected) {
      setIsLoadingOnlineRooms(true)
      // 通过 socket.emit 来请求房间列表
      socket.emit('room:getRoomList')
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    if (connectionMode === 'online') {
      handleRefreshOnlineRooms()
    } else {
      handleStartScan()
      setTimeout(() => setRefreshing(false), 1000)
    }
  }

  const renderOnlineRoomItem = (room: OnlineRoom) => (
    <TouchableOpacity
      key={room.id}
      style={[
        styles.roomCard,
        {
          backgroundColor: colors.homeCardBackground,
          borderColor: colors.homeCardBorder,
        },
      ]}
      onPress={() => handleJoinRoom(room.id)}
      disabled={isLoading || room.gameStatus !== 'waiting'}
    >
      <View style={styles.roomCardHeader}>
        <View style={styles.roomCardTitleRow}>
          <Ionicons name="game-controller" size={20} color={colors.settingsAccent} />
          <Text style={[styles.roomCardTitle, { color: colors.homeCardTitle }]}>{room.name}</Text>
        </View>
        <View
          style={[
            styles.roomStatusBadge,
            {
              backgroundColor:
                room.gameStatus === 'waiting'
                  ? '#4CAF5020'
                  : room.gameStatus === 'playing'
                    ? '#FF950020'
                    : '#FF6B6B20',
            },
          ]}
        >
          <Text
            style={[
              styles.roomStatusText,
              {
                color:
                  room.gameStatus === 'waiting'
                    ? '#4CAF50'
                    : room.gameStatus === 'playing'
                      ? '#FF9500'
                      : '#FF6B6B',
              },
            ]}
          >
            {room.gameStatus === 'waiting'
              ? '等待中'
              : room.gameStatus === 'playing'
                ? '游戏中'
                : '已结束'}
          </Text>
        </View>
      </View>

      <View style={styles.roomCardInfo}>
        <View style={styles.roomCardInfoItem}>
          <Ionicons name="person" size={16} color={colors.homeCardDescription} />
          <Text style={[styles.roomCardInfoText, { color: colors.homeCardDescription }]}>
            房主: {room.players.find((p) => p.id === room.hostId)?.name || '未知'}
          </Text>
        </View>
        <View style={styles.roomCardInfoItem}>
          <Ionicons name="people" size={16} color={colors.homeCardDescription} />
          <Text style={[styles.roomCardInfoText, { color: colors.homeCardDescription }]}>
            {room.players.length}/{room.maxPlayers} 人
          </Text>
        </View>
      </View>

      <View style={styles.roomCardFooter}>
        <Text style={[styles.roomCardGameType, { color: colors.settingsAccent }]}>
          {getGameTypeText(room.gameType)}
        </Text>
      </View>
    </TouchableOpacity>
  )

  const renderLANRoomItem = (room: LANRoomDiscovery) => (
    <TouchableOpacity
      key={room.roomId}
      style={[
        styles.roomCard,
        {
          backgroundColor: colors.homeCardBackground,
          borderColor: colors.homeCardBorder,
        },
      ]}
      onPress={() => handleJoinRoom(undefined, room)}
      disabled={isLoading}
    >
      <View style={styles.roomCardHeader}>
        <View style={styles.roomCardTitleRow}>
          <Ionicons name="wifi" size={20} color={colors.settingsAccent} />
          <Text style={[styles.roomCardTitle, { color: colors.homeCardTitle }]}>
            {room.roomName}
          </Text>
        </View>
        <View style={[styles.roomStatusBadge, { backgroundColor: '#4CAF5020' }]}>
          <Text style={[styles.roomStatusText, { color: '#4CAF50' }]}>局域网</Text>
        </View>
      </View>

      <View style={styles.roomCardInfo}>
        <View style={styles.roomCardInfoItem}>
          <Ionicons name="person" size={16} color={colors.homeCardDescription} />
          <Text style={[styles.roomCardInfoText, { color: colors.homeCardDescription }]}>
            房主: {room.hostName}
          </Text>
        </View>
        <View style={styles.roomCardInfoItem}>
          <Ionicons name="people" size={16} color={colors.homeCardDescription} />
          <Text style={[styles.roomCardInfoText, { color: colors.homeCardDescription }]}>
            {room.currentPlayers}/{room.maxPlayers} 人
          </Text>
        </View>
      </View>

      <View style={styles.roomCardFooter}>
        <Text style={[styles.roomCardGameType, { color: colors.settingsAccent }]}>
          {getGameTypeText(room.gameType)}
        </Text>
        <Text style={[styles.roomCardIP, { color: colors.homeCardDescription }]}>
          {room.hostIP}
        </Text>
      </View>
    </TouchableOpacity>
  )

  // 只显示启用的模式
  const availableModes = []
  if (isOnlineEnabled) availableModes.push('online')
  if (isLANEnabled) availableModes.push('lan')

  // 如果没有启用任何模式,显示提示
  if (availableModes.length === 0) {
    return (
      <>
        <Stack.Screen
          options={{
            title: '在线游戏',
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
              请在设置中启用&quot;在线模式&quot;或&quot;局域网模式&quot;
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
          title: '在线游戏',
          headerBackTitle: '返回',
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.homeBackground }]}>
        {/* 内容区域 */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            activeTab === 'join' ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.settingsAccent}
              />
            ) : undefined
          }
        >
          {/* 游戏信息卡片 */}
          <View style={[styles.gameInfoCard, { backgroundColor: colors.homeCardBackground }]}>
            <View style={styles.gameInfoHeader}>
              <Ionicons name="game-controller" size={24} color={colors.settingsAccent} />
              <Text style={[styles.gameInfoTitle, { color: colors.homeCardTitle }]}>
                {getGameTypeText(gameType)}
              </Text>
            </View>
            <Text style={[styles.gameInfoSubtitle, { color: colors.homeCardDescription }]}>
              {taskSet?.name || '未选择任务集'}
            </Text>
            {/* 连接模式标识 */}
            <View style={styles.connectionModeContainer}>
              <Ionicons
                name={connectionMode === 'online' ? 'cloud' : 'wifi'}
                size={16}
                color={connectionMode === 'online' ? '#5E5CE6' : '#FF9500'}
              />
              <Text
                style={[
                  styles.connectionModeText,
                  { color: connectionMode === 'online' ? '#5E5CE6' : '#FF9500' },
                ]}
              >
                {connectionMode === 'online' ? '在线模式' : '局域网模式'}
              </Text>
            </View>
          </View>

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

          {/* 模式切换器 - 仅在有多个模式时显示 */}
          {availableModes.length > 1 && (
            <View style={[styles.modeSelector, { backgroundColor: colors.settingsCardBackground }]}>
              {isOnlineEnabled && (
                <TouchableOpacity
                  style={[
                    styles.modeTab,
                    connectionMode === 'online' && {
                      backgroundColor: colors.settingsAccent + '20',
                    },
                  ]}
                  onPress={() => setConnectionMode('online')}
                >
                  <Ionicons
                    name="cloud"
                    size={18}
                    color={
                      connectionMode === 'online'
                        ? colors.settingsAccent
                        : colors.homeCardDescription
                    }
                  />
                  <Text
                    style={[
                      styles.modeText,
                      {
                        color:
                          connectionMode === 'online'
                            ? colors.settingsAccent
                            : colors.homeCardDescription,
                      },
                    ]}
                  >
                    在线模式
                  </Text>
                </TouchableOpacity>
              )}

              {isLANEnabled && (
                <TouchableOpacity
                  style={[
                    styles.modeTab,
                    connectionMode === 'lan' && { backgroundColor: colors.settingsAccent + '20' },
                  ]}
                  onPress={() => setConnectionMode('lan')}
                >
                  <Ionicons
                    name="wifi"
                    size={18}
                    color={
                      connectionMode === 'lan' ? colors.settingsAccent : colors.homeCardDescription
                    }
                  />
                  <Text
                    style={[
                      styles.modeText,
                      {
                        color:
                          connectionMode === 'lan'
                            ? colors.settingsAccent
                            : colors.homeCardDescription,
                      },
                    ]}
                  >
                    局域网
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Tab切换 - 局域网模式下 Web 平台只显示加入房间 */}
          {!(connectionMode === 'lan' && !canCreateLANRoom) && (
            <View style={[styles.tabContainer, { backgroundColor: colors.settingsCardBackground }]}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'join' && { backgroundColor: colors.settingsAccent + '20' },
                ]}
                onPress={() => setActiveTab('join')}
              >
                <Ionicons
                  name="enter"
                  size={18}
                  color={activeTab === 'join' ? colors.settingsAccent : colors.homeCardDescription}
                />
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        activeTab === 'join' ? colors.settingsAccent : colors.homeCardDescription,
                    },
                  ]}
                >
                  加入房间
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'create' && { backgroundColor: colors.settingsAccent + '20' },
                ]}
                onPress={() => setActiveTab('create')}
              >
                <Ionicons
                  name="add-circle"
                  size={18}
                  color={
                    activeTab === 'create' ? colors.settingsAccent : colors.homeCardDescription
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        activeTab === 'create' ? colors.settingsAccent : colors.homeCardDescription,
                    },
                  ]}
                >
                  创建房间
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {activeTab === 'join' && (
            <View style={styles.joinSection}>
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

              {/* 在线模式 - 房间代码输入 */}
              {connectionMode === 'online' && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.homeCardTitle }]}>
                    房间代码
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.settingsCardBackground,
                        borderColor: colors.homeCardBorder,
                        color: colors.homeCardTitle,
                      },
                    ]}
                    value={roomCode}
                    onChangeText={setRoomCode}
                    placeholder="输入6位房间代码"
                    placeholderTextColor={colors.homeCardDescription}
                    autoCapitalize="characters"
                    maxLength={6}
                  />
                  <TouchableOpacity
                    style={[
                      styles.joinButton,
                      { opacity: isLoading || !socket.isConnected ? 0.6 : 1 },
                    ]}
                    onPress={() => handleJoinRoom()}
                    disabled={isLoading || !socket.isConnected}
                  >
                    <LinearGradient colors={['#4CAF50', '#66BB6A']} style={styles.buttonGradient}>
                      <Ionicons name="enter" size={20} color="white" />
                      <Text style={styles.buttonText}>{isLoading ? '加入中...' : '加入房间'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}

              {/* 局域网模式 - 手动输入IP、端口和房间号 */}
              {connectionMode === 'lan' && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.homeCardTitle }]}>
                    手动连接
                  </Text>
                  <View style={styles.manualConnectContainer}>
                    {/* 房间号输入 */}
                    <View style={styles.manualConnectInputWrapper}>
                      <Text style={[styles.inputLabel, { color: colors.homeCardDescription }]}>
                        房间号
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: colors.settingsCardBackground,
                            borderColor: colors.homeCardBorder,
                            color: colors.homeCardTitle,
                          },
                        ]}
                        value={manualLanRoomId}
                        onChangeText={setManualLanRoomId}
                        placeholder="请输入房间号"
                        placeholderTextColor={colors.homeCardDescription}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    {/* IP 和端口输入 */}
                    <View style={styles.manualConnectRow}>
                      <View style={styles.manualConnectInputWrapper}>
                        <Text style={[styles.inputLabel, { color: colors.homeCardDescription }]}>
                          IP地址
                        </Text>
                        <TextInput
                          style={[
                            styles.input,
                            styles.ipInput,
                            {
                              backgroundColor: colors.settingsCardBackground,
                              borderColor: colors.homeCardBorder,
                              color: colors.homeCardTitle,
                            },
                          ]}
                          value={manualLanIP}
                          onChangeText={setManualLanIP}
                          placeholder="192.168.1.100"
                          placeholderTextColor={colors.homeCardDescription}
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="decimal-pad"
                        />
                      </View>
                      <View style={styles.manualConnectInputWrapper}>
                        <Text style={[styles.inputLabel, { color: colors.homeCardDescription }]}>
                          端口
                        </Text>
                        <TextInput
                          style={[
                            styles.input,
                            styles.portInput,
                            {
                              backgroundColor: colors.settingsCardBackground,
                              borderColor: colors.homeCardBorder,
                              color: colors.homeCardTitle,
                            },
                          ]}
                          value={manualLanPort}
                          onChangeText={setManualLanPort}
                          placeholder="3306"
                          placeholderTextColor={colors.homeCardDescription}
                          keyboardType="number-pad"
                        />
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.joinButton, { opacity: isLoading ? 0.6 : 1 }]}
                      onPress={() => handleJoinRoom()}
                      disabled={isLoading}
                    >
                      <LinearGradient colors={['#4CAF50', '#66BB6A']} style={styles.buttonGradient}>
                        <Ionicons name="enter" size={20} color="white" />
                        <Text style={styles.buttonText}>
                          {isLoading ? '连接中...' : '连接并加入'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* 可用房间列表 */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.homeCardTitle }]}>
                    {connectionMode === 'online' ? '可用房间' : '局域网房间'}
                  </Text>
                  {/* 只在支持的平台显示扫描按钮 */}
                  {(connectionMode === 'online' || isLANSupported) && (
                    <TouchableOpacity
                      onPress={
                        connectionMode === 'online'
                          ? handleRefreshOnlineRooms
                          : isScanning
                            ? handleStopScan
                            : handleStartScan
                      }
                      style={[
                        styles.refreshButton,
                        {
                          backgroundColor:
                            connectionMode === 'lan' && isScanning
                              ? '#FF6B6B'
                              : colors.settingsAccent,
                        },
                      ]}
                      disabled={connectionMode === 'online' && !socket.isConnected}
                    >
                      <Ionicons
                        name={
                          connectionMode === 'online' ? 'refresh' : isScanning ? 'stop' : 'search'
                        }
                        size={16}
                        color="white"
                      />
                      <Text style={styles.refreshButtonText}>
                        {connectionMode === 'online' ? '刷新' : isScanning ? '停止' : '扫描'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Web 端局域网模式提示 */}
                {connectionMode === 'lan' && !isLANSupported && (
                  <View style={[styles.warningCard, { marginBottom: 12 }]}>
                    <Ionicons name="information-circle" size={24} color="#FF9500" />
                    <View style={styles.warningContent}>
                      <Text style={styles.warningTitle}>自动扫描不可用</Text>
                      <Text style={styles.warningDesc}>
                        Web 浏览器不支持 UDP 广播，无法自动扫描局域网房间。
                        {'\n'}请使用上方的"手动连接"功能输入：
                        {'\n'}• 房间号（房主提供）
                        {'\n'}• IP 地址（房主设备的局域网 IP）
                        {'\n'}• 端口（默认 3306）
                      </Text>
                    </View>
                  </View>
                )}

                {(isLoadingOnlineRooms || isScanning) && (
                  <View
                    style={[
                      styles.loadingContainer,
                      { backgroundColor: colors.settingsCardBackground },
                    ]}
                  >
                    <Ionicons name="search" size={20} color={colors.settingsAccent} />
                    <Text style={[styles.loadingText, { color: colors.homeCardDescription }]}>
                      {connectionMode === 'online' ? '正在加载房间列表...' : '正在扫描局域网...'}
                    </Text>
                  </View>
                )}

                <View style={styles.roomsList}>
                  {connectionMode === 'online'
                    ? onlineRooms.filter((room) => room.gameStatus === 'waiting').length > 0
                      ? onlineRooms
                          .filter((room) => room.gameStatus === 'waiting')
                          .map(renderOnlineRoomItem)
                      : !isLoadingOnlineRooms && (
                          <View
                            style={[
                              styles.emptyRooms,
                              { backgroundColor: colors.settingsCardBackground },
                            ]}
                          >
                            <Ionicons
                              name="cloud-offline-outline"
                              size={48}
                              color={colors.homeCardDescription}
                            />
                            <Text style={[styles.emptyRoomsTitle, { color: colors.homeCardTitle }]}>
                              暂无可用房间
                            </Text>
                            <Text
                              style={[styles.emptyRoomsDesc, { color: colors.homeCardDescription }]}
                            >
                              您可以创建一个新房间或输入房间代码加入
                            </Text>
                          </View>
                        )
                    : discoveredRooms.length > 0
                      ? discoveredRooms.map(renderLANRoomItem)
                      : !isScanning &&
                        !isLANSupported && (
                          <View
                            style={[
                              styles.emptyRooms,
                              { backgroundColor: colors.settingsCardBackground },
                            ]}
                          >
                            <Ionicons
                              name="desktop-outline"
                              size={48}
                              color={colors.homeCardDescription}
                            />
                            <Text style={[styles.emptyRoomsTitle, { color: colors.homeCardTitle }]}>
                              Web 端无法自动扫描
                            </Text>
                            <Text
                              style={[styles.emptyRoomsDesc, { color: colors.homeCardDescription }]}
                            >
                              请使用移动设备创建房间，然后在此处手动输入房间号、IP 地址和端口连接
                            </Text>
                          </View>
                        )}
                  {!isScanning && isLANSupported && discoveredRooms.length === 0 && (
                    <View
                      style={[
                        styles.emptyRooms,
                        { backgroundColor: colors.settingsCardBackground },
                      ]}
                    >
                      <Ionicons name="wifi-outline" size={48} color={colors.homeCardDescription} />
                      <Text style={[styles.emptyRoomsTitle, { color: colors.homeCardTitle }]}>
                        未发现局域网房间
                      </Text>
                      <Text style={[styles.emptyRoomsDesc, { color: colors.homeCardDescription }]}>
                        请确保您与其他玩家在同一WiFi网络下，或使用手动连接
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {activeTab === 'create' && (
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
                <Text style={[styles.sectionTitle, { color: colors.homeCardTitle }]}>
                  最大玩家数
                </Text>
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
                  colors={
                    connectionMode === 'lan' ? ['#FF9500', '#FF6B35'] : ['#5E5CE6', '#BF5AF2']
                  }
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
          )}
        </ScrollView>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gameInfoCard: {
    margin: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  gameInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  gameInfoTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  gameInfoSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 36,
  },
  connectionModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginLeft: 36,
    gap: 6,
  },
  connectionModeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
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
  modeSelector: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 4,
    gap: 8,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  joinSection: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  createSection: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  manualConnectContainer: {
    gap: 12,
  },
  manualConnectRow: {
    flexDirection: 'row',
    gap: 12,
  },
  manualConnectInputWrapper: {
    flex: 1,
  },
  ipInput: {
    flex: 2,
  },
  portInput: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  roomsList: {
    gap: 12,
  },
  roomCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  roomCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  roomCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  roomCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  roomStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roomStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  roomCardInfo: {
    gap: 8,
    marginBottom: 12,
  },
  roomCardInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomCardInfoText: {
    fontSize: 14,
  },
  roomCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  roomCardGameType: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  roomCardIP: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  emptyRooms: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
    gap: 12,
  },
  emptyRoomsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyRoomsDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  playerCountSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  playerCountButton: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  playerCountText: {
    fontSize: 18,
    fontWeight: '700',
  },
  joinButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#FFEAA7',
    marginBottom: 16,
    gap: 12,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
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
    paddingVertical: 12,
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
