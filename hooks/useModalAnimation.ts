import { useEffect } from 'react'
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

/**
 * Modal 动画配置选项
 */
export interface ModalAnimationConfig {
  /** 动画持续时间（毫秒） */
  duration?: number
  /** 初始缩放比例 */
  initialScale?: number
  /** 垂直位移距离 */
  translateY?: number
  /** 背景透明度动画时长 */
  backdropDuration?: number
}

/**
 * Modal 动画返回值
 */
export interface ModalAnimationStyles {
  /** 背景遮罩动画样式 */
  backdropStyle: ReturnType<typeof useAnimatedStyle>
  /** Modal 内容动画样式 */
  modalStyle: ReturnType<typeof useAnimatedStyle>
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
 * 统一管理 Modal 组件的显示/隐藏动画
 *
 * @param visible - Modal 是否可见
 * @param config - 动画配置选项
 *
 * @example
 * ```tsx
 * function MyModal({ visible, onClose }) {
 *   const { backdropStyle, modalStyle } = useModalAnimation(visible)
 *
 *   return (
 *     <Modal visible={visible} transparent>
 *       <Animated.View style={[styles.backdrop, backdropStyle]}>
 *         <Animated.View style={[styles.modal, modalStyle]}>
 *           <Text>Modal Content</Text>
 *         </Animated.View>
 *       </Animated.View>
 *     </Modal>
 *   )
 * }
 * ```
 */
export function useModalAnimation(
  visible: boolean,
  config: ModalAnimationConfig = {},
): ModalAnimationStyles {
  const { duration = 300, initialScale = 0.8, translateY = 50, backdropDuration = 200 } = config

  // 动画共享值
  const modalScale = useSharedValue(initialScale)
  const backdropOpacity = useSharedValue(0)
  const modalOpacity = useSharedValue(0)
  const modalTranslateY = useSharedValue(translateY)

  // 当 visible 变化时触发动画
  useEffect(() => {
    if (visible) {
      // 显示动画
      backdropOpacity.value = withTiming(1, { duration: backdropDuration })
      modalScale.value = withTiming(1, { duration })
      modalTranslateY.value = withTiming(0, { duration })
      modalOpacity.value = withTiming(1, { duration: backdropDuration })
    } else {
      // 隐藏动画
      backdropOpacity.value = withTiming(0, { duration: Math.min(backdropDuration, 150) })
      modalScale.value = withTiming(initialScale, { duration: 200 })
      modalTranslateY.value = withTiming(translateY, { duration: 200 })
      modalOpacity.value = withTiming(0, { duration: Math.min(backdropDuration, 150) })
    }
  }, [visible, duration, initialScale, translateY, backdropDuration])

  // 背景遮罩动画样式
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }))

  // Modal 内容动画样式
  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale.value }, { translateY: modalTranslateY.value }],
    opacity: modalOpacity.value,
  }))

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
