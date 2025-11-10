import React, { ReactNode, useCallback } from 'react'
import { Modal, Pressable, StyleSheet, View, ViewStyle } from 'react-native'
import type { AnimatedStyle } from 'react-native-reanimated'
import Animated from 'react-native-reanimated'
import { BlurView } from 'expo-blur'

export interface BaseModalProps {
  /** 是否显示模态框 */
  visible: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 子组件 */
  children: ReactNode
  /** 是否显示模糊背景 */
  showBlur?: boolean
  /** 模糊强度 */
  blurIntensity?: number
  /** 点击背景是否关闭模态框 */
  closeOnBackdropPress?: boolean
  /** 自定义模态框样式 */
  modalStyle?: ViewStyle
  /** 自定义容器样式 */
  containerStyle?: ViewStyle
  /** 背景动画样式 */
  backdropStyle?: AnimatedStyle<ViewStyle>
  /** 模态框动画样式 */
  modalAnimationStyle?: AnimatedStyle<ViewStyle>
}

/**
 * 通用模态框基础组件
 *
 * 提供统一的模态框结构，包含：
 * - 背景模糊效果
 * - 动画支持
 * - 点击背景关闭
 * - 自定义样式支持
 * - 主题支持（夜间模式）
 * - 无障碍性支持
 *
 * @example
 * ```tsx
 * <BaseModal
 *   visible={isVisible}
 *   onClose={() => setIsVisible(false)}
 *   showBlur={true}
 *   closeOnBackdropPress={true}
 * >
 *   <Text>模态框内容</Text>
 * </BaseModal>
 * ```
 */
const BaseModalComponent: React.FC<BaseModalProps> = ({
  visible,
  onClose,
  children,
  showBlur = true,
  blurIntensity = 20,
  closeOnBackdropPress = true,
  modalStyle,
  containerStyle,
  backdropStyle,
  modalAnimationStyle,
}) => {
  // 处理背景点击
  const handleBackdropPress = useCallback(() => {
    if (closeOnBackdropPress) {
      onClose()
    }
  }, [closeOnBackdropPress, onClose])

  // 处理 Android 返回键
  const handleRequestClose = useCallback(() => {
    if (closeOnBackdropPress) {
      onClose()
    }
    // Reason: 当 closeOnBackdropPress 为 false 时，不响应 Android 返回键
    // 这样可以创建强制性模态框（必须通过内部操作关闭）
  }, [closeOnBackdropPress, onClose])

  // 阻止点击事件冒泡到背景
  const handleModalPress = useCallback(() => {
    // Reason: 空函数用于阻止点击事件冒泡，但不触发任何操作
  }, [])

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleRequestClose}
      statusBarTranslucent
      accessible={true}
      accessibilityViewIsModal={true}
      accessibilityLabel="模态对话框"
    >
      {/* 统一容器 - 包含背景和内容 */}
      <View style={[styles.container, containerStyle]} pointerEvents="box-none">
        {/* 背景层 - 可点击关闭 */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} accessible={false}>
          <Animated.View style={[styles.backdrop, backdropStyle]}>
            {showBlur && (
              <BlurView
                intensity={blurIntensity}
                style={StyleSheet.absoluteFillObject}
                tint="dark"
              />
            )}
          </Animated.View>
        </Pressable>

        {/* Modal 内容 - 阻止点击穿透 */}
        <Animated.View style={[styles.modal, modalStyle, modalAnimationStyle]}>
          <Pressable
            onPress={handleModalPress}
            accessible={true}
            accessibilityRole="alert"
            style={styles.modalInner}
          >
            {children}
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  )
}

// 添加 displayName 以便调试
BaseModalComponent.displayName = 'BaseModal'

// 使用 memo 优化性能
export const BaseModal = React.memo(BaseModalComponent)

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    // Reason: 使用 100% 作为默认最大值，不限制宽高
    // 外部可以通过 modalStyle 传入更具体的限制（如居中对话框的 maxWidth: '90%'）
    // 对于底部弹出的场景，可以传入 { width: '100%', marginHorizontal: 0 }
    maxWidth: '100%',
    maxHeight: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalInner: {
    // Reason: 让内容自然撑开，不强制占满容器
    // padding: 20,
  },
})

export default BaseModal
