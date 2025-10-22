import React, { useCallback, useEffect, useState } from 'react'
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native'
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import { Ionicons } from '@expo/vector-icons'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Colors } from '@/constants/theme'
import { useTranslation } from 'react-i18next'
import { showConfirmDialog } from '@/components/ConfirmDialog'
import { TaskModalData } from '@/types/online'
import { PlayerAvatar } from '@/components/PlayerAvatar'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

interface TaskModalProps {
  visible: boolean
  task: TaskModalData | null
  players: {
    id: any
    name: string
    color: string
    iconType: number
    [key: string]: any
  }[]
  onComplete: (completed: boolean) => void
  onClose: () => void
}

export default function TaskModal({ visible, task, onComplete, onClose }: TaskModalProps) {
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme] as any
  const { t } = useTranslation()

  const [isCompleted, setIsCompleted] = useState<boolean | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')

  // 动画值
  const modalScale = useSharedValue(0.8)
  const backdropOpacity = useSharedValue(0)
  const modalOpacity = useSharedValue(0)
  const modalTranslateY = useSharedValue(50)
  const progressValue = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      setIsCompleted(null)
      setShowResult(false)
      setIsProcessing(false)
      setHasError(false)
      setErrorMessage('')
      progressValue.value = 0

      backdropOpacity.value = withTiming(1, { duration: 200 })
      modalScale.value = withTiming(1, { duration: 300 })
      modalTranslateY.value = withTiming(0, { duration: 300 })
      modalOpacity.value = withTiming(1, { duration: 200 })
    } else {
      backdropOpacity.value = withTiming(0, { duration: 150 })
      modalScale.value = withTiming(0.8, { duration: 200 })
      modalTranslateY.value = withTiming(50, { duration: 200 })
      modalOpacity.value = withTiming(0, { duration: 150 })
    }
  }, [visible])

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }))

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale.value }, { translateY: modalTranslateY.value }],
    opacity: modalOpacity.value,
  }))

  const progressStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progressValue.value, [0, 1], [0, 100])}%`,
  }))

  // 获取任务类型信息
  const getTaskTypeInfo = () => {
    if (!task)
      return {
        icon: 'help-circle-outline',
        color: '#999',
        bgColor: '#f5f5f5',
        title: t('taskModal.taskTypes.unknown.title', '未知任务'),
      }

    switch (task.type) {
      case 'trap':
        return {
          icon: 'alert-circle-outline',
          color: '#FF6B6B',
          bgColor: '#FFF5F5',
          title: t('taskModal.taskTypes.trap.title', '陷阱挑战'),
          ruleExecutor: t('taskModal.taskTypes.trap.ruleExecutor', '受罚者：触发陷阱的玩家'),
          ruleReward: t('taskModal.taskTypes.trap.ruleReward', '完成任务：前进 3-6 格'),
          rulePenalty: t('taskModal.taskTypes.trap.rulePenalty', '失败惩罚：后退 3-6 格'),
        }
      case 'star':
        return {
          icon: 'star-outline',
          color: '#FFB800',
          bgColor: '#FFFBF0',
          title: t('taskModal.taskTypes.star.title', '幸运任务'),
          ruleExecutor: t('taskModal.taskTypes.star.ruleExecutor', '受益者：触发幸运的玩家'),
          ruleReward: t('taskModal.taskTypes.star.ruleReward', '完成任务：前进 3-6 格'),
          rulePenalty: t('taskModal.taskTypes.star.rulePenalty', '失败惩罚：后退 3-6 格'),
        }
      case 'collision':
        return {
          icon: 'flash-outline',
          color: '#9C27B0',
          bgColor: '#F9F5FB',
          title: t('taskModal.taskTypes.collision.title', '碰撞挑战'),
          ruleExecutor: t('taskModal.taskTypes.collision.ruleExecutor', '受罚者：被碰撞的玩家'),
          ruleReward: t('taskModal.taskTypes.collision.ruleReward', '完成任务：保持位置'),
          rulePenalty: t('taskModal.taskTypes.collision.rulePenalty', '失败惩罚：回到起点'),
        }
      default:
        return {
          icon: 'help-circle-outline',
          color: '#999',
          bgColor: '#f5f5f5',
          title: t('taskModal.taskTypes.normal.title', '普通任务'),
        }
    }
  }

  // 获取难度信息
  const getDifficultyInfo = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return { color: '#4CAF50', text: t('taskModal.difficulty.easy', '简单') }
      case 'normal':
        return { color: '#FF9500', text: t('taskModal.difficulty.normal', '普通') }
      case 'hard':
        return { color: '#FF6B6B', text: t('taskModal.difficulty.hard', '困难') }
      case 'extreme':
        return { color: '#9C27B0', text: t('taskModal.difficulty.extreme', '极限') }
      default:
        return { color: '#999999', text: t('taskModal.difficulty.unknown', '未知') }
    }
  }

  // 触觉反馈
  const triggerHaptic = useCallback(() => {
    if (Vibration) {
      Vibration.vibrate(50)
    }
  }, [])

  // 处理任务完成选择
  const handleTaskChoice = useCallback(
    (completed: boolean) => {
      if (isProcessing) return

      setIsProcessing(true)
      setHasError(false)
      triggerHaptic()
      setIsCompleted(completed)

      try {
        progressValue.value = withTiming(1, { duration: 2000 })

        setTimeout(() => {
          setShowResult(true)
        }, 800)

        setTimeout(() => {
          try {
            onComplete(completed)
            setIsProcessing(false)
          } catch {
            setHasError(true)
            setErrorMessage(t('taskModal.submitError', '提交失败，请重试'))
            setIsProcessing(false)
          }
        }, 2500)
      } catch {
        setHasError(true)
        setErrorMessage(t('taskModal.processError', '处理失败，请重试'))
        setIsProcessing(false)
      }
    },
    [isProcessing, triggerHaptic, onComplete, progressValue, t],
  )

  // 确认对话框
  const showWebCompatibleConfirmDialog = useCallback(
    async (completed: boolean) => {
      const title = completed
        ? t('taskModal.confirmComplete', '确认完成任务？')
        : t('taskModal.confirmFailed', '确认任务失败？')

      const message = completed
        ? t('taskModal.completeMessage', '确定你已经成功完成了这个任务吗？')
        : t('taskModal.failedMessage', '确定任务没有完成吗？这可能会有惩罚。')
      const ok = await showConfirmDialog({
        title: title,
        message: message,
        destructive: true,
        icon: 'info',
      })

      if (ok) {
        handleTaskChoice(completed)
      }
    },
    [handleTaskChoice, t],
  )

  // 获取结果信息
  const getResultInfo = () => {
    if (!task || isCompleted === null) return null

    if (task.type === 'trap') {
      return {
        success: isCompleted,
        icon: isCompleted ? 'checkmark-circle' : 'close-circle',
        color: isCompleted ? '#4CAF50' : '#FF6B6B',
        bgColor: isCompleted ? '#F1F8F4' : '#FFF5F5',
        title: isCompleted
          ? t('taskModal.results.taskCompleted', '任务完成！')
          : t('taskModal.results.taskFailed', '任务失败！'),
        description: isCompleted
          ? t('taskModal.results.trapReward', '获得奖励：前进 3-6 格')
          : t('taskModal.results.trapPenalty', '受到惩罚：后退 3-6 格'),
      }
    } else if (task.type === 'star') {
      return {
        success: isCompleted,
        icon: isCompleted ? 'trophy' : 'sad-outline',
        color: isCompleted ? '#FFB800' : '#FF6B6B',
        bgColor: isCompleted ? '#FFFBF0' : '#FFF5F5',
        title: isCompleted
          ? t('taskModal.results.luckyBonus', '幸运加成！')
          : t('taskModal.results.missedChance', '错失机会！'),
        description: isCompleted
          ? t('taskModal.results.starReward', '幸运奖励：前进 3-6 格')
          : t('taskModal.results.starPenalty', '遗憾惩罚：后退 3-6 格'),
      }
    } else if (task.type === 'collision') {
      return {
        success: isCompleted,
        icon: isCompleted ? 'shield-checkmark' : 'arrow-back-circle',
        color: isCompleted ? '#4CAF50' : '#FF6B6B',
        bgColor: isCompleted ? '#F1F8F4' : '#FFF5F5',
        title: isCompleted
          ? t('taskModal.results.successDefense', '成功防御！')
          : t('taskModal.results.collisionFailed', '碰撞失败！'),
        description: isCompleted
          ? t('taskModal.results.collisionStay', '保持位置不变')
          : t('taskModal.results.collisionStart', '回到起点重新开始'),
      }
    }

    return null
  }

  if (!visible || !task) return null

  const taskTypeInfo = getTaskTypeInfo()
  const resultInfo = getResultInfo()
  const difficultyInfo = getDifficultyInfo(task.difficulty)

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
      </Animated.View>

      <View style={styles.container}>
        <Animated.View style={[styles.modal, modalStyle]}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.homeCardBackground,
              },
            ]}
          >
            {!showResult ? (
              // 任务展示界面
              <>
                {/* 任务类型标签 */}
                <View style={[styles.typeTag, { backgroundColor: taskTypeInfo.bgColor }]}>
                  <Ionicons name={taskTypeInfo.icon as any} size={20} color={taskTypeInfo.color} />
                  <Text style={[styles.typeText, { color: taskTypeInfo.color }]}>
                    {taskTypeInfo.title}
                  </Text>
                </View>

                {/* 任务内容 */}
                <View style={styles.taskContent}>
                  <View style={styles.taskHeader}>
                    <Text style={[styles.taskTitle, { color: colors.homeCardTitle }]}>
                      {task.title}
                    </Text>
                    <View style={[styles.difficultyTag, { backgroundColor: difficultyInfo.color }]}>
                      <Text style={styles.difficultyText}>{difficultyInfo.text}</Text>
                    </View>
                  </View>

                  {task.description && (
                    <Text style={[styles.taskDescription, { color: colors.homeCardDescription }]}>
                      {task.description}
                    </Text>
                  )}
                </View>

                {/* 规则说明 */}
                {'ruleExecutor' in taskTypeInfo && (
                  <View style={[styles.ruleBox, { backgroundColor: taskTypeInfo.bgColor }]}>
                    <View style={styles.ruleRow}>
                      <Ionicons name="person-outline" size={16} color={taskTypeInfo.color} />
                      <Text style={[styles.ruleText, { color: colors.homeCardDescription }]}>
                        {taskTypeInfo.ruleExecutor}
                      </Text>
                    </View>
                    <View style={styles.ruleRow}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#4CAF50" />
                      <Text style={[styles.ruleText, { color: colors.homeCardDescription }]}>
                        {taskTypeInfo.ruleReward}
                      </Text>
                    </View>
                    <View style={styles.ruleRow}>
                      <Ionicons name="close-circle-outline" size={16} color="#FF6B6B" />
                      <Text style={[styles.ruleText, { color: colors.homeCardDescription }]}>
                        {taskTypeInfo.rulePenalty}
                      </Text>
                    </View>
                  </View>
                )}

                {/* 执行者信息 */}
                {task.executors && task.executors.length > 0 && (
                  <View style={styles.executorSection}>
                    <Text style={[styles.sectionLabel, { color: colors.homeCardDescription }]}>
                      {task.executors.length > 1
                        ? t('taskModal.executors', '执行者们')
                        : t('taskModal.executor', '执行者')}
                    </Text>

                    <View style={styles.executorList}>
                      {task.executors.map((executor) => (
                        <View
                          key={executor.id}
                          style={[
                            styles.executorChip,
                            { backgroundColor: executor.color + '15', borderColor: executor.color },
                          ]}
                        >
                          <View
                            style={[styles.executorAvatar, { backgroundColor: executor.color }]}
                          >
                            <PlayerAvatar avatarId={executor.avatarId} color={executor.color} />
                          </View>
                          <Text style={[styles.executorName, { color: colors.homeCardTitle }]}>
                            {executor.name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* 操作区域 */}
                <View style={styles.actionSection}>
                  {task?.isExecutor ? (
                    // 执行者界面
                    <>
                      {/* 错误提示 */}
                      {hasError && (
                        <View style={styles.errorBox}>
                          <Ionicons name="alert-circle" size={18} color="#FF6B6B" />
                          <Text style={styles.errorText}>{errorMessage}</Text>
                          <TouchableOpacity
                            onPress={() => {
                              setHasError(false)
                              setErrorMessage('')
                              setIsProcessing(false)
                            }}
                          >
                            <Text style={[styles.retryText, { color: colors.settingsAccent }]}>
                              {t('taskModal.retry', '重试')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* 进度条 */}
                      {isProcessing && (
                        <View style={styles.progressBox}>
                          <View
                            style={[
                              styles.progressTrack,
                              { backgroundColor: colors.homeCardBorder },
                            ]}
                          >
                            <Animated.View
                              style={[
                                styles.progressBar,
                                progressStyle,
                                {
                                  backgroundColor: isCompleted ? '#4CAF50' : '#FF6B6B',
                                },
                              ]}
                            />
                          </View>
                          <Text
                            style={[styles.progressText, { color: colors.homeCardDescription }]}
                          >
                            {t('taskModal.processing', '处理中...')}
                          </Text>
                        </View>
                      )}

                      {/* 操作按钮 */}
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            styles.successButton,
                            { opacity: isProcessing ? 0.5 : 1 },
                          ]}
                          onPress={() => showWebCompatibleConfirmDialog(true)}
                          disabled={isProcessing}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="checkmark-circle" size={22} color="#fff" />
                          <Text style={styles.buttonText}>{t('taskModal.completed', '完成')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            styles.failButton,
                            { opacity: isProcessing ? 0.5 : 1 },
                          ]}
                          onPress={() => showWebCompatibleConfirmDialog(false)}
                          disabled={isProcessing}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="close-circle" size={22} color="#fff" />
                          <Text style={styles.buttonText}>
                            {t('taskModal.notCompleted', '未完成')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    // 观察者界面
                    <View style={styles.observerBox}>
                      <Ionicons name="eye-outline" size={32} color={colors.homeCardDescription} />
                      <Text style={[styles.observerTitle, { color: colors.homeCardTitle }]}>
                        {t('taskModal.observerMode', '观察模式')}
                      </Text>
                      <Text
                        style={[styles.observerDescription, { color: colors.homeCardDescription }]}
                      >
                        {t('taskModal.observerHint', '等待其他玩家完成任务...')}
                      </Text>

                      <TouchableOpacity
                        style={[styles.observerButton, { backgroundColor: colors.homeCardBorder }]}
                        onPress={onClose}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close" size={18} color={colors.homeCardTitle} />
                        <Text style={[styles.observerButtonText, { color: colors.homeCardTitle }]}>
                          {t('taskModal.closeObserver', '关闭观察')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </>
            ) : (
              // 结果展示界面
              resultInfo && (
                <View style={styles.resultContainer}>
                  <View style={[styles.resultIconBox, { backgroundColor: resultInfo.bgColor }]}>
                    <Ionicons name={resultInfo.icon as any} size={56} color={resultInfo.color} />
                  </View>

                  <Text style={[styles.resultTitle, { color: colors.homeCardTitle }]}>
                    {resultInfo.title}
                  </Text>

                  <Text style={[styles.resultDescription, { color: colors.homeCardDescription }]}>
                    {resultInfo.description}
                  </Text>

                  {/* 受影响的玩家 */}
                  {task.executors && task.executors.length > 0 && (
                    <View style={styles.affectedSection}>
                      <Text style={[styles.affectedLabel, { color: colors.homeCardDescription }]}>
                        {t('taskModal.affectedPlayers', '受影响玩家：')}
                      </Text>
                      <View style={styles.affectedList}>
                        {task.executors.map((executor) => (
                          <View
                            key={executor.id}
                            style={[
                              styles.affectedChip,
                              {
                                backgroundColor: executor.color + '15',
                                borderColor: executor.color,
                              },
                            ]}
                          >
                            <View
                              style={[styles.affectedAvatar, { backgroundColor: executor.color }]}
                            >
                              <PlayerAvatar avatarId={executor.avatarId} color={executor.color} />
                            </View>
                            <Text style={[styles.affectedName, { color: executor.color }]}>
                              {executor.name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  <Text style={[styles.resultFooter, { color: colors.homeCardDescription }]}>
                    {t('taskModal.executing', '正在执行中...')}
                  </Text>
                </View>
              )
            )}
          </View>
        </Animated.View>
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: Math.min(screenWidth - 40, 420),
    maxHeight: screenHeight * 0.85,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },

  // 类型标签
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 16,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // 任务内容
  taskContent: {
    marginBottom: 16,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 12,
  },
  taskTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  difficultyTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  taskDescription: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },

  // 规则框
  ruleBox: {
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 16,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },

  // 执行者区域
  executorSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  executorList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  executorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
  },
  executorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  executorName: {
    fontSize: 13,
    fontWeight: '600',
  },

  // 操作区域
  actionSection: {
    gap: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#FF6B6B',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBox: {
    gap: 8,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 6,
  },
  successButton: {
    backgroundColor: '#4CAF50',
  },
  failButton: {
    backgroundColor: '#FF6B6B',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  // 观察者界面
  observerBox: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  observerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  observerDescription: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
  observerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    marginTop: 8,
  },
  observerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // 结果界面
  resultContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 16,
  },
  resultIconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  resultDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  affectedSection: {
    width: '100%',
    gap: 10,
  },
  affectedLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  affectedList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  affectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    gap: 5,
    borderWidth: 1,
  },
  affectedAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  affectedName: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultFooter: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 8,
  },
})
