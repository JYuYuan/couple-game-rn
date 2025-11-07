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
import { OnlineRoom } from '@/types/online'
import { OnlineTabType } from './types'

interface OnlineRoomSectionProps {
  visible: boolean
  rooms: OnlineRoom[]
  isLoading: boolean
  roomCode: string
  setRoomCode: (code: string) => void
  onRefresh: () => void
  onJoinRoom: (roomId?: string) => void
  isConnected: boolean
  onlineTab: OnlineTabType
  setOnlineTab: (tab: OnlineTabType) => void
  getGameTypeText: (gameType: string) => string
  colors: any
  t: (key: string, fallback: string) => string
}

/**
 * 在线房间部分组件
 * 包括房间浏览和房间代码输入两个Tab
 */
export default function OnlineRoomSection({
  visible,
  rooms,
  isLoading,
  roomCode,
  setRoomCode,
  onRefresh,
  onJoinRoom,
  isConnected,
  onlineTab,
  setOnlineTab,
  getGameTypeText,
  colors,
  t,
}: OnlineRoomSectionProps) {
  if (!visible) return null

  // 渲染单个在线房间卡片
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
      onPress={() => onJoinRoom(room.id)}
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
              ? t('joinRoom.waiting', '等待中')
              : room.gameStatus === 'playing'
                ? t('joinRoom.playing', '游戏中')
                : t('joinRoom.finished', '已结束')}
          </Text>
        </View>
      </View>

      <View style={styles.roomCardInfo}>
        <View style={styles.roomCardInfoItem}>
          <Ionicons name="person" size={16} color={colors.homeCardDescription} />
          <Text style={[styles.roomCardInfoText, { color: colors.homeCardDescription }]}>
            {t('joinRoom.host', '房主')}: {room.players.find((p) => p.id === room.hostId)?.name || t('joinRoom.unknown', '未知')}
          </Text>
        </View>
        <View style={styles.roomCardInfoItem}>
          <Ionicons name="people" size={16} color={colors.homeCardDescription} />
          <Text style={[styles.roomCardInfoText, { color: colors.homeCardDescription }]}>
            {room.players.length}/{room.maxPlayers} {t('joinRoom.players', '人')}
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

  // 待加入的房间列表
  const waitingRooms = rooms.filter((room) => room.gameStatus === 'waiting')

  return (
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
            color={onlineTab === 'browse' ? colors.settingsAccent : colors.homeCardDescription}
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  onlineTab === 'browse' ? colors.settingsAccent : colors.homeCardDescription,
              },
            ]}
          >
            {t('joinRoom.browseRooms', '浏览房间')}
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
              borderColor: onlineTab === 'code' ? colors.settingsAccent : colors.homeCardBorder,
            },
          ]}
          onPress={() => setOnlineTab('code')}
        >
          <Ionicons
            name="keypad"
            size={18}
            color={onlineTab === 'code' ? colors.settingsAccent : colors.homeCardDescription}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: onlineTab === 'code' ? colors.settingsAccent : colors.homeCardDescription,
              },
            ]}
          >
            {t('joinRoom.enterCode', '输入代码')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 浏览房间内容 */}
      {onlineTab === 'browse' && (
        <View style={styles.tabContent}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionSubtitle, { color: colors.homeCardDescription }]}>
              {t('joinRoom.browseDescription', '浏览所有可加入的在线房间')}
            </Text>
            <TouchableOpacity
              onPress={onRefresh}
              style={[
                styles.refreshButton,
                {
                  backgroundColor: colors.settingsAccent,
                  opacity: !isConnected ? 0.5 : 1,
                },
              ]}
              disabled={!isConnected}
            >
              <Ionicons name="refresh" size={16} color="white" />
              <Text style={styles.refreshButtonText}>{t('joinRoom.refresh', '刷新')}</Text>
            </TouchableOpacity>
          </View>

          {isLoading && (
            <View
              style={[styles.loadingContainer, { backgroundColor: colors.settingsCardBackground }]}
            >
              <Ionicons name="search" size={20} color={colors.settingsAccent} />
              <Text style={[styles.loadingText, { color: colors.homeCardDescription }]}>
                {t('joinRoom.loadingRooms', '正在加载房间列表...')}
              </Text>
            </View>
          )}

          <View style={styles.roomsList}>
            {waitingRooms.length > 0 ? (
              waitingRooms.map(renderOnlineRoomItem)
            ) : !isLoading ? (
              <View style={[styles.emptyRooms, { backgroundColor: colors.settingsCardBackground }]}>
                <Ionicons name="cloud-offline-outline" size={48} color={colors.homeCardDescription} />
                <Text style={[styles.emptyRoomsTitle, { color: colors.homeCardTitle }]}>
                  {t('joinRoom.noRooms', '暂无可用房间')}
                </Text>
                <Text style={[styles.emptyRoomsDesc, { color: colors.homeCardDescription }]}>
                  {t('joinRoom.noRoomsHint', '您可以创建一个新房间或使用输入代码功能加入私密房间')}
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
            {t('joinRoom.codeDescription', '输入6位房间代码快速加入')}
          </Text>

          <View style={styles.codeInputContainer}>
            <View style={styles.codeInputWrapper}>
              <Text style={[styles.inputLabel, { color: colors.homeCardDescription }]}>
                {t('joinRoom.roomCode', '房间代码')}
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
                placeholder={t('joinRoom.codePlaceholder', '输入6位房间代码')}
                placeholderTextColor={colors.homeCardDescription}
                autoCapitalize="characters"
                maxLength={6}
              />
            </View>

            <TouchableOpacity
              style={[styles.joinButton, { opacity: isLoading || !isConnected ? 0.6 : 1 }]}
              onPress={() => onJoinRoom()}
              disabled={isLoading || !isConnected}
            >
              <LinearGradient colors={['#4CAF50', '#66BB6A']} style={styles.buttonGradient}>
                <Ionicons name="enter" size={20} color="white" />
                <Text style={styles.buttonText}>
                  {isLoading ? t('joinRoom.joining', '加入中...') : t('joinRoom.join', '加入房间')}
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
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
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
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    fontStyle: 'italic',
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
  codeInputContainer: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  codeInputWrapper: {
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
