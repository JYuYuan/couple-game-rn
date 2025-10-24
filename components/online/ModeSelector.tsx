import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Colors } from '@/constants/theme'

interface ModeSelectorProps {
  connectionMode: 'online' | 'lan'
  onModeChange: (mode: 'online' | 'lan') => void
  isOnlineEnabled: boolean
  isLANEnabled: boolean
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  connectionMode,
  onModeChange,
  isOnlineEnabled,
  isLANEnabled,
}) => {
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme] as any

  const availableModes = []
  if (isOnlineEnabled) availableModes.push('online')
  if (isLANEnabled) availableModes.push('lan')

  if (availableModes.length <= 1) return null

  return (
    <View style={[styles.modeSelector, { backgroundColor: colors.settingsCardBackground }]}>
      {isOnlineEnabled && (
        <TouchableOpacity
          style={[
            styles.modeTab,
            connectionMode === 'online' && {
              backgroundColor: colors.settingsAccent + '20',
            },
          ]}
          onPress={() => onModeChange('online')}
        >
          <Ionicons
            name="cloud"
            size={18}
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
          onPress={() => onModeChange('lan')}
        >
          <Ionicons
            name="wifi"
            size={18}
            color={connectionMode === 'lan' ? colors.settingsAccent : colors.homeCardDescription}
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
  )
}

const styles = StyleSheet.create({
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
})
