import React, { useCallback, useEffect, useRef } from 'react'
import { Dimensions, StyleSheet, Text, Vibration, View } from 'react-native'
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { BaseButton, BaseModal } from '@/components/common'
import { useTheme } from '@/hooks'
import { useModalState } from '@/hooks/useModalState'
import { useTranslation } from 'react-i18next'
import { OfflineTaskModalData } from '@/types/online'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { useSettingsStore } from '@/store'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

interface Player {
  id: string
  name: string
  color: string
  [key: string]: unknown
}

interface TaskModalProps {
  isOnline?: boolean
  visible: boolean
  task: OfflineTaskModalData | null
  players: Player[]
  currentPlayerId?: string // 🐾 当前玩家ID,用于判断是否是执行者
  onComplete: (completed: boolean) => void
  onClose: () => void
}

export default function TaskModal({
  isOnline,
  visible,
  task,
  onComplete,
  onClose,
}: TaskModalProps) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const { playerId } = useSettingsStore()

  // 🐾 判断当前玩家是否是执行者
  const isCurrentPlayerExecutor = React.useMemo(() => {
    if (!playerId || !task?.executors || task.executors.length === 0) {
      return false
    }
    // 🐾 处理 ID 类型转换（executor.id 可能是 string 或 number）
    return task.executors.some((executor) => executor.id.toString() === playerId.toString())
  }, [playerId, task?.executors])

  // 使用统一的 Modal 状态管理 hook
  const modalState = useModalState()

  // 进度条动画值（保留，因为这是特定于任务的动画）
  const progressValue = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      modalState.reset()
      progressValue.value = 0
    }
  }, [visible])

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
      if (modalState.isProcessing) return

      modalState.startProcessing()
      triggerHaptic()
      modalState.setIsCompleted(completed)

      try {
        progressValue.value = withTiming(1, { duration: 2000 })

        setTimeout(() => {
          modalState.setShowResult(true)
        }, 800)

        setTimeout(() => {
          try {
            onComplete(completed)
            modalState.finishProcessing()
          } catch {
            modalState.markFailed(t('taskModal.submitError', '提交失败，请重试'))
          }
        }, 2500)
      } catch {
        modalState.markFailed(t('taskModal.processError', '处理失败，请重试'))
      }
    },
    [modalState, triggerHaptic, onComplete, progressValue, t],
  )

  // 获取结果信息
  const getResultInfo = () => {
    if (!task || modalState.isCompleted === null) return null

    if (task.type === 'trap') {
      return {
        success: modalState.isCompleted,
        icon: modalState.isCompleted ? 'checkmark-circle' : 'close-circle',
        color: modalState.isCompleted ? '#4CAF50' : '#FF6B6B',
        bgColor: modalState.isCompleted ? '#F1F8F4' : '#FFF5F5',
        title: modalState.isCompleted
          ? t('taskModal.results.taskCompleted', '任务完成！')
          : t('taskModal.results.taskFailed', '任务失败！'),
        description: modalState.isCompleted
          ? t('taskModal.results.trapReward', '获得奖励：前进 3-6 格')
          : t('taskModal.results.trapPenalty', '受到惩罚：后退 3-6 格'),
      }
    } else if (task.type === 'star') {
      return {
        success: modalState.isCompleted,
        icon: modalState.isCompleted ? 'trophy' : 'sad-outline',
        color: modalState.isCompleted ? '#FFB800' : '#FF6B6B',
        bgColor: modalState.isCompleted ? '#FFFBF0' : '#FFF5F5',
        title: modalState.isCompleted
          ? t('taskModal.results.luckyBonus', '幸运加成！')
          : t('taskModal.results.missedChance', '错失机会！'),
        description: modalState.isCompleted
          ? t('taskModal.results.starReward', '幸运奖励：前进 3-6 格')
          : t('taskModal.results.starPenalty', '遗憾惩罚：后退 3-6 格'),
      }
    } else if (task.type === 'collision') {
      return {
        success: modalState.isCompleted,
        icon: modalState.isCompleted ? 'shield-checkmark' : 'arrow-back-circle',
        color: modalState.isCompleted ? '#4CAF50' : '#FF6B6B',
        bgColor: modalState.isCompleted ? '#F1F8F4' : '#FFF5F5',
        title: modalState.isCompleted
          ? t('taskModal.results.successDefense', '成功防御！')
          : t('taskModal.results.collisionFailed', '碰撞失败！'),
        description: modalState.isCompleted
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
    <BaseModal visible={visible} onClose={onClose} modalStyle={styles.modal}>
      <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
        {!modalState.showResult ? (
          // 任务展示界面
          <>
            {/* 任务类型标签 */}
            <View style={[styles.typeTag, { backgroundColor: taskTypeInfo.bgColor }]}>
              <Ionicons
                name={taskTypeInfo.icon as keyof typeof Ionicons.glyphMap}
                size={20}
                color={taskTypeInfo.color}
              />
              <Text style={[styles.typeText, { color: taskTypeInfo.color }]}>
                {taskTypeInfo.title}
              </Text>
            </View>

            {/* 任务内容 */}
            <View style={styles.taskContent}>
              <View style={styles.taskHeader}>
                <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>
                <View style={[styles.difficultyTag, { backgroundColor: difficultyInfo.color }]}>
                  <Text style={styles.difficultyText}>{difficultyInfo.text}</Text>
                </View>
              </View>

              {task.description && (
                <Text style={[styles.taskDescription, { color: colors.textSecondary }]}>
                  {task.description}
                </Text>
              )}
            </View>

            {/* 规则说明 */}
            {'ruleExecutor' in taskTypeInfo && (
              <View style={[styles.ruleBox, { backgroundColor: taskTypeInfo.bgColor }]}>
                <View style={styles.ruleRow}>
                  <Ionicons name="person-outline" size={16} color={taskTypeInfo.color} />
                  <Text style={[styles.ruleText, { color: colors.textSecondary }]}>
                    {taskTypeInfo.ruleExecutor}
                  </Text>
                </View>
                <View style={styles.ruleRow}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#4CAF50" />
                  <Text style={[styles.ruleText, { color: colors.textSecondary }]}>
                    {taskTypeInfo.ruleReward}
                  </Text>
                </View>
                <View style={styles.ruleRow}>
                  <Ionicons name="close-circle-outline" size={16} color="#FF6B6B" />
                  <Text style={[styles.ruleText, { color: colors.textSecondary }]}>
                    {taskTypeInfo.rulePenalty}
                  </Text>
                </View>
              </View>
            )}

            {/* 执行者信息 */}
            {task.executors && task.executors.length > 0 && (
              <View style={styles.executorSection}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
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
                      <View style={[styles.executorAvatar, { backgroundColor: executor.color }]}>
                        <PlayerAvatar avatarId={executor.avatarId} color={executor.color} />
                      </View>
                      <Text style={[styles.executorName, { color: colors.text }]}>
                        {executor.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 操作区域 */}
            <View style={styles.actionSection}>
              {isCurrentPlayerExecutor || !isOnline ? (
                // 执行者界面
                <>
                  {/* 错误提示 */}
                  {modalState.hasError && (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle" size={18} color="#FF6B6B" />
                      <Text style={styles.errorText}>{modalState.errorMessage}</Text>
                      <BaseButton
                        title={t('taskModal.retry', '重试')}
                        variant="secondary"
                        size="small"
                        onPress={() => {
                          modalState.reset()
                        }}
                        textStyle={{ color: colors.primary }}
                      />
                    </View>
                  )}

                  {/* 进度条 */}
                  {modalState.isProcessing && (
                    <View style={styles.progressBox}>
                      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                        <Animated.View
                          style={[
                            styles.progressBar,
                            progressStyle,
                            {
                              backgroundColor: modalState.isCompleted ? '#4CAF50' : '#FF6B6B',
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                        {t('taskModal.processing', '处理中...')}
                      </Text>
                    </View>
                  )}

                  {/* 操作按钮 */}
                  <View style={styles.actionButtons}>
                    <BaseButton
                      title={t('taskModal.completed', '完成')}
                      variant="primary"
                      size="medium"
                      iconName="checkmark-circle"
                      iconPosition="left"
                      onPress={() => handleTaskChoice(true)}
                      disabled={modalState.isProcessing}
                      loading={modalState.isProcessing}
                      style={StyleSheet.flatten([
                        styles.actionButton,
                        { backgroundColor: '#4CAF50' },
                      ])}
                    />

                    <BaseButton
                      title={t('taskModal.notCompleted', '未完成')}
                      variant="primary"
                      size="medium"
                      iconName="close-circle"
                      iconPosition="left"
                      onPress={() => handleTaskChoice(false)}
                      disabled={modalState.isProcessing}
                      loading={modalState.isProcessing}
                      style={StyleSheet.flatten([
                        styles.actionButton,
                        { backgroundColor: '#FF6B6B' },
                      ])}
                    />
                  </View>
                </>
              ) : (
                // 观察者界面
                <View style={styles.observerBox}>
                  <Ionicons name="eye-outline" size={32} color={colors.textSecondary} />
                  <Text style={[styles.observerTitle, { color: colors.text }]}>
                    {t('taskModal.observerMode', '观察模式')}
                  </Text>
                  <Text style={[styles.observerDescription, { color: colors.textSecondary }]}>
                    {t('taskModal.observerHint', '等待其他玩家完成任务...')}
                  </Text>

                  <BaseButton
                    title={t('taskModal.closeObserver', '关闭观察')}
                    variant="secondary"
                    size="medium"
                    iconName="eye-off-outline"
                    iconPosition="left"
                    onPress={onClose}
                    style={StyleSheet.flatten([
                      styles.observerButton,
                      {
                        backgroundColor: colors.textSecondary + '15',
                        borderColor: colors.textSecondary + '30',
                      },
                    ])}
                  />
                </View>
              )}
            </View>
          </>
        ) : (
          // 结果展示界面
          resultInfo && (
            <View style={styles.resultContainer}>
              <View style={[styles.resultIconBox, { backgroundColor: resultInfo.bgColor }]}>
                <Ionicons
                  name={resultInfo.icon as keyof typeof Ionicons.glyphMap}
                  size={56}
                  color={resultInfo.color}
                />
              </View>

              <Text style={[styles.resultTitle, { color: colors.text }]}>{resultInfo.title}</Text>

              <Text style={[styles.resultDescription, { color: colors.textSecondary }]}>
                {resultInfo.description}
              </Text>

              {/* 受影响的玩家 */}
              {task.executors && task.executors.length > 0 && (
                <View style={styles.affectedSection}>
                  <Text style={[styles.affectedLabel, { color: colors.textSecondary }]}>
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
                        <View style={[styles.affectedAvatar, { backgroundColor: executor.color }]}>
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

              <Text style={[styles.resultFooter, { color: colors.textSecondary }]}>
                {t('taskModal.executing', '正在执行中...')}
              </Text>
            </View>
          )
        )}
      </View>
    </BaseModal>
  )
}

const styles = StyleSheet.create({
  modal: {
    width: Math.min(screenWidth - 40, 420),
    maxHeight: screenHeight * 0.85,
  },
  modalContent: {
    padding: 20,
    borderRadius: 16,
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
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 12,
    borderWidth: 1,
  },
  observerButtonText: {
    fontSize: 15,
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
