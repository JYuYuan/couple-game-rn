import React, { useEffect, useState } from 'react'
import { Dimensions, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { BaseModal } from '@/components/common/BaseModal'
import { BaseButton } from '@/components/common/BaseButton'
import { useTheme } from '@/hooks/useTheme'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

export interface MineTaskData {
  id: string
  title: string
  description?: string
  playerName: string
  playerColor: string
  minePosition: { row: number; col: number }
}

interface MineTaskModalProps {
  visible: boolean
  task: MineTaskData | null
  onComplete: (completed: boolean) => void
  onClose: () => void
}

export default function MineTaskModal({ visible, task, onComplete, onClose }: MineTaskModalProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()

  const [isCompleted, setIsCompleted] = useState<boolean | null>(null)
  const [showResult, setShowResult] = useState(false)

  // 动画值
  const modalScale = useSharedValue(0)
  const backdropOpacity = useSharedValue(0)
  const contentOpacity = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      // 重置状态
      setIsCompleted(null)
      setShowResult(false)

      // 开始动画
      backdropOpacity.value = withTiming(1, { duration: 0 })
      modalScale.value = withSpring(1, {
        damping: 0,
        stiffness: 0,
      })
      contentOpacity.value = withTiming(1, { duration: 0 })
    } else {
      // 关闭动画
      backdropOpacity.value = withTiming(0, { duration: 0 })
      modalScale.value = withTiming(0, { duration: 0 })
      contentOpacity.value = withTiming(0, { duration: 0 })
    }
  }, [visible])

  const modalStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: modalScale.value },
      {
        translateY: interpolate(modalScale.value, [0, 1], [50, 0]),
      },
    ],
    opacity: contentOpacity.value,
  }))

  // 处理任务完成选择
  const handleTaskChoice = (completed: boolean) => {
    setIsCompleted(completed)
    setShowResult(true)

    // 延迟执行回调
    setTimeout(() => {
      onComplete(completed)
    }, 1500)
  }

  // 获取结果信息
  const getResultInfo = () => {
    if (!task || isCompleted === null) return null

    return {
      success: isCompleted,
      icon: isCompleted ? 'shield-checkmark' : 'close-circle',
      color: isCompleted ? '#4CAF50' : '#F44336',
      title: isCompleted
        ? t('minesweeper.task.result.completed', '任务完成！')
        : t('minesweeper.task.result.failed', '任务失败！'),
      description: isCompleted
        ? t('minesweeper.task.result.completedDesc', '顺利完成挑战！')
        : t('minesweeper.task.result.failedDesc', '挑战失败了'),
    }
  }

  if (!visible || !task) return null

  const resultInfo = getResultInfo()

  return (
    <BaseModal visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <Animated.View style={[styles.modal, modalStyle]}>
          <LinearGradient
            colors={[colors.surface, colors.surface + 'F0']}
            style={styles.modalContent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {!showResult ? (
              // 任务展示界面
              <>
                {/* 踩雷提示头部 */}
                <View style={styles.header}>
                  <View style={[styles.mineIcon, { backgroundColor: '#F44336' + '20' }]}>
                    <Text style={styles.mineEmoji}>💣</Text>
                  </View>
                  <Text style={[styles.headerTitle, { color: colors.text }]}>
                    {t('minesweeper.task.hitMine', '踩到地雷了！')}
                  </Text>
                  <Text style={[styles.headerSubtitle, { color: '#F44336' }]}>
                    {t('minesweeper.task.position', '位置')}
                    {': ('}
                    {task.minePosition.row + 1}
                    {', '}
                    {task.minePosition.col + 1}
                    {')'}
                  </Text>
                </View>

                {/* 玩家信息 */}
                <View style={styles.playerSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {t('minesweeper.task.challenger', '挑战者')}
                  </Text>
                  <View style={[styles.playerCard, { backgroundColor: task.playerColor + '15' }]}>
                    <View style={[styles.playerAvatar, { backgroundColor: task.playerColor }]}>
                      <Text style={styles.playerAvatarText}>{task.playerName.charAt(0)}</Text>
                    </View>
                    <Text style={[styles.playerName, { color: colors.text }]}>
                      {task.playerName}
                    </Text>
                  </View>
                </View>

                {/* 任务内容 */}
                <View style={styles.taskSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {t('minesweeper.task.challengeTask', '挑战任务')}
                  </Text>
                  <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>
                  {task.description && (
                    <Text style={[styles.taskDescription, { color: colors.textSecondary }]}>
                      {task.description}
                    </Text>
                  )}
                </View>

                {/* 惩罚说明 */}
                <View style={styles.penaltySection}>
                  <View style={styles.penaltyCard}>
                    <Text style={[styles.penaltyTitle, { color: '#F44336' }]}>⚠️ 挑战说明</Text>
                    <Text style={[styles.penaltyDescription, { color: colors.textSecondary }]}>
                      • 踩雷后需要完成任务挑战{'\n'}• 任务完成与否不影响积分{'\n'}•
                      积分取决于获得的格子数量
                    </Text>
                  </View>
                </View>

                {/* 选择按钮 */}
                <View style={styles.actionSection}>
                  <Text style={[styles.actionPrompt, { color: colors.text }]}>
                    请选择任务完成情况：
                  </Text>

                  <View style={styles.actionButtons}>
                    <BaseButton
                      title={t('common.completed', '已完成')}
                      variant="primary"
                      size="medium"
                      onPress={() => handleTaskChoice(true)}
                      style={{ flex: 1 }}
                      iconName="checkmark"
                    />

                    <BaseButton
                      title={t('common.failed', '未完成')}
                      variant="danger"
                      size="medium"
                      onPress={() => handleTaskChoice(false)}
                      style={{ flex: 1 }}
                      iconName="close"
                    />
                  </View>
                </View>
              </>
            ) : (
              // 结果展示界面
              resultInfo && (
                <View style={styles.resultContainer}>
                  <View style={[styles.resultIcon, { backgroundColor: resultInfo.color + '20' }]}>
                    <Ionicons
                      name={resultInfo.icon as keyof typeof Ionicons.glyphMap}
                      size={48}
                      color={resultInfo.color}
                    />
                  </View>

                  <Text style={[styles.resultTitle, { color: colors.text }]}>
                    {resultInfo.title}
                  </Text>

                  <Text style={[styles.resultDescription, { color: colors.textSecondary }]}>
                    {resultInfo.description}
                  </Text>

                  <View style={styles.resultFooter}>
                    <Text style={[styles.resultFooterText, { color: colors.textSecondary }]}>
                      继续游戏...
                    </Text>
                  </View>
                </View>
              )
            )}
          </LinearGradient>
        </Animated.View>
      </View>
    </BaseModal>
  )
}

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
    width: Math.min(screenWidth - 40, 400),
    maxHeight: screenHeight * 0.85,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
  },
  modalContent: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  mineIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  mineEmoji: {
    fontSize: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  playerSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    gap: 8,
  },
  playerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerAvatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
  },
  taskSection: {
    marginBottom: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 20,
    textAlign: 'center',
  },
  taskDescription: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    opacity: 0.8,
  },
  penaltySection: {
    marginBottom: 12,
  },
  penaltyCard: {
    backgroundColor: '#F44336' + '10',
    padding: 10,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#F44336',
  },
  penaltyTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  penaltyDescription: {
    fontSize: 11,
    lineHeight: 16,
  },
  actionSection: {
    alignItems: 'center',
  },
  actionPrompt: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  resultContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  resultIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  resultDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  resultFooter: {
    marginTop: 8,
  },
  resultFooterText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
})
