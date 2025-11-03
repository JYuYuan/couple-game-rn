import React, { useEffect, useRef, useState } from 'react'
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Colors } from '@/constants/theme'
import { useTranslation } from 'react-i18next'
import { useSocket } from '@/hooks/use-socket'
import {
  CreateRoomData,
  JoinLANRoomData,
  JoinRoomData,
  LANRoomDiscovery,
  OnlineRoom,
} from '@/types/online'
import { LinearGradient } from 'expo-linear-gradient'
import { TaskSet } from '@/types/tasks'
import { showError } from '@/utils/toast'
import { AvatarGender } from '@/types/settings'
import { AvatarOption, getRandomAvatarByGender } from '@/constants/avatars'
import { AvatarPicker } from '@/components/AvatarPicker'

interface OnlineRoomModalProps {
  visible: boolean
  onClose: () => void
  taskSet: TaskSet | null
  gameType: 'fly' | 'wheel' | 'minesweeper'
  onRoomJoined: (roomId: string) => void
}

export const OnlineRoomModal: React.FC<OnlineRoomModalProps> = ({
  visible,
  onClose,
  taskSet,
  gameType,
  onRoomJoined,
}) => {
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme] as any
  const { t } = useTranslation()
  const socket = useSocket()
  const [activeTab, setActiveTab] = useState<'join' | 'create'>('join')
  const [connectionMode, setConnectionMode] = useState<'online' | 'lan'>('online')
  const [playerName, setPlayerName] = useState('')
  const [roomName, setRoomName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(2)
  const [isLoading, setIsLoading] = useState(false)
  const [discoveredRooms, setDiscoveredRooms] = useState<LANRoomDiscovery[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [onlineRooms, setOnlineRooms] = useState<OnlineRoom[]>([])
  const [isLoadingOnlineRooms, setIsLoadingOnlineRooms] = useState(false)
  const [manualLanIP, setManualLanIP] = useState('')
  const [manualLanPort, setManualLanPort] = useState('8080')

  // 头像和性别状态
  const [selectedGender, setSelectedGender] = useState<AvatarGender>('man')
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarOption | null>(null)

  // 使用 ref 追踪是否已经跳转过，避免重复跳转
  const hasNavigatedRef = useRef(false)

  // 检查平台是否支持局域网功能
  // Web 平台可以使用局域网模式，但不能创建房间
  const isLANSupported = true
  const canCreateLANRoom = Platform.OS !== 'web'

  // 根据游戏类型和任务集设置默认房间名
  useEffect(() => {
    if (visible) {
      const gameTypeName = getGameTypeText(gameType)
      // 生成基于任务集的房间名
      setRoomName(`${gameTypeName}-${taskSet?.id}_${Date.now().toString().slice(-4)}`)
    }
  }, [visible, gameType, taskSet?.id])

  // 当 modal 打开时，重置跳转标记
  useEffect(() => {
    if (visible) {
      hasNavigatedRef.current = false
      // 初始化默认头像
      if (!selectedAvatar) {
        const defaultAvatar = getRandomAvatarByGender(selectedGender)
        setSelectedAvatar(defaultAvatar)
      }
    }
  }, [visible])

  // 监听房间更新 - 只在首次加入房间时跳转一次
  useEffect(() => {
    const currentRoom = connectionMode === 'lan' ? socket.currentLANRoom : socket.currentRoom

    // 只有当房间存在且还没有跳转过时才执行跳转
    if (currentRoom && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true // 标记已经跳转过
      onRoomJoined(currentRoom.id)
      onClose()
    }
  }, [socket.currentRoom, socket.currentLANRoom, connectionMode, onRoomJoined, onClose])

  // 局域网房间扫描
  useEffect(() => {
    if (visible && connectionMode === 'lan' && activeTab === 'join' && isLANSupported) {
      handleStartScan()
    }
    return () => {
      if (connectionMode === 'lan' && isLANSupported) {
        socket.stopRoomScan?.()
        setIsScanning(false)
      }
    }
  }, [visible, connectionMode, activeTab, isLANSupported])

  // 在线房间列表监听
  useEffect(() => {
    if (visible && connectionMode === 'online' && activeTab === 'join') {
      // 请求房间列表
      handleRefreshOnlineRooms()

      // 监听房间列表更新
      const handleRoomList = (rooms: OnlineRoom[]) => {
        console.log('收到在线房间列表:', rooms)
        setOnlineRooms(rooms)
        setIsLoadingOnlineRooms(false)
      }

      socket.on('room:list', handleRoomList)

      // 设置定时刷新
      const refreshInterval = setInterval(() => {
        handleRefreshOnlineRooms()
      }, 5000)

      return () => {
        socket.off('room:list', handleRoomList)
        clearInterval(refreshInterval)
      }
    }
  }, [visible, connectionMode, activeTab])

  const handleCreateRoom = async () => {
    if (!playerName.trim() || !roomName.trim()) {
      showError(t('common.error', '错误'), t('online.error.fillRequired', '请填写所有必需信息'))
      return
    }

    if (!selectedAvatar) {
      showError(t('common.error', '错误'), t('online.error.selectAvatar', '请选择头像'))
      return
    }

    // 检查 Web 平台是否尝试创建局域网房间
    if (connectionMode === 'lan' && !canCreateLANRoom) {
      showError(
        t('common.error', '错误'),
        t('online.lan.webNotSupported', 'Web平台不支持创建局域网房间，请使用移动应用'),
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
        // 切换到局域网模式并创建房间
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
      // 局域网模式：可以通过发现的房间或手动输入IP和端口
      const targetIP = lanRoomData?.hostIP || manualLanIP.trim()
      const targetPort = lanRoomData?.tcpPort || parseInt(manualLanPort, 10)
      const targetRoomId = lanRoomData?.roomId || ''

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
          error instanceof Error ? error.message : t('online.error.joinFailed', '加��房间失败'),
        )
      } finally {
        setIsLoading(false)
      }
    } else {
      // 在线房间加入逻辑
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

  // 局域网房间扫描
  const handleStartScan = async () => {
    if (isScanning) return

    setIsScanning(true)
    try {
      await socket.startRoomScan?.()
      // 定期更新发现的房间列表
      const updateInterval = setInterval(() => {
        const rooms = socket.getDiscoveredRooms?.() as LANRoomDiscovery[] | undefined
        if (rooms) {
          setDiscoveredRooms(rooms)
        }
      }, 1000)

      // 10秒后停止扫描
      setTimeout(() => {
        clearInterval(updateInterval)
        setIsScanning(false)
      }, 10000)
    } catch (error) {
      console.error('启动扫描失败:', error)
      showError(t('common.error', '错误'), '启动局域网扫描失败')
      setIsScanning(false)
    }
  }

  const handleStopScan = () => {
    socket.stopRoomScan?.()
    setIsScanning(false)
  }

  // 刷新在线房间列表
  const handleRefreshOnlineRooms = () => {
    if (socket.isConnected) {
      setIsLoadingOnlineRooms(true)
      // socket.requestRoomList?.() // 暂时注释掉，该方法可能不存在
    }
  }

  // 渲染在线房间项
  const renderOnlineRoomItem = (room: OnlineRoom) => (
    <TouchableOpacity
      key={room.id}
      style={[
        styles.lanRoomItem,
        {
          backgroundColor: colors.homeBackground,
          borderColor: colors.homeCardBorder,
        },
      ]}
      onPress={() => handleJoinRoom(room.id)}
      disabled={isLoading || room.gameStatus !== 'waiting'}
    >
      <View style={styles.lanRoomHeader}>
        <Text style={[styles.lanRoomName, { color: colors.homeCardTitle }]}>{room.name}</Text>
        <Text style={[styles.lanRoomType, { color: colors.settingsAccent }]}>
          {getGameTypeText(room.gameType)}
        </Text>
      </View>
      <View style={styles.lanRoomInfo}>
        <Text style={[styles.lanRoomDetail, { color: colors.homeCardDescription }]}>
          房主: {room.players.find((p) => p.id === room.hostId)?.name || '未知'}
        </Text>
        <Text style={[styles.lanRoomDetail, { color: colors.homeCardDescription }]}>
          玩家: {room.players.length}/{room.maxPlayers}
        </Text>
      </View>
      <View style={styles.onlineRoomStatus}>
        <Text
          style={[
            styles.onlineRoomStatusText,
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
    </TouchableOpacity>
  )

  // 渲染局域网房间项
  const renderLANRoomItem = (room: LANRoomDiscovery) => (
    <TouchableOpacity
      key={room.roomId}
      style={[
        styles.lanRoomItem,
        {
          backgroundColor: colors.homeBackground,
          borderColor: colors.homeCardBorder,
        },
      ]}
      onPress={() => handleJoinRoom(undefined, room)}
      disabled={isLoading}
    >
      <View style={styles.lanRoomHeader}>
        <Text style={[styles.lanRoomName, { color: colors.homeCardTitle }]}>{room.roomName}</Text>
        <Text style={[styles.lanRoomType, { color: colors.settingsAccent }]}>
          {getGameTypeText(room.gameType)}
        </Text>
      </View>
      <View style={styles.lanRoomInfo}>
        <Text style={[styles.lanRoomDetail, { color: colors.homeCardDescription }]}>
          房主: {room.hostName}
        </Text>
        <Text style={[styles.lanRoomDetail, { color: colors.homeCardDescription }]}>
          玩家: {room.currentPlayers}/{room.maxPlayers}
        </Text>
      </View>
      <Text style={[styles.lanRoomIP, { color: colors.homeCardDescription }]}>
        IP: {room.hostIP}
      </Text>
    </TouchableOpacity>
  )

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={[styles.modalContainer, { backgroundColor: colors.homeCardBackground }]}>
          {/* 头部 */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.homeCardTitle }]}>
                {t('online.title', '在线房间')}
              </Text>
              <Text style={[styles.subtitle, { color: colors.homeCardDescription }]}>
                {getGameTypeText(gameType)} • {taskSet?.name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.homeCardDescription} />
            </TouchableOpacity>
          </View>

          {/* 连接状态 */}
          <View
            style={[
              styles.connectionStatus,
              {
                backgroundColor: (connectionMode === 'online' ? socket.isConnected : true)
                  ? '#4CAF50' + '20'
                  : '#FF6B6B' + '20',
              },
            ]}
          >
            <Ionicons
              name={
                connectionMode === 'online'
                  ? socket.isConnected
                    ? 'checkmark-circle'
                    : 'close-circle'
                  : 'wifi'
              }
              size={16}
              color={
                connectionMode === 'online'
                  ? socket.isConnected
                    ? '#4CAF50'
                    : '#FF6B6B'
                  : '#4CAF50'
              }
            />
            <Text
              style={[
                styles.connectionText,
                {
                  color:
                    connectionMode === 'online'
                      ? socket.isConnected
                        ? '#4CAF50'
                        : '#FF6B6B'
                      : '#4CAF50',
                },
              ]}
            >
              {connectionMode === 'online'
                ? socket.isConnected
                  ? t('online.connected', '已连接')
                  : socket.connectionError || t('online.disconnected', '未连接')
                : t('online.lanMode', '局域网模式')}
            </Text>
            {connectionMode === 'online' && !socket.isConnected && (
              <TouchableOpacity onPress={socket.connect}>
                <Text style={[styles.retryText, { color: colors.settingsAccent }]}>
                  {t('online.retry', '重试')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 模式切换器 */}
          <View style={[styles.modeSelector, { backgroundColor: colors.homeBackground }]}>
            <TouchableOpacity
              style={[
                styles.modeTab,
                connectionMode === 'online' && { backgroundColor: colors.settingsAccent + '20' },
              ]}
              onPress={() => setConnectionMode('online')}
            >
              <Ionicons
                name="cloud"
                size={16}
                color={
                  connectionMode === 'online' ? colors.settingsAccent : colors.homeCardDescription
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
                {t('online.mode.online', '在线模式')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeTab,
                connectionMode === 'lan' && { backgroundColor: colors.settingsAccent + '20' },
              ]}
              onPress={() => setConnectionMode('lan')}
            >
              <Ionicons
                name="wifi"
                size={16}
                color={
                  connectionMode === 'lan' ? colors.settingsAccent : colors.homeCardDescription
                }
              />
              <Text
                style={[
                  styles.modeText,
                  {
                    color:
                      connectionMode === 'lan' ? colors.settingsAccent : colors.homeCardDescription,
                  },
                ]}
              >
                {t('online.mode.lan', '局域网')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab切换 */}
          <View style={[styles.tabContainer, { backgroundColor: colors.homeBackground }]}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'join' && { backgroundColor: colors.settingsAccent + '20' },
              ]}
              onPress={() => setActiveTab('join')}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === 'join' ? colors.settingsAccent : colors.homeCardDescription,
                  },
                ]}
              >
                {t('online.tabs.join', '加入房间')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'create' && { backgroundColor: colors.settingsAccent + '20' },
              ]}
              onPress={() => setActiveTab('create')}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === 'create' ? colors.settingsAccent : colors.homeCardDescription,
                  },
                ]}
              >
                {t('online.tabs.create', '创建房间')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 内容区域 */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {activeTab === 'join' && (
              <View style={styles.joinForm}>
                <Text style={[styles.formTitle, { color: colors.homeCardTitle }]}>
                  {connectionMode === 'lan'
                    ? t('online.lan.join.title', '加入局域网房间')
                    : t('online.join.title', '加入房间')}
                </Text>

                {/* 头像选择器 */}
                <AvatarPicker
                  selectedGender={selectedGender}
                  selectedAvatar={selectedAvatar}
                  onGenderChange={setSelectedGender}
                  onAvatarChange={setSelectedAvatar}
                />

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.homeCardDescription }]}>
                    {t('online.playerName', '玩家名称')}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.homeBackground,
                        borderColor: colors.homeCardBorder,
                        color: colors.homeCardTitle,
                      },
                    ]}
                    value={playerName}
                    onChangeText={setPlayerName}
                    placeholder={t('online.playerName.placeholder', '请输入你的名称')}
                    placeholderTextColor={colors.homeCardDescription}
                    maxLength={20}
                  />
                </View>

                {connectionMode === 'online' && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.homeCardDescription }]}>
                      {t('online.roomCode', '房间代码')}
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.homeBackground,
                          borderColor: colors.homeCardBorder,
                          color: colors.homeCardTitle,
                        },
                      ]}
                      value={roomCode}
                      onChangeText={setRoomCode}
                      placeholder={t('online.roomCode.placeholder', '请输入房间代码')}
                      placeholderTextColor={colors.homeCardDescription}
                      autoCapitalize="characters"
                      maxLength={6}
                    />
                  </View>
                )}

                {connectionMode === 'online' && (
                  <View style={styles.lanRoomsSection}>
                    <View style={styles.scanHeader}>
                      <Text style={[styles.label, { color: colors.homeCardDescription }]}>
                        可用房间
                      </Text>
                      <TouchableOpacity
                        onPress={handleRefreshOnlineRooms}
                        style={[styles.scanButton, { backgroundColor: colors.settingsAccent }]}
                        disabled={!socket.isConnected}
                      >
                        <Ionicons name="refresh" size={14} color="white" />
                        <Text style={styles.scanButtonText}>刷新</Text>
                      </TouchableOpacity>
                    </View>

                    {isLoadingOnlineRooms && (
                      <View
                        style={[
                          styles.scanningIndicator,
                          { backgroundColor: colors.homeBackground },
                        ]}
                      >
                        <Ionicons name="search" size={16} color={colors.settingsAccent} />
                        <Text style={[styles.scanningText, { color: colors.homeCardDescription }]}>
                          正在加载房间列表...
                        </Text>
                      </View>
                    )}

                    {onlineRooms.length > 0 ? (
                      <View style={styles.roomsList}>
                        {onlineRooms
                          .filter((room) => room.gameStatus === 'waiting')
                          .map(renderOnlineRoomItem)}
                      </View>
                    ) : (
                      !isLoadingOnlineRooms && (
                        <View
                          style={[styles.noRoomsFound, { backgroundColor: colors.homeBackground }]}
                        >
                          <Ionicons
                            name="cloud-offline-outline"
                            size={24}
                            color={colors.homeCardDescription}
                          />
                          <Text style={[styles.noRoomsText, { color: colors.homeCardDescription }]}>
                            暂无可用房间
                          </Text>
                          <Text style={[styles.noRoomsHint, { color: colors.homeCardDescription }]}>
                            您可以创建一个新房间或输入房间代码加入
                          </Text>
                        </View>
                      )
                    )}
                  </View>
                )}

                {connectionMode === 'lan' && (
                  <View style={styles.lanRoomsSection}>
                    {/* 手动输入IP和端口 */}
                    <View style={styles.manualConnectSection}>
                      <Text style={[styles.label, { color: colors.homeCardDescription }]}>
                        {t('online.lan.manualConnect', '手动连接')}
                      </Text>
                      <View style={styles.manualConnectInputs}>
                        <View style={[styles.inputGroup, { flex: 2 }]}>
                          <TextInput
                            style={[
                              styles.input,
                              {
                                backgroundColor: colors.homeBackground,
                                borderColor: colors.homeCardBorder,
                                color: colors.homeCardTitle,
                              },
                            ]}
                            value={manualLanIP}
                            onChangeText={setManualLanIP}
                            placeholder={t('online.lan.ipPlaceholder', 'IP地址(如: 192.168.1.100)')}
                            placeholderTextColor={colors.homeCardDescription}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="decimal-pad"
                          />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                          <TextInput
                            style={[
                              styles.input,
                              {
                                backgroundColor: colors.homeBackground,
                                borderColor: colors.homeCardBorder,
                                color: colors.homeCardTitle,
                              },
                            ]}
                            value={manualLanPort}
                            onChangeText={setManualLanPort}
                            placeholder={t('online.lan.portPlaceholder', '端口')}
                            placeholderTextColor={colors.homeCardDescription}
                            keyboardType="number-pad"
                          />
                        </View>
                      </View>
                    </View>

                    <View style={styles.scanHeader}>
                      <Text style={[styles.label, { color: colors.homeCardDescription }]}>
                        {t('online.lan.discoveredRooms', '发现的局域网房间')}
                      </Text>
                      <TouchableOpacity
                        onPress={isScanning ? handleStopScan : handleStartScan}
                        style={[
                          styles.scanButton,
                          {
                            backgroundColor: isScanning ? '#FF6B6B' : colors.settingsAccent,
                          },
                        ]}
                      >
                        <Ionicons name={isScanning ? 'stop' : 'refresh'} size={14} color="white" />
                        <Text style={styles.scanButtonText}>
                          {isScanning
                            ? t('online.lan.stopScan', '停止扫描')
                            : t('online.lan.startScan', '扫描')}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {isScanning && (
                      <View
                        style={[
                          styles.scanningIndicator,
                          { backgroundColor: colors.homeBackground },
                        ]}
                      >
                        <Ionicons name="search" size={16} color={colors.settingsAccent} />
                        <Text style={[styles.scanningText, { color: colors.homeCardDescription }]}>
                          {t('online.lan.scanning', '正在扫描局域网房间...')}
                        </Text>
                      </View>
                    )}

                    {discoveredRooms.length > 0 ? (
                      <View style={styles.roomsList}>{discoveredRooms.map(renderLANRoomItem)}</View>
                    ) : (
                      !isScanning && (
                        <View
                          style={[styles.noRoomsFound, { backgroundColor: colors.homeBackground }]}
                        >
                          <Ionicons
                            name="wifi-outline"
                            size={24}
                            color={colors.homeCardDescription}
                          />
                          <Text style={[styles.noRoomsText, { color: colors.homeCardDescription }]}>
                            {t('online.lan.noRooms', '未发现任何局域网房间')}
                          </Text>
                          <Text style={[styles.noRoomsHint, { color: colors.homeCardDescription }]}>
                            {t('online.lan.noRoomsHint', '请确保您与其他玩家在同一WiFi网络下')}
                          </Text>
                        </View>
                      )
                    )}
                  </View>
                )}

                {/* 加入按钮 */}
                {connectionMode === 'online' && (
                  <TouchableOpacity
                    style={[styles.actionButton, { opacity: isLoading ? 0.6 : 1 }]}
                    onPress={() => handleJoinRoom()}
                    disabled={isLoading || !socket.isConnected}
                  >
                    <LinearGradient colors={['#4CAF50', '#66BB6A']} style={styles.buttonGradient}>
                      <Ionicons name="enter" size={20} color="white" />
                      <Text style={styles.buttonText}>
                        {isLoading
                          ? t('online.joining', '加入中...')
                          : t('online.join.button', '加入房间')}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                {connectionMode === 'lan' && (
                  <TouchableOpacity
                    style={[styles.actionButton, { opacity: isLoading ? 0.6 : 1 }]}
                    onPress={() => handleJoinRoom()}
                    disabled={isLoading}
                  >
                    <LinearGradient colors={['#4CAF50', '#66BB6A']} style={styles.buttonGradient}>
                      <Ionicons name="enter" size={20} color="white" />
                      <Text style={styles.buttonText}>
                        {isLoading
                          ? t('online.joining', '加入中...')
                          : t('online.lan.join.button', '连接并加入')}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {activeTab === 'create' && (
              <View style={styles.createForm}>
                <Text style={[styles.formTitle, { color: colors.homeCardTitle }]}>
                  {connectionMode === 'lan'
                    ? t('online.lan.create.title', '创建局域网房间')
                    : t('online.create.title', '创建房间')}
                </Text>

                {/* Web 平台局域网不支持创建房间提示 */}
                {connectionMode === 'lan' && !canCreateLANRoom && (
                  <View
                    style={[
                      styles.webNotSupportedCard,
                      {
                        backgroundColor: '#FFF3CD',
                        borderColor: '#FFEAA7',
                      },
                    ]}
                  >
                    <Ionicons name="warning" size={20} color="#856404" />
                    <View style={styles.webNotSupportedText}>
                      <Text style={[styles.webNotSupportedTitle, { color: '#856404' }]}>
                        {t('online.lan.webNotSupportedTitle', '功能受限')}
                      </Text>
                      <Text style={[styles.webNotSupportedDesc, { color: '#856404' }]}>
                        {t(
                          'online.lan.webNotSupportedDesc',
                          'Web 平台暂不支持局域网房间创建，请使用移动应用获得完整功能',
                        )}
                      </Text>
                    </View>
                  </View>
                )}

                {/* 头像选择器 */}
                <AvatarPicker
                  selectedGender={selectedGender}
                  selectedAvatar={selectedAvatar}
                  onGenderChange={setSelectedGender}
                  onAvatarChange={setSelectedAvatar}
                />

                {/* 游戏信息显示 */}
                <View
                  style={[
                    styles.gameInfoCard,
                    {
                      backgroundColor: colors.homeBackground,
                      borderColor: colors.homeCardBorder,
                    },
                  ]}
                >
                  <View style={styles.gameInfoRow}>
                    <Ionicons name="game-controller" size={16} color={colors.settingsAccent} />
                    <Text style={[styles.gameInfoLabel, { color: colors.homeCardDescription }]}>
                      {t('online.gameType', '游戏类型')}:
                    </Text>
                    <Text style={[styles.gameInfoValue, { color: colors.homeCardTitle }]}>
                      {getGameTypeText(gameType)}
                    </Text>
                  </View>
                  <View style={styles.gameInfoRow}>
                    <Ionicons name="list" size={16} color={colors.settingsAccent} />
                    <Text style={[styles.gameInfoLabel, { color: colors.homeCardDescription }]}>
                      {t('online.taskSet', '任务集')}:
                    </Text>
                    <Text style={[styles.gameInfoValue, { color: colors.homeCardTitle }]}>
                      {taskSet?.name || taskSet?.id}
                    </Text>
                  </View>
                  {connectionMode === 'lan' && (
                    <View style={styles.gameInfoRow}>
                      <Ionicons name="wifi" size={16} color={colors.settingsAccent} />
                      <Text style={[styles.gameInfoLabel, { color: colors.homeCardDescription }]}>
                        {t('online.connectionType', '连接类型')}:
                      </Text>
                      <Text style={[styles.gameInfoValue, { color: colors.homeCardTitle }]}>
                        {t('online.mode.lan', '局域网')}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.homeCardDescription }]}>
                    {t('online.playerName', '玩家名称')}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.homeBackground,
                        borderColor: colors.homeCardBorder,
                        color: colors.homeCardTitle,
                      },
                    ]}
                    value={playerName}
                    onChangeText={setPlayerName}
                    placeholder={t('online.playerName.placeholder', '请输入你的名称')}
                    placeholderTextColor={colors.homeCardDescription}
                    maxLength={20}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.homeCardDescription }]}>
                    {t('online.roomName', '房间名称')}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.homeBackground,
                        borderColor: colors.homeCardBorder,
                        color: colors.homeCardTitle,
                      },
                    ]}
                    value={roomName}
                    onChangeText={setRoomName}
                    placeholder={t('online.roomName.placeholder', '请输入房间名称')}
                    placeholderTextColor={colors.homeCardDescription}
                    maxLength={30}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.homeCardDescription }]}>
                    {t('online.maxPlayers', '最大玩家数')}
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
                                : colors.homeBackground,
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

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      opacity:
                        isLoading || (connectionMode === 'lan' && !canCreateLANRoom) ? 0.6 : 1,
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
                    <Ionicons name="add" size={20} color="white" />
                    <Text style={styles.buttonText}>
                      {isLoading
                        ? t('online.creating', '创建中...')
                        : connectionMode === 'lan'
                          ? canCreateLANRoom
                            ? t('online.lan.create.button', '创建局域网房间')
                            : t('online.lan.webNotSupported', 'Web平台不支持创建')
                          : t('online.create.button', '创建房间')}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  modalContainer: {
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.8,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 8,
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
  tabContainer: {
    flexDirection: 'row',
    margin: 20,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  joinForm: {
    paddingBottom: 20,
  },
  createForm: {
    paddingBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  gameInfoCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  gameInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  gameInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  gameInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  playerCountSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  playerCountButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  playerCountText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 20,
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
  // 新增的局域网相关样式
  modeSelector: {
    flexDirection: 'row',
    margin: 20,
    marginTop: 12,
    borderRadius: 8,
    padding: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  modeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  lanRoomsSection: {
    marginBottom: 16,
  },
  manualConnectSection: {
    marginBottom: 16,
  },
  manualConnectInputs: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  scanningText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  roomsList: {
    gap: 8,
  },
  lanRoomItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  lanRoomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  lanRoomName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  lanRoomType: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  lanRoomInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  lanRoomDetail: {
    fontSize: 14,
  },
  lanRoomIP: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  onlineRoomStatus: {
    marginTop: 4,
  },
  onlineRoomStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noRoomsFound: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 8,
    gap: 8,
  },
  noRoomsText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  noRoomsHint: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  // Web 不支持提示卡片样式
  webNotSupportedCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  webNotSupportedText: {
    flex: 1,
  },
  webNotSupportedTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  webNotSupportedDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
})
