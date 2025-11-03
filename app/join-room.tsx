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
import { Stack, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { usePageBase } from '@/hooks/usePageBase'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { commonStyles, spacing } from '@/constants/commonStyles'
import { useSocket } from '@/hooks/use-socket'
import { JoinLANRoomData, JoinRoomData, LANRoomDiscovery, OnlineRoom } from '@/types/online'
import { useSettingsStore } from '@/store'
import { AvatarGender } from '@/types/settings'
import { AvatarOption, getAvatarById, getRandomAvatarByGender } from '@/constants/avatars'
import { AvatarPicker } from '@/components/AvatarPicker'
import { useTasksStore } from '@/store/tasksStore'
import { GameInfoCard } from '@/components/online/GameInfoCard'
import { ModeSelector } from '@/components/online/ModeSelector'
import { useGameTypeText } from '@/components/online/RoomUtils'

type LANTabType = 'scan' | 'manual'
// 在状态管理部分添加
type OnlineTabType = 'browse' | 'code'

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

  // 状态管理
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
  const [discoveredRooms, setDiscoveredRooms] = useState<LANRoomDiscovery[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [onlineRooms, setOnlineRooms] = useState<OnlineRoom[]>([])
  const [isLoadingOnlineRooms, setIsLoadingOnlineRooms] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [manualLanIP, setManualLanIP] = useState('')
  const [manualLanPort, setManualLanPort] = useState('3306')
  const [manualLanRoomId, setManualLanRoomId] = useState('')
  const [lanTab, setLanTab] = useState<LANTabType>('scan')
  const [onlineTab, setOnlineTab] = useState<OnlineTabType>('browse')

  // 头像和性别状态
  const [selectedGender, setSelectedGender] = useState<AvatarGender>(playerProfile.gender || 'man')
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarOption | null>(
    playerProfile.avatarId ? getAvatarById(playerProfile.avatarId) : null,
  )

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
          avatarId: selectedAvatar.id,
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
          avatarId: selectedAvatar.id,
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
      if (lanTab === 'scan') {
        handleStartScan()
      }
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
              请在设置中启用在线模式或局域网模式
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
            {/* 在线模式 - Tabs */}
            {connectionMode === 'online' && (
              <View style={styles.section}>
                {/* Tabs */}
                <View style={styles.tabsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.tab,
                      onlineTab === 'browse' && styles.tabActive,
                      {
                        backgroundColor:
                          onlineTab === 'browse'
                            ? colors.settingsAccent + '20'
                            : colors.settingsCardBackground,
                        borderColor:
                          onlineTab === 'browse' ? colors.settingsAccent : colors.homeCardBorder,
                      },
                    ]}
                    onPress={() => setOnlineTab('browse')}
                  >
                    <Ionicons
                      name="list"
                      size={18}
                      color={
                        onlineTab === 'browse' ? colors.settingsAccent : colors.homeCardDescription
                      }
                    />
                    <Text
                      style={[
                        styles.tabText,
                        {
                          color:
                            onlineTab === 'browse'
                              ? colors.settingsAccent
                              : colors.homeCardDescription,
                        },
                      ]}
                    >
                      浏览房间
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.tab,
                      onlineTab === 'code' && styles.tabActive,
                      {
                        backgroundColor:
                          onlineTab === 'code'
                            ? colors.settingsAccent + '20'
                            : colors.settingsCardBackground,
                        borderColor:
                          onlineTab === 'code' ? colors.settingsAccent : colors.homeCardBorder,
                      },
                    ]}
                    onPress={() => setOnlineTab('code')}
                  >
                    <Ionicons
                      name="keypad"
                      size={18}
                      color={
                        onlineTab === 'code' ? colors.settingsAccent : colors.homeCardDescription
                      }
                    />
                    <Text
                      style={[
                        styles.tabText,
                        {
                          color:
                            onlineTab === 'code'
                              ? colors.settingsAccent
                              : colors.homeCardDescription,
                        },
                      ]}
                    >
                      输入代码
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 浏览房间内容 */}
                {onlineTab === 'browse' && (
                  <View style={styles.tabContent}>
                    <View style={styles.sectionHeader}>
                      <Text style={[styles.sectionSubtitle, { color: colors.homeCardDescription }]}>
                        浏览所有可加入的在线房间
                      </Text>
                      <TouchableOpacity
                        onPress={handleRefreshOnlineRooms}
                        style={[
                          styles.refreshButton,
                          {
                            backgroundColor: colors.settingsAccent,
                            opacity: !socket.isConnected ? 0.5 : 1,
                          },
                        ]}
                        disabled={!socket.isConnected}
                      >
                        <Ionicons name="refresh" size={16} color="white" />
                        <Text style={styles.refreshButtonText}>刷新</Text>
                      </TouchableOpacity>
                    </View>

                    {isLoadingOnlineRooms && (
                      <View
                        style={[
                          styles.loadingContainer,
                          { backgroundColor: colors.settingsCardBackground },
                        ]}
                      >
                        <Ionicons name="search" size={20} color={colors.settingsAccent} />
                        <Text style={[styles.loadingText, { color: colors.homeCardDescription }]}>
                          正在加载房间列表...
                        </Text>
                      </View>
                    )}

                    <View style={styles.roomsList}>
                      {onlineRooms.filter((room) => room.gameStatus === 'waiting').length > 0 ? (
                        onlineRooms
                          .filter((room) => room.gameStatus === 'waiting')
                          .map(renderOnlineRoomItem)
                      ) : !isLoadingOnlineRooms ? (
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
                            您可以创建一个新房间或使用输入代码功能加入私密房间
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                )}

                {/* 输入代码内容 */}
                {onlineTab === 'code' && (
                  <View style={styles.tabContent}>
                    <Text style={[styles.sectionSubtitle, { color: colors.homeCardDescription }]}>
                      输入6位房间代码快速加入
                    </Text>

                    <View style={styles.codeInputContainer}>
                      <View style={styles.codeInputWrapper}>
                        <Text style={[styles.inputLabel, { color: colors.homeCardDescription }]}>
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
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.joinButton,
                          { opacity: isLoading || !socket.isConnected ? 0.6 : 1 },
                        ]}
                        onPress={() => handleJoinRoom()}
                        disabled={isLoading || !socket.isConnected}
                      >
                        <LinearGradient
                          colors={['#4CAF50', '#66BB6A']}
                          style={styles.buttonGradient}
                        >
                          <Ionicons name="enter" size={20} color="white" />
                          <Text style={styles.buttonText}>
                            {isLoading ? '加入中...' : '加入房间'}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* 局域网模式 - Tabs */}
            {connectionMode === 'lan' && (
              <View style={styles.section}>
                {/* Tabs */}
                <View style={styles.tabsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.tab,
                      lanTab === 'scan' && styles.tabActive,
                      {
                        backgroundColor:
                          lanTab === 'scan'
                            ? colors.settingsAccent + '20'
                            : colors.settingsCardBackground,
                        borderColor:
                          lanTab === 'scan' ? colors.settingsAccent : colors.homeCardBorder,
                      },
                    ]}
                    onPress={() => setLanTab('scan')}
                  >
                    <Ionicons
                      name="search"
                      size={18}
                      color={lanTab === 'scan' ? colors.settingsAccent : colors.homeCardDescription}
                    />
                    <Text
                      style={[
                        styles.tabText,
                        {
                          color:
                            lanTab === 'scan' ? colors.settingsAccent : colors.homeCardDescription,
                        },
                      ]}
                    >
                      扫描房间
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.tab,
                      lanTab === 'manual' && styles.tabActive,
                      {
                        backgroundColor:
                          lanTab === 'manual'
                            ? colors.settingsAccent + '20'
                            : colors.settingsCardBackground,
                        borderColor:
                          lanTab === 'manual' ? colors.settingsAccent : colors.homeCardBorder,
                      },
                    ]}
                    onPress={() => setLanTab('manual')}
                  >
                    <Ionicons
                      name="create"
                      size={18}
                      color={
                        lanTab === 'manual' ? colors.settingsAccent : colors.homeCardDescription
                      }
                    />
                    <Text
                      style={[
                        styles.tabText,
                        {
                          color:
                            lanTab === 'manual'
                              ? colors.settingsAccent
                              : colors.homeCardDescription,
                        },
                      ]}
                    >
                      手动连接
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 扫描房间内容 */}
                {lanTab === 'scan' && (
                  <View style={styles.tabContent}>
                    <View style={styles.sectionHeader}>
                      <Text style={[styles.sectionSubtitle, { color: colors.homeCardDescription }]}>
                        自动扫描局域网中的房间
                      </Text>
                      {isLANSupported && (
                        <TouchableOpacity
                          onPress={isScanning ? handleStopScan : handleStartScan}
                          style={[
                            styles.scanButton,
                            {
                              backgroundColor: isScanning ? '#FF6B6B' : colors.settingsAccent,
                            },
                          ]}
                        >
                          <Ionicons name={isScanning ? 'stop' : 'search'} size={16} color="white" />
                          <Text style={styles.scanButtonText}>
                            {isScanning ? '停止扫描' : '开始扫描'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {!isLANSupported && (
                      <View style={styles.warningCard}>
                        <Ionicons name="information-circle" size={24} color="#FF9500" />
                        <View style={styles.warningContent}>
                          <Text style={styles.warningTitle}>扫描不可用</Text>
                          <Text style={styles.warningDesc}>
                            Web 浏览器不支持 UDP 广播，无法自动扫描局域网房间。请使用手动连接功能。
                          </Text>
                        </View>
                      </View>
                    )}

                    {isScanning && (
                      <View
                        style={[
                          styles.loadingContainer,
                          { backgroundColor: colors.settingsCardBackground },
                        ]}
                      >
                        <Ionicons name="search" size={20} color={colors.settingsAccent} />
                        <Text style={[styles.loadingText, { color: colors.homeCardDescription }]}>
                          正在扫描局域网...
                        </Text>
                      </View>
                    )}

                    <View style={styles.roomsList}>
                      {discoveredRooms.length > 0 ? (
                        discoveredRooms.map(renderLANRoomItem)
                      ) : !isScanning && isLANSupported ? (
                        <View
                          style={[
                            styles.emptyRooms,
                            { backgroundColor: colors.settingsCardBackground },
                          ]}
                        >
                          <Ionicons
                            name="wifi-outline"
                            size={48}
                            color={colors.homeCardDescription}
                          />
                          <Text style={[styles.emptyRoomsTitle, { color: colors.homeCardTitle }]}>
                            未发现局域网房间
                          </Text>
                          <Text
                            style={[styles.emptyRoomsDesc, { color: colors.homeCardDescription }]}
                          >
                            请确保您与其他玩家在同一WiFi网络下，点击开始扫描按钮扫描房间
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                )}

                {/* 手动连接内容 */}
                {lanTab === 'manual' && (
                  <View style={styles.tabContent}>
                    <Text style={[styles.sectionSubtitle, { color: colors.homeCardDescription }]}>
                      手动输入房间信息连接
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
                        <View style={[styles.manualConnectInputWrapper, { flex: 2 }]}>
                          <Text style={[styles.inputLabel, { color: colors.homeCardDescription }]}>
                            IP地址
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
                            value={manualLanIP}
                            onChangeText={setManualLanIP}
                            placeholder="192.168.1.100"
                            placeholderTextColor={colors.homeCardDescription}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="decimal-pad"
                          />
                        </View>
                        <View style={[styles.manualConnectInputWrapper, { flex: 1 }]}>
                          <Text style={[styles.inputLabel, { color: colors.homeCardDescription }]}>
                            端口
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
                        <LinearGradient
                          colors={['#4CAF50', '#66BB6A']}
                          style={styles.buttonGradient}
                        >
                          <Ionicons name="enter" size={20} color="white" />
                          <Text style={styles.buttonText}>
                            {isLoading ? '连接中...' : '连接并加入'}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* 在线模式 - 可用房间列表 */}
            {connectionMode === 'online' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.homeCardTitle }]}>
                    可用房间
                  </Text>
                  <TouchableOpacity
                    onPress={handleRefreshOnlineRooms}
                    style={[
                      styles.refreshButton,
                      {
                        backgroundColor: colors.settingsAccent,
                      },
                    ]}
                    disabled={!socket.isConnected}
                  >
                    <Ionicons name="refresh" size={16} color="white" />
                    <Text style={styles.refreshButtonText}>刷新</Text>
                  </TouchableOpacity>
                </View>

                {isLoadingOnlineRooms && (
                  <View
                    style={[
                      styles.loadingContainer,
                      { backgroundColor: colors.settingsCardBackground },
                    ]}
                  >
                    <Ionicons name="search" size={20} color={colors.settingsAccent} />
                    <Text style={[styles.loadingText, { color: colors.homeCardDescription }]}>
                      正在加载房间列表...
                    </Text>
                  </View>
                )}

                <View style={styles.roomsList}>
                  {onlineRooms.filter((room) => room.gameStatus === 'waiting').length > 0 ? (
                    onlineRooms
                      .filter((room) => room.gameStatus === 'waiting')
                      .map(renderOnlineRoomItem)
                  ) : !isLoadingOnlineRooms ? (
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
                      <Text style={[styles.emptyRoomsDesc, { color: colors.homeCardDescription }]}>
                        您可以创建一个新房间或输入房间代码加入
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            )}
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
  section: {
    ...commonStyles.marginBottom20,
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
    ...commonStyles.marginBottom12,
  },
  sectionSubtitle: {
    fontSize: 14,
    ...commonStyles.marginBottom12,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    ...commonStyles.button,
    paddingVertical: spacing.md,
    borderWidth: 2,
    gap: 6,
  },
  tabActive: {
    borderWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabContent: {
    marginTop: 8,
  },
  manualConnectContainer: {
    gap: 12,
    marginTop: 12,
  },
  manualConnectRow: {
    flexDirection: 'row',
    gap: 12,
  },
  manualConnectInputWrapper: {
    flex: 1,
  },
  input: {
    ...commonStyles.input,
    borderWidth: 1,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
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
    ...commonStyles.button,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
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
  codeInputContainer: {
    gap: 12,
    marginTop: 12,
  },
  codeInputWrapper: {
    flex: 1,
  },
})
