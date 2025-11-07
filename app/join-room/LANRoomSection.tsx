import React from 'react'
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { spacing } from '@/constants/commonStyles'
import { LANRoomDiscovery } from '@/types/online'
import { LANTabType } from './types'

interface LANRoomSectionProps {
  visible: boolean
  discoveredRooms: LANRoomDiscovery[]
  isScanning: boolean
  manualIP: string
  setManualIP: (ip: string) => void
  manualPort: string
  setManualPort: (port: string) => void
  manualRoomId: string
  setManualRoomId: (id: string) => void
  onStartScan: () => void
  onStopScan: () => void
  onJoinRoom: (roomId?: string, lanRoomData?: LANRoomDiscovery) => void
  isLoading: boolean
  lanTab: LANTabType
  setLanTab: (tab: LANTabType) => void
  isLANSupported: boolean
  getGameTypeText: (gameType: string) => string
  colors: any
  t: (key: string, fallback: string) => string
}

/**
 * 局域网房间部分组件
 * 包括房间扫描和手动连接两个Tab
 */
export default function LANRoomSection({
  visible,
  discoveredRooms,
  isScanning,
  manualIP,
  setManualIP,
  manualPort,
  setManualPort,
  manualRoomId,
  setManualRoomId,
  onStartScan,
  onStopScan,
  onJoinRoom,
  isLoading,
  lanTab,
  setLanTab,
  isLANSupported,
  getGameTypeText,
  colors,
  t,
}: LANRoomSectionProps) {
  if (!visible) return null

  // 渲染单个局域网房间卡片
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
      onPress={() => onJoinRoom(undefined, room)}
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
          <Text style={[styles.roomStatusText, { color: '#4CAF50' }]}>
            {t('joinRoom.lan', '局域网')}
          </Text>
        </View>
      </View>

      <View style={styles.roomCardInfo}>
        <View style={styles.roomCardInfoItem}>
          <Ionicons name="person" size={16} color={colors.homeCardDescription} />
          <Text style={[styles.roomCardInfoText, { color: colors.homeCardDescription }]}>
            {t('joinRoom.host', '房主')}: {room.hostName}
          </Text>
        </View>
        <View style={styles.roomCardInfoItem}>
          <Ionicons name="people" size={16} color={colors.homeCardDescription} />
          <Text style={[styles.roomCardInfoText, { color: colors.homeCardDescription }]}>
            {room.currentPlayers}/{room.maxPlayers} {t('joinRoom.players', '人')}
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

  return (
    <View style={styles.section}>
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            lanTab === 'scan' && styles.tabActive,
            {
              backgroundColor:
                lanTab === 'scan' ? colors.settingsAccent + '20' : colors.settingsCardBackground,
              borderColor: lanTab === 'scan' ? colors.settingsAccent : colors.homeCardBorder,
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
                color: lanTab === 'scan' ? colors.settingsAccent : colors.homeCardDescription,
              },
            ]}
          >
            {t('joinRoom.scanRooms', '扫描房间')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            lanTab === 'manual' && styles.tabActive,
            {
              backgroundColor:
                lanTab === 'manual' ? colors.settingsAccent + '20' : colors.settingsCardBackground,
              borderColor: lanTab === 'manual' ? colors.settingsAccent : colors.homeCardBorder,
            },
          ]}
          onPress={() => setLanTab('manual')}
        >
          <Ionicons
            name="create"
            size={18}
            color={lanTab === 'manual' ? colors.settingsAccent : colors.homeCardDescription}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: lanTab === 'manual' ? colors.settingsAccent : colors.homeCardDescription,
              },
            ]}
          >
            {t('joinRoom.manualConnect', '手动连接')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 扫描房间内容 */}
      {lanTab === 'scan' && (
        <View style={styles.tabContent}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionSubtitle, { color: colors.homeCardDescription }]}>
              {t('joinRoom.scanDescription', '自动扫描局域网中的房间')}
            </Text>
            {isLANSupported && (
              <TouchableOpacity
                onPress={isScanning ? onStopScan : onStartScan}
                style={[
                  styles.scanButton,
                  {
                    backgroundColor: isScanning ? '#FF6B6B' : colors.settingsAccent,
                  },
                ]}
              >
                <Ionicons name={isScanning ? 'stop' : 'search'} size={16} color="white" />
                <Text style={styles.scanButtonText}>
                  {isScanning ? t('joinRoom.stopScan', '停止扫描') : t('joinRoom.startScan', '开始扫描')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {!isLANSupported && (
            <View style={styles.warningCard}>
              <Ionicons name="information-circle" size={24} color="#FF9500" />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>
                  {t('joinRoom.scanUnavailable', '扫描不可用')}
                </Text>
                <Text style={styles.warningDesc}>
                  {t(
                    'joinRoom.scanUnavailableDesc',
                    'Web 浏览器不支持 UDP 广播,无法自动扫描局域网房间。请使用手动连接功能。',
                  )}
                </Text>
              </View>
            </View>
          )}

          {isScanning && (
            <View
              style={[styles.loadingContainer, { backgroundColor: colors.settingsCardBackground }]}
            >
              <Ionicons name="search" size={20} color={colors.settingsAccent} />
              <Text style={[styles.loadingText, { color: colors.homeCardDescription }]}>
                {t('joinRoom.scanning', '正在扫描局域网...')}
              </Text>
            </View>
          )}

          <View style={styles.roomsList}>
            {discoveredRooms.length > 0 ? (
              discoveredRooms.map(renderLANRoomItem)
            ) : !isScanning && isLANSupported ? (
              <View style={[styles.emptyRooms, { backgroundColor: colors.settingsCardBackground }]}>
                <Ionicons name="wifi-outline" size={48} color={colors.homeCardDescription} />
                <Text style={[styles.emptyRoomsTitle, { color: colors.homeCardTitle }]}>
                  {t('joinRoom.noLANRooms', '未发现局域网房间')}
                </Text>
                <Text style={[styles.emptyRoomsDesc, { color: colors.homeCardDescription }]}>
                  {t(
                    'joinRoom.noLANRoomsHint',
                    '请确保您与其他玩家在同一WiFi网络下,点击开始扫描按钮扫描房间',
                  )}
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
            {t('joinRoom.manualDescription', '手动输入房间信息连接')}
          </Text>

          <View style={styles.manualConnectContainer}>
            <View style={styles.manualConnectInputWrapper}>
              <Text style={[styles.inputLabel, { color: colors.homeCardDescription }]}>
                {t('joinRoom.roomId', '房间号')}
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
                value={manualRoomId}
                onChangeText={setManualRoomId}
                placeholder={t('joinRoom.roomIdPlaceholder', '请输入房间号')}
                placeholderTextColor={colors.homeCardDescription}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.manualConnectRow}>
              <View style={[styles.manualConnectInputWrapper, { flex: 2 }]}>
                <Text style={[styles.inputLabel, { color: colors.homeCardDescription }]}>
                  {t('joinRoom.ipAddress', 'IP地址')}
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
                  value={manualIP}
                  onChangeText={setManualIP}
                  placeholder="192.168.1.100"
                  placeholderTextColor={colors.homeCardDescription}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.manualConnectInputWrapper, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.homeCardDescription }]}>
                  {t('joinRoom.port', '端口')}
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
                  value={manualPort}
                  onChangeText={setManualPort}
                  placeholder="3306"
                  placeholderTextColor={colors.homeCardDescription}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.joinButton, { opacity: isLoading ? 0.6 : 1 }]}
              onPress={() => onJoinRoom()}
              disabled={isLoading}
            >
              <LinearGradient colors={['#4CAF50', '#66BB6A']} style={styles.buttonGradient}>
                <Ionicons name="enter" size={20} color="white" />
                <Text style={styles.buttonText}>
                  {isLoading
                    ? t('joinRoom.connecting', '连接中...')
                    : t('joinRoom.connectAndJoin', '连接并加入')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
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
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderRadius: 12,
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#FFEAA7',
    marginBottom: spacing.lg,
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
  roomsList: {
    gap: spacing.md,
  },
  roomCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
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
    marginBottom: spacing.md,
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
    marginBottom: spacing.md,
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
    paddingTop: spacing.md,
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
    gap: spacing.md,
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
  manualConnectContainer: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  manualConnectRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  manualConnectInputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  joinButton: {
    borderRadius: 12,
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
})
