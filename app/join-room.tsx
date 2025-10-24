import React, { useEffect, useRef, useState } from 'react'
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Colors } from '@/constants/theme'
import { useTranslation } from 'react-i18next'
import { useSocket } from '@/hooks/use-socket'
import { JoinLANRoomData, JoinRoomData, LANRoomDiscovery, OnlineRoom } from '@/types/online'
import { LinearGradient } from 'expo-linear-gradient'
import { useSettingsStore } from '@/store'
import { showError } from '@/utils/toast'
import { AvatarGender } from '@/types/settings'
import { AvatarOption, getRandomAvatarByGender } from '@/constants/avatars'
import { AvatarPicker } from '@/components/AvatarPicker'
import { useTasksStore } from '@/store/tasksStore'
import { GameInfoCard } from '@/components/online/GameInfoCard'
import { ModeSelector } from '@/components/online/ModeSelector'
import { useGameTypeText } from '@/components/online/RoomUtils'

export default function JoinRoomPage() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme] as any
  const { t } = useTranslation()
  const socket = useSocket()
  const { networkSettings } = useSettingsStore()
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
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
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
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 检查平台是否支持局域网功能
  const isLANSupported = Platform.OS !== 'web'
  const isOnlineEnabled = networkSettings.enabled
  const isLANEnabled = isLANSupported && networkSettings.lanMode

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

  // 局域网房间扫描
  useEffect(() => {
    if (connectionMode === 'lan' && isLANSupported && isLANEnabled) {
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
  }, [connectionMode, isLANEnabled])

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

  const handleStartScan = async () => {
    if (isScanning) return

    setIsScanning(true)
    try {
      await socket.startRoomScan?.()
      const updateInterval = setInterval(() => {
        const rooms: any = socket.getDiscoveredRooms?.()
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

  const handleStopScan = () => {
    socket.stopRoomScan?.()
    setIsScanning(false)
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
  }

  const handleRefreshOnlineRooms = () => {
    if (socket.isConnected) {
      setIsLoadingOnlineRooms(true)
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

  // 检查是否有可用的模式
  const availableModes = []
  if (isOnlineEnabled) availableModes.push('online')
  if (isLANEnabled) availableModes.push('lan')

  if (availableModes.length === 0) {
    return (
      <>
        <Stack.Screen
          options={{
            title: '加入房间',
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
              请在设置中启用"在线模式"或"局域网模式"
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
          title: '加入房间',
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

            {/* 局域网模式 - 手动输入 */}
            {connectionMode === 'lan' && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.homeCardTitle }]}>
                  手动连接
                </Text>
                <View style={styles.manualConnectContainer}>
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
                    style={[styles.emptyRooms, { backgroundColor: colors.settingsCardBackground }]}
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
        </ScrollView>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
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
  joinSection: {
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
  joinButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
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
