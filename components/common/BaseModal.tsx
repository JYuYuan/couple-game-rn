import React, { ReactNode } from 'react'
import { Modal, StyleSheet, TouchableWithoutFeedback, View, ViewStyle } from 'react-native'
import Animated from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import { useTheme } from '@/hooks/useTheme'
import type { AnimatedStyle } from 'react-native-reanimated'

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
export const BaseModal: React.FC<BaseModalProps> = ({
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
  const { colors } = useTheme()

  const handleBackdropPress = () => {
    if (closeOnBackdropPress) {
      onClose()
    }
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* 背景层 - 包裹所有内容 */}
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          {showBlur && <BlurView intensity={blurIntensity} style={StyleSheet.absoluteFillObject} />}
        </Animated.View>
      </TouchableWithoutFeedback>

      {/* 内容容器 - 使用 pointerEvents 让点击穿透到背景 */}
      <View style={[styles.container, containerStyle]} pointerEvents="box-none">
        {/* Modal 内容 - 阻止点击穿透 */}
        <TouchableWithoutFeedback>
          <Animated.View
            style={[
              styles.modal,
              { backgroundColor: colors.background }, // 使用主题背景色
              modalStyle,
              modalAnimationStyle,
            ]}
          >
            {children}
          </Animated.View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  )
}

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
    borderRadius: 20,
    padding: 20,
    maxWidth: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
})

export default BaseModal
