import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

// 定义存储接口
interface StorageInterface {
  getItem: (name: string) => Promise<string | null> | string | null
  setItem: (name: string, value: string) => Promise<void> | void
  removeItem: (name: string) => Promise<void> | void
}

// 创建单例存储实例，避免重复初始化
let storageInstance: StorageInterface | null = null

export const getStorage = () => {
  if (storageInstance) {
    return storageInstance
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Web 端
    storageInstance = localStorage
  } else {
    // React Native
    storageInstance = {
      getItem: async (name: string) => {
        try {
          return await AsyncStorage.getItem(name)
        } catch (error) {
          console.error('Storage getItem error:', error)
          return null
        }
      },
      setItem: async (name: string, value: string) => {
        try {
          await AsyncStorage.setItem(name, value)
        } catch (error) {
          console.error('Storage setItem error:', error)
        }
      },
      removeItem: async (name: string) => {
        try {
          await AsyncStorage.removeItem(name)
        } catch (error) {
          console.error('Storage removeItem error:', error)
        }
      },
    }
  }

  return storageInstance
}

const storage = getStorage()
export default storage
