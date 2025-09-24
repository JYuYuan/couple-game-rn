import { NetworkInfo } from 'react-native-network-info'

export const getLocalIP = async () => {
  try {
    return await NetworkInfo.getIPV4Address()
  } catch (error) {
    console.error('获取IP失败:', error)
  }
}

export function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}
