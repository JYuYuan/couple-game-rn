import React from 'react'
import { useLocalSearchParams } from 'expo-router'
import OnlineGame from '@/components/game/flying/online'
import OfflineGame from '@/components/game/flying/offline'

export default function FlyingChessGame() {
  const params = useLocalSearchParams()

  const isOnlineMode = params.onlineMode === 'true'
  return isOnlineMode ? <OnlineGame /> : <OfflineGame />
}
