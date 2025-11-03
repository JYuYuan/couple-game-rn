import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { usePageBase } from '@/hooks/usePageBase'

interface GameInfoCardProps {
  gameType: string
  taskSetName?: string
  connectionMode: 'online' | 'lan'
  getGameTypeText: (type: string) => string
}

export const GameInfoCard: React.FC<GameInfoCardProps> = ({
  gameType,
  taskSetName,
  connectionMode,
  getGameTypeText,
}) => {
  const { colors } = usePageBase()
  return (
    <View style={[styles.gameInfoCard, { backgroundColor: colors.homeCardBackground }]}>
      <View style={styles.gameInfoHeader}>
        <Ionicons name="game-controller" size={24} color={colors.settingsAccent} />
        <Text style={[styles.gameInfoTitle, { color: colors.homeCardTitle }]}>
          {getGameTypeText(gameType)}
        </Text>
      </View>
      <Text style={[styles.gameInfoSubtitle, { color: colors.homeCardDescription }]}>
        {taskSetName || '未选择任务集'}
      </Text>
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
  )
}

const styles = StyleSheet.create({
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
})
