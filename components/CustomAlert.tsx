import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/hooks/useTheme'
import { useModalAnimation } from '@/hooks/useModalAnimation'
import { BaseModal } from './common/BaseModal'
import { BaseButton } from './common/BaseButton'

export interface AlertButton {
  text: string
  onPress?: () => void
  style?: 'default' | 'cancel' | 'destructive'
}

interface CustomAlertProps {
  visible: boolean
  title: string
  message?: string
  buttons: AlertButton[]
  onClose: () => void
}

export const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  buttons,
  onClose,
}) => {
  const { colors } = useTheme()
  const { backdropStyle, modalStyle: animatedModalStyle } = useModalAnimation(visible)

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress()
    }
    onClose()
  }

  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      backdropStyle={backdropStyle}
      modalAnimationStyle={animatedModalStyle}
      modalStyle={styles.alertContainer}
    >
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {message && <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>}
      <View style={styles.buttonContainer}>
        {buttons.map((button, index) => (
          <BaseButton
            key={index}
            title={button.text}
            variant={
              button.style === 'destructive'
                ? 'danger'
                : button.style === 'cancel'
                  ? 'secondary'
                  : 'primary'
            }
            size="medium"
            onPress={() => handleButtonPress(button)}
            style={styles.button}
          />
        ))}
      </View>
    </BaseModal>
  )
}

const styles = StyleSheet.create({
  alertContainer: {
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
})

// 辅助函数，提供类似Alert.alert的API
export const showCustomAlert = (
  _title: string,
  _message?: string,
  _buttons?: AlertButton[],
): Promise<void> => {
  return new Promise((resolve) => {
    // 这里我们需要通过全局状态或Context来显示对话框
    // 暂时返回一个resolved Promise
    resolve()
  })
}
