// ConfirmDialog.tsx
import React, { useEffect, useState } from 'react'
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Colors } from '@/constants/theme'

// Dialog 配置类型
export interface ConfirmDialogOptions {
  title?: string
  message?: string
  confirmText?: string
  cancelText?: false | string
  confirmColor?: string
  cancelColor?: string
  icon?: string
  iconColor?: string
  destructive?: boolean
}

// 组件内部状态
interface DialogState extends ConfirmDialogOptions {
  visible: boolean
  resolve?: (value: boolean) => void
}

// ====== 核心组件 ======
let showDialog: (options: ConfirmDialogOptions) => Promise<boolean>

export function ConfirmDialogProvider() {
  const [state, setState] = useState<DialogState>({ visible: false })

  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme] as any

  // 动画状态
  const modalScale = useSharedValue(0.8)
  const backdropOpacity = useSharedValue(0)
  const modalOpacity = useSharedValue(0)
  const modalTranslateY = useSharedValue(50)

  useEffect(() => {
    if (state.visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 })
      modalScale.value = withTiming(1, { duration: 300 })
      modalTranslateY.value = withTiming(0, { duration: 300 })
      modalOpacity.value = withTiming(1, { duration: 200 })
    } else {
      backdropOpacity.value = withTiming(0, { duration: 150 })
      modalScale.value = withTiming(0.8, { duration: 200 })
      modalTranslateY.value = withTiming(50, { duration: 200 })
      modalOpacity.value = withTiming(0, { duration: 150 })
    }
  }, [state.visible])

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }))
  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale.value }, { translateY: modalTranslateY.value }],
    opacity: modalOpacity.value,
  }))

  // 按钮行为：修改状态，触发 resolve
  const handleConfirm = () => {
    state.resolve?.(true)
    setState({ ...state, visible: false })
  }
  const handleCancel = () => {
    state.resolve?.(false)
    setState({ ...state, visible: false })
  }

  // 把全局 showDialog 函数实现
  showDialog = (options: ConfirmDialogOptions) => {
    return new Promise((resolve) => {
      setState({
        visible: true,
        resolve,
        ...options,
      })
    })
  }

  if (!state.visible) return null

  const {
    title = '确认操作',
    message = '',
    confirmText = '确认',
    cancelText = '取消',
    confirmColor = '#4CAF50',
    cancelColor = '#666',
    icon,
    iconColor,
    destructive = false,
  } = state

  const finalConfirmColor = destructive ? '#FF6B6B' : confirmColor

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleCancel}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
      </Animated.View>

      <View style={styles.container}>
        <Animated.View style={[styles.modal, modalStyle]}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.homeCardBackground,
                borderColor: colors.homeCardBorder,
              },
            ]}
          >
            {icon && (
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: (iconColor || finalConfirmColor) + '15' },
                ]}
              >
                <Ionicons name={icon as any} size={32} color={iconColor || finalConfirmColor} />
              </View>
            )}

            {title ? (
              <Text style={[styles.title, { color: colors.homeCardTitle }]}>{title}</Text>
            ) : null}
            {message ? (
              <Text style={[styles.message, { color: colors.homeCardDescription }]}>{message}</Text>
            ) : null}

            <View style={styles.buttonContainer}>
              {cancelText !== false && (
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleCancel}
                  activeOpacity={0.8}
                >
                  <View style={[styles.buttonContent, { backgroundColor: cancelColor + '15' }]}>
                    <Text style={[styles.buttonText, { color: cancelColor }]}>{cancelText}</Text>
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, styles.confirmButton]}
                onPress={handleConfirm}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[finalConfirmColor, finalConfirmColor + 'CC']}
                  style={styles.buttonContent}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={[styles.buttonText, { color: 'white' }]}>{confirmText}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

// 提供一个可直接调用的函数
export function showConfirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  if (!showDialog) {
    console.warn('ConfirmDialogProvider not mounted!')
    return Promise.resolve(false)
  }
  return showDialog(options)
}

// 你的样式保持不变 ↓
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 26,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    opacity: 0.8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelButton: {},
  confirmButton: {},
  buttonContent: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
})
