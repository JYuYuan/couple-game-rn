import { useEffect } from 'react'
import { Dimensions } from 'react-native'
import { useAnimatedStyle, useSharedValue, withTiming, AnimatedStyle } from 'react-native-reanimated'
import type { ViewStyle } from 'react-native'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

/**
 * Modal 动画类型
 */
export type ModalAnimationType = 'scale' | 'slide-bottom' | 'slide-top' | 'fade'

/**
 * Modal 动画配置选项
 */
export interface ModalAnimationConfig {
  /** 动画类型 */
  type?: ModalAnimationType
  /** 动画持续时间（毫秒） */
  duration?: number
  /** 初始缩放比例（仅用于 scale 类型） */
  initialScale?: number
  /** 垂直位移距离（仅用于 scale 类型） */
  translateY?: number
  /** 背景透明度动画时长 */
  backdropDuration?: number
}

/**
 * Modal 动画返回值
 */
export interface ModalAnimationStyles {
  /** 背景遮罩动画样式 */
  backdropStyle: AnimatedStyle<ViewStyle>
  /** Modal 内容动画样式 */
  modalStyle: AnimatedStyle<ViewStyle>
  /** 动画值（用于自定义动画） */
  values: {
    modalScale: ReturnType<typeof useSharedValue<number>>
    backdropOpacity: ReturnType<typeof useSharedValue<number>>
    modalOpacity: ReturnType<typeof useSharedValue<number>>
    modalTranslateY: ReturnType<typeof useSharedValue<number>>
  }
}

/**
 * Modal 动画 Hook
 *
 * 统一管理 Modal 组件的显示/隐藏动画，支持多种动画类型
 *
 * @param visible - Modal 是否可见
 * @param config - 动画配置选项
 *
 * @example
 * ```tsx
 * // 缩放动画（默认）
 * function MyModal({ visible, onClose }) {
 *   const { backdropStyle, modalStyle } = useModalAnimation(visible)
 *   return <Modal>...</Modal>
 * }
 *
 * // 底部滑入动画
 * function BottomSheet({ visible, onClose }) {
 *   const { backdropStyle, modalStyle } = useModalAnimation(visible, {
 *     type: 'slide-bottom',
 *     duration: 350
 *   })
 *   return <Modal>...</Modal>
 * }
 * ```
 */
export function useModalAnimation(
  visible: boolean,
  config: ModalAnimationConfig = {},
): ModalAnimationStyles {
  const {
    type = 'scale',
    duration = 300,
    initialScale = 0.8,
    translateY = 50,
    backdropDuration = 200,
  } = config

  // 动画共享值
  const modalScale = useSharedValue(type === 'scale' ? initialScale : 1)
  const backdropOpacity = useSharedValue(0)
  const modalOpacity = useSharedValue(0)
  const modalTranslateY = useSharedValue(
    type === 'slide-bottom' ? SCREEN_HEIGHT : type === 'slide-top' ? -SCREEN_HEIGHT : translateY
  )

  // 当 visible 变化时触发动画
  useEffect(() => {
    if (visible) {
      // 显示动画
      backdropOpacity.value = withTiming(1, { duration: backdropDuration })
      modalOpacity.value = withTiming(1, { duration: backdropDuration })

      switch (type) {
        case 'scale':
          modalScale.value = withTiming(1, { duration })
          modalTranslateY.value = withTiming(0, { duration })
          break
        case 'slide-bottom':
          modalTranslateY.value = withTiming(0, { duration })
          break
        case 'slide-top':
          modalTranslateY.value = withTiming(0, { duration })
          break
        case 'fade':
          // 仅淡入淡出，无其他动画
          break
      }
    } else {
      // 隐藏动画
      backdropOpacity.value = withTiming(0, { duration: Math.min(backdropDuration, 150) })
      modalOpacity.value = withTiming(0, { duration: Math.min(backdropDuration, 150) })

      switch (type) {
        case 'scale':
          modalScale.value = withTiming(initialScale, { duration: 200 })
          modalTranslateY.value = withTiming(translateY, { duration: 200 })
          break
        case 'slide-bottom':
          modalTranslateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 })
          break
        case 'slide-top':
          modalTranslateY.value = withTiming(-SCREEN_HEIGHT, { duration: 200 })
          break
        case 'fade':
          // 仅淡出
          break
      }
    }
  }, [visible, type, duration, initialScale, translateY, backdropDuration])

  // 背景遮罩动画样式
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }))

  // Modal 内容动画样式
  const modalStyle = useAnimatedStyle(() => {
    const baseStyle = {
      opacity: modalOpacity.value,
    }

    switch (type) {
      case 'scale':
        return {
          ...baseStyle,
          transform: [{ scale: modalScale.value }, { translateY: modalTranslateY.value }],
        }
      case 'slide-bottom':
      case 'slide-top':
        return {
          ...baseStyle,
          transform: [{ translateY: modalTranslateY.value }],
        }
      case 'fade':
        return baseStyle
      default:
        return baseStyle
    }
  })

  return {
    backdropStyle,
    modalStyle,
    values: {
      modalScale,
      backdropOpacity,
      modalOpacity,
      modalTranslateY,
    },
  }
}
