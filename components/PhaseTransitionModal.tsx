import React from 'react'
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { Ionicons } from '@expo/vector-icons'
import { spacing } from '@/constants/commonStyles'
import { Colors } from '@/constants/theme'

export interface PhaseTransitionModalProps {
  visible: boolean
  phase: 'toGuessing' | 'toResult'
  drawerName: string
  guesserName: string
  onConfirm: () => void
  colors?: typeof Colors.light | typeof Colors.dark
}

export const PhaseTransitionModal: React.FC<PhaseTransitionModalProps> = ({
  visible,
  phase,
  drawerName,
  guesserName,
  onConfirm,
  colors = Colors.light,
}) => {
  const getContent = () => {
    if (phase === 'toGuessing') {
      return {
        icon: 'swap-horizontal' as const,
        title: '切换玩家',
        subtitle: '画画完成!',
        message: `请把手机交给 ${guesserName}`,
        hint: `${guesserName} 准备好后点击开始猜词`,
        buttonText: '开始猜词',
        gradient: ['#F59E0B', '#FBBF24'] as const,
      }
    }
    return {
      icon: 'checkmark-circle' as const,
      title: '本轮结束',
      subtitle: '猜词完成!',
      message: '查看任务结果',
      hint: '完成任务后继续下一轮',
      buttonText: '查看结果',
      gradient: ['#10B981', '#059669'] as const,
    }
  }

  const content = getContent()

  return (
    <Modal visible={visible} transparent animationType="fade">
      <BlurView intensity={90} tint="dark" style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View
            style={[styles.container, { backgroundColor: colors.homeCardBackground }]}
          >
            {/* 顶部图标 */}
            <LinearGradient
              colors={content.gradient}
              style={styles.iconContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={content.icon} size={60} color="#FFFFFF" />
            </LinearGradient>

            {/* 标题 */}
            <Text style={[styles.title, { color: colors.homeCardTitle }]}>
              {content.title}
            </Text>

            {/* 副标题 */}
            <Text style={[styles.subtitle, { color: content.gradient[0] }]}>
              {content.subtitle}
            </Text>

            {/* 消息 */}
            <View style={[styles.messageBox, { backgroundColor: colors.homeCardBorder + '20' }]}>
              <Ionicons name="information-circle" size={24} color={content.gradient[0]} />
              <Text style={[styles.message, { color: colors.homeCardDescription }]}>
                {content.message}
              </Text>
            </View>

            {/* 提示 */}
            <Text style={[styles.hint, { color: colors.homeCardDescription }]}>
              {content.hint}
            </Text>

            {/* 确认按钮 */}
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={content.gradient}
                style={styles.confirmButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.confirmButtonText}>{content.buttonText}</Text>
                <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
  },
  container: {
    borderRadius: 24,
    padding: spacing.xl * 1.5,
    alignItems: 'center',
    gap: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    width: '100%',
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
  },
  confirmButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
