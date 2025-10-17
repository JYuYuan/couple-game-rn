import { Platform } from 'react-native'

export const getLocalIP = async (): Promise<string | undefined> => {
  try {
    // Web 平台使用 WebRTC 获取本地 IP
    if (Platform.OS === 'web') {
      return await getLocalIPWeb()
    }

    // 移动端使用 react-native-network-info
    const { NetworkInfo } = require('react-native-network-info')
    return await NetworkInfo.getIPV4Address()
  } catch (error) {
    console.error('获取IP失败:', error)
    return undefined
  }
}

/**
 * Web 平台使用 WebRTC 获取本地 IP 地址
 * 注意：某些浏览器可能因为隐私策略限制此功能
 */
const getLocalIPWeb = async (): Promise<string | undefined> => {
  return new Promise((resolve) => {
    try {
      // 检查浏览器是否支持 RTCPeerConnection
      if (typeof window === 'undefined' || !window.RTCPeerConnection) {
        console.warn('浏览器不支持 RTCPeerConnection')
        resolve(undefined)
        return
      }

      const pc = new RTCPeerConnection({
        iceServers: [],
      })

      pc.createDataChannel('')

      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch((err) => {
          console.error('创建 offer 失败:', err)
          pc.close()
          resolve(undefined)
        })

      pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) {
          return
        }

        const candidate = ice.candidate.candidate
        // 匹配 IPv4 地址
        const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/
        const match = ipRegex.exec(candidate)

        if (match && match[1]) {
          const ip = match[1]
          // 排除回环地址和保留地址
          if (!ip.startsWith('127.') && !ip.startsWith('0.') && !ip.startsWith('169.254.')) {
            pc.close()
            resolve(ip)
          }
        }
      }

      // 设置超时，避免永久等待
      setTimeout(() => {
        pc.close()
        console.warn('获取本地 IP 超时')
        resolve(undefined)
      }, 5000)
    } catch (error) {
      console.error('Web 获取 IP 失败:', error)
      resolve(undefined)
    }
  })
}

export function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}
