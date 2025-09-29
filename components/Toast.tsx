import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { setToastRef } from '@/utils/toast'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastData {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  onPress?: () => void
}

interface ToastItem extends ToastData {
  animatedValue: Animated.Value
}

interface ToastContextType {
  showToast: (toast: Omit<ToastData, 'id'>) => void
  hideToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

const TOAST_MARGIN = 16
const TOAST_HEIGHT = 80

const getToastConfig = (type: ToastType) => {
  switch (type) {
    case 'success':
      return {
        backgroundColor: '#4CAF50',
        icon: 'checkmark-circle' as const,
        textColor: '#FFFFFF',
      }
    case 'error':
      return {
        backgroundColor: '#F44336',
        icon: 'close-circle' as const,
        textColor: '#FFFFFF',
      }
    case 'info':
      return {
        backgroundColor: '#2196F3',
        icon: 'information-circle' as const,
        textColor: '#FFFFFF',
      }
  }
}

const ToastItemComponent: React.FC<{
  toast: ToastItem
  onHide: (id: string) => void
  index: number
}> = ({ toast, onHide, index }) => {
  const config = getToastConfig(toast.type)

  useEffect(() => {
    // 入场动画
    Animated.spring(toast.animatedValue, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start()

    // 自动隐藏
    const timer = setTimeout(() => {
      hideToast()
    }, toast.duration || 3000)

    return () => clearTimeout(timer)
  }, [])

  const hideToast = () => {
    Animated.timing(toast.animatedValue, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onHide(toast.id)
    })
  }

  const translateY = toast.animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 0],
  })

  const opacity = toast.animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  })

  const topOffset = index * (TOAST_HEIGHT + 8) + 60 // 状态栏高度 + 间距

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          backgroundColor: config.backgroundColor,
          transform: [{ translateY }],
          opacity,
          top: topOffset,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.toastContent}
        onPress={toast.onPress}
        activeOpacity={toast.onPress ? 0.8 : 1}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={config.icon} size={24} color={config.textColor} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: config.textColor }]}>
            {toast.title}
          </Text>
          {toast.message && (
            <Text style={[styles.message, { color: config.textColor }]}>
              {toast.message}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={hideToast}>
          <Ionicons name="close" size={20} color={config.textColor} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  )
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = (toastData: Omit<ToastData, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36)
    const newToast: ToastItem = {
      ...toastData,
      id,
      animatedValue: new Animated.Value(0),
    }

    setToasts((prev) => [...prev, newToast])
  }

  const hideToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  // 设置全局引用
  useEffect(() => {
    setToastRef({ showToast, hideToast })
    return () => setToastRef(null)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <View style={styles.toastOverlay} pointerEvents="box-none">
        {toasts.map((toast, index) => (
          <ToastItemComponent
            key={toast.id}
            toast={toast}
            onHide={hideToast}
            index={index}
          />
        ))}
      </View>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

const styles = StyleSheet.create({
  toastOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
  toastContainer: {
    position: 'absolute',
    left: TOAST_MARGIN,
    right: TOAST_MARGIN,
    height: TOAST_HEIGHT,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  toastContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    opacity: 0.9,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
})