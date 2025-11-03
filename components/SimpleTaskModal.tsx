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
import { BaseButton, BaseModal } from '@/components/common'
import { useTheme, useModalAnimation } from '@/hooks'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

export interface SimpleTaskData {
  id: string
  title: string
  description?: string
  points: number
}

interface SimpleTaskModalProps {
  visible: boolean
  task: SimpleTaskData | null
  onComplete: (completed: boolean) => void
  onClose: () => void
}

export default function SimpleTaskModal({
  visible,
  task,
  onComplete,
  onClose,
}: SimpleTaskModalProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()

  // 使用统一的 Modal 动画 hook，使用 spring 弹性效果
  const { backdropStyle, modalStyle: baseModalStyle } = useModalAnimation(visible, {
    duration: 400,
    initialScale: 0,
  })

  const [isCompleted, setIsCompleted] = useState<boolean | null>(null)
  const [showResult, setShowResult] = useState(false)

  // 自定义 modal 样式以使用 spring 动画
  const modalStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: visible ? withSpring(1, { damping: 15, stiffness: 150 }) : withTiming(0) },
      {
        translateY: interpolate(visible ? 1 : 0, [0, 1], [50, 0]),
      },
    ],
    opacity: withTiming(visible ? 1 : 0, { duration: visible ? 400 : 200 }),
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
      icon: isCompleted ? 'checkmark-circle' : 'close-circle',
      color: isCompleted ? '#4CAF50' : '#FF6B6B',
      title: isCompleted
        ? t('simpleTaskModal.taskCompleted', '任务完成！')
        : t('simpleTaskModal.taskFailed', '任务失败！'),
      description: isCompleted
        ? t('simpleTaskModal.earnedPoints', '获得 {{points}} 积分', { points: task.points })
        : t('simpleTaskModal.noPointsEarned', '未获得积分'),
    }
  }

  if (!visible || !task) return null

  const resultInfo = getResultInfo()

  return (
    <BaseModal visible={visible} onClose={onClose} modalStyle={{ backgroundColor: colors.surface }}>
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
              {/* 任务头部 */}
              <View style={styles.header}>
                <View style={[styles.taskIcon, { backgroundColor: '#FFD700' + '20' }]}>
                  <Ionicons name="star" size={32} color="#FFD700" />
                </View>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  {t('simpleTaskModal.taskChallenge', '任务挑战')}
                </Text>
              </View>

              {/* 任务内容 */}
              <View style={styles.taskSection}>
                <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>

                {task.description && (
                  <Text style={[styles.taskDescription, { color: colors.textSecondary }]}>
                    {task.description}
                  </Text>
                )}

                {/* 积分显示 */}
                <View style={styles.pointsSection}>
                  <Text style={[styles.pointsLabel, { color: colors.textSecondary }]}>
                    {t('simpleTaskModal.completedReward', '完成奖励')}
                  </Text>
                  <View style={styles.pointsBadge}>
                    <Ionicons name="diamond" size={16} color="#FFD700" />
                    <Text style={styles.pointsText}>
                      {t('simpleTaskModal.pointsAmount', '{{points}} 积分', {
                        points: task.points,
                      })}
                    </Text>
                  </View>
                </View>
              </View>

              {/* 选择按钮 */}
              <View style={styles.actionSection}>
                <Text style={[styles.actionPrompt, { color: colors.text }]}>
                  {t('simpleTaskModal.chooseCompletion', '请选择任务完成情况：')}
                </Text>

                <View style={styles.actionButtons}>
                  <BaseButton
                    title={t('simpleTaskModal.completed', '完成')}
                    variant="primary"
                    size="large"
                    iconName="checkmark"
                    iconPosition="left"
                    onPress={() => handleTaskChoice(true)}
                    style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                  />

                  <BaseButton
                    title={t('simpleTaskModal.notCompleted', '未完成')}
                    variant="primary"
                    size="large"
                    iconName="close"
                    iconPosition="left"
                    onPress={() => handleTaskChoice(false)}
                    style={[styles.actionButton, { backgroundColor: '#FF6B6B' }]}
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

                <Text style={[styles.resultTitle, { color: colors.text }]}>{resultInfo.title}</Text>

                <Text style={[styles.resultDescription, { color: colors.textSecondary }]}>
                  {resultInfo.description}
                </Text>

                <View style={styles.resultFooter}>
                  <Text style={[styles.resultFooterText, { color: colors.textSecondary }]}>
                    {t('simpleTaskModal.updatingScore', '正在更新积分...')}
                  </Text>
                </View>
              </View>
            )
          )}
        </LinearGradient>
      </Animated.View>
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
    maxHeight: screenHeight * 0.8,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalContent: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  taskIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  taskSection: {
    marginBottom: 24,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 24,
    textAlign: 'center',
  },
  taskDescription: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 16,
  },
  pointsSection: {
    alignItems: 'center',
    marginTop: 16,
  },
  pointsLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700' + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
  },
  actionSection: {
    alignItems: 'center',
  },
  actionPrompt: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  resultIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  resultDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  resultFooter: {
    marginTop: 10,
  },
  resultFooterText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
})
