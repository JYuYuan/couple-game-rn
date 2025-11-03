import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '@/hooks/useTheme'
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

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress()
    }
    onClose()
  }

  return (
    <BaseModal visible={visible} onClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.alertContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {message && (
            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
          )}
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
        </View>
      </View>
    </BaseModal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  alertContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
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
