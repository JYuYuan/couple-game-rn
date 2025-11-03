import React, { ReactNode } from 'react'
import {
  Animated,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  useColorScheme,
  View,
  ViewStyle,
} from 'react-native'
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
  backdropStyle?: ViewStyle
  /** 模态框动画样式 */
  modalAnimationStyle?: ViewStyle
}

/**
 * 通用模态框基础组件
 *
 * 提供统一的模态框结构，包含：
 * - 背景模糊效果
 * - 动画支持
 * - 点击背景关闭
 * - 自定义样式支持
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
  const colorScheme = useColorScheme() ?? 'light'

  const handleBackdropPress = () => {
    if (closeOnBackdropPress) {
      onClose()
    }
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          {showBlur && <BlurView intensity={blurIntensity} style={StyleSheet.absoluteFillObject} />}
        </Animated.View>
      </TouchableWithoutFeedback>

      <View style={[styles.container, containerStyle]}>
        <TouchableWithoutFeedback>
          <Animated.View
            style={[styles.modal, styles[`modal_${colorScheme}`], modalStyle, modalAnimationStyle]}
          >
            <View style={styles.modalContent}>{children}</View>
          </Animated.View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    flex: 1,
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
  modal_light: {
    backgroundColor: '#FFFFFF',
  },
  modal_dark: {
    backgroundColor: '#2C2C2E',
  },
  modalContent: {
    flex: 1,
  },
})

export default BaseModal
