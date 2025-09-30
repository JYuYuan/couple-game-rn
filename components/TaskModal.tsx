import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native'
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { Ionicons } from '@expo/vector-icons'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Colors } from '@/constants/theme'
import { PlayerIcon } from './icons'
import { useTranslation } from 'react-i18next'
import { showConfirmDialog } from '@/components/ConfirmDialog'
import { TaskModalData } from '@/types/online'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

interface TaskModalProps {
  visible: boolean
  task: TaskModalData | null
  players: {
    // 传入所有玩家信息
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
  const pulseAnimation = useSharedValue(1)

  useEffect(() => {
    if (visible) {
      // 重置状态
      setIsCompleted(null)
      setShowResult(false)
      setIsProcessing(false)
      setHasError(false)
      setErrorMessage('')
      progressValue.value = 0

      // 进入动画
      backdropOpacity.value = withTiming(1, { duration: 300 })
      modalScale.value = withSpring(1, { damping: 15, stiffness: 150 })
      modalTranslateY.value = withSpring(0, { damping: 15, stiffness: 150 })
      modalOpacity.value = withTiming(1, { duration: 300 })

      // 开始脉冲动画
      pulseAnimation.value = withTiming(
        1.05,
        {
          duration: 1000,
        },
        () => {
          pulseAnimation.value = withTiming(1, { duration: 1000 })
        },
      )
    } else {
      // 退出动画
      backdropOpacity.value = withTiming(0, { duration: 200 })
      modalScale.value = withTiming(0.8, { duration: 200 })
      modalTranslateY.value = withTiming(50, { duration: 200 })
      modalOpacity.value = withTiming(0, { duration: 200 })
    }
  }, [visible])

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }))

  const modalStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: modalScale.value * pulseAnimation.value },
      { translateY: modalTranslateY.value },
    ],
    opacity: modalOpacity.value,
  }))

  const progressStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progressValue.value, [0, 1], [0, 100], Extrapolate.CLAMP)}%`,
  }))

  // 获取任务类型信息
  const getTaskTypeInfo = () => {
    if (!task)
      return {
        icon: 'help',
        color: '#999',
        title: t('taskModal.taskTypes.unknown.title', '未知任务'),
      }

    switch (task.type) {
      case 'trap':
        return {
          icon: 'nuclear',
          color: '#FF6B6B',
          title: t('taskModal.taskTypes.trap.title', '陷阱挑战'),
          description: t(
            'taskModal.taskTypes.trap.description',
            '踩到陷阱！需要完成任务才能继续前进',
          ),
        }
      case 'star':
        return {
          icon: 'star',
          color: '#FFD700',
          title: t('taskModal.taskTypes.star.title', '幸运任务'),
          description: t(
            'taskModal.taskTypes.star.description',
            '获得幸运机会！完成任务获得额外奖励',
          ),
        }
      case 'collision':
        return {
          icon: 'flash',
          color: '#9C27B0',
          title: t('taskModal.taskTypes.collision.title', '碰撞挑战'),
          description: t(
            'taskModal.taskTypes.collision.description',
            '发生碰撞！需要通过挑战来决定去留',
          ),
        }
      default:
        return {
          icon: 'help',
          color: '#999',
          title: t('taskModal.taskTypes.normal.title', '普通任务'),
        }
    }
  }

  // 获取难度颜色
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '#4CAF50'
      case 'normal':
        return '#FF9500'
      case 'hard':
        return '#FF6B6B'
      case 'extreme':
        return '#9C27B0'
      default:
        return '#999999'
    }
  }

  // 获取难度文本
  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return t('taskModal.difficulty.easy', '简单')
      case 'normal':
        return t('taskModal.difficulty.normal', '普通')
      case 'hard':
        return t('taskModal.difficulty.hard', '困难')
      case 'extreme':
        return t('taskModal.difficulty.extreme', '极限')
      default:
        return t('taskModal.difficulty.unknown', '未知')
    }
  }

  // 添加触觉反馈
  const triggerHaptic = useCallback(() => {
    if (Vibration) {
      Vibration.vibrate(50)
    }
  }, [])

  // 处理任务完成选择（增强版）
  const handleTaskChoice = useCallback(
    (completed: boolean) => {
      // 防止重复点击
      if (isProcessing) return

      setIsProcessing(true)
      setHasError(false)
      triggerHaptic()
      setIsCompleted(completed)

      try {
        // 开始进度动画
        progressValue.value = withTiming(1, { duration: 2000 })

        // 显示结果界面
        setTimeout(() => {
          setShowResult(true)
        }, 800)

        // 延迟执行回调
        setTimeout(() => {
          try {
            onComplete(completed)
            setIsProcessing(false)
          } catch (error) {
            setHasError(true)
            setErrorMessage(t('taskModal.submitError', '提交失败，请重试'))
            setIsProcessing(false)
          }
        }, 2500)
      } catch (error) {
        setHasError(true)
        setErrorMessage(t('taskModal.processError', '处理失败，请重试'))
        setIsProcessing(false)
      }
    },
    [isProcessing, triggerHaptic, onComplete, progressValue, t],
  )

  // Web兼容的确认对话框
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
      // 陷阱任务：完成前进3-6格，未完成后退3-6格
      return {
        success: isCompleted,
        icon: isCompleted ? 'checkmark-circle' : 'close-circle',
        color: isCompleted ? '#4CAF50' : '#FF6B6B',
        title: isCompleted
          ? t('taskModal.results.taskCompleted', '任务完成！')
          : t('taskModal.results.taskFailed', '任务失败！'),
        description: isCompleted
          ? t('taskModal.results.trapReward', '获得奖励：前进 3-6 格')
          : t('taskModal.results.trapPenalty', '受到惩罚：后退 3-6 格'),
      }
    } else if (task.type === 'star') {
      // 幸运任务：完成前进3-6格，未完成后退3-6格
      return {
        success: isCompleted,
        icon: isCompleted ? 'trophy' : 'sad',
        color: isCompleted ? '#FFD700' : '#FF6B6B',
        title: isCompleted
          ? t('taskModal.results.luckyBonus', '幸运加成！')
          : t('taskModal.results.missedChance', '错失机会！'),
        description: isCompleted
          ? t('taskModal.results.starReward', '幸运奖励：前进 3-6 格')
          : t('taskModal.results.starPenalty', '遗憾惩罚：后退 3-6 格'),
      }
    } else if (task.type === 'collision') {
      // 碰撞任务：完成停留原地，未完成回到起点
      return {
        success: isCompleted,
        icon: isCompleted ? 'shield-checkmark' : 'arrow-back',
        color: isCompleted ? '#4CAF50' : '#FF6B6B',
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
                borderColor: colors.homeCardBorder,
              },
            ]}
          >
            {!showResult ? (
              // 任务展示界面
              <>
                {/* 任务类型头部 */}
                <View style={styles.header}>
                  <View style={[styles.typeIcon, { backgroundColor: taskTypeInfo.color + '20' }]}>
                    <Ionicons
                      name={taskTypeInfo.icon as any}
                      size={32}
                      color={taskTypeInfo.color}
                    />
                  </View>
                  <Text style={[styles.typeTitle, { color: colors.homeCardTitle }]}>
                    {taskTypeInfo.title}
                  </Text>
                  <Text style={[styles.typeDescription, { color: colors.homeCardDescription }]}>
                    {taskTypeInfo.description}
                  </Text>
                </View>

                {/* 执行者信息 - 支持多个执行者 */}
                {task.executors && task.executors.length > 0 && (
                  <View style={styles.executorSection}>
                    <Text style={[styles.sectionTitle, { color: colors.homeCardTitle }]}>
                      {task.executors.length > 1
                        ? t('taskModal.executors', '执行者们')
                        : t('taskModal.executor', '执行者')}
                    </Text>

                    {task.executors.length === 1 ? (
                      // ✅ 单个执行者样式
                      <View style={styles.singleExecutorWrapper}>
                        {task.executors.map((executor) => (
                          <View
                            key={executor.id}
                            style={[
                              styles.executorCard,
                              styles.singleExecutorCard,
                              { backgroundColor: executor.color + '15' },
                            ]}
                          >
                            <View
                              style={[
                                styles.executorAvatarLarge,
                                { backgroundColor: executor.color },
                              ]}
                            >
                              <PlayerIcon see={executor.iconType} />
                            </View>
                            <Text
                              style={[styles.executorNameSingle, { color: colors.homeCardTitle }]}
                            >
                              {executor.name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : task.executors.length > 4 ? (
                      // ✅ 大于 4 个 → 横向滚动
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.executorsScrollContainer}
                      >
                        {task.executors.map((executor) => (
                          <View
                            key={executor.id}
                            style={[
                              styles.executorCard,
                              { backgroundColor: executor.color + '15' },
                            ]}
                          >
                            <View
                              style={[styles.executorAvatar, { backgroundColor: executor.color }]}
                            >
                              <PlayerIcon see={executor.iconType} />
                            </View>
                            <Text
                              style={[styles.executorName, { color: colors.homeCardTitle }]}
                              numberOfLines={1}
                            >
                              {executor.name}
                            </Text>
                          </View>
                        ))}
                      </ScrollView>
                    ) : (
                      // ✅ 2~4 个 → 平铺展示
                      <View style={styles.executorsContainer}>
                        {task.executors.map((executor) => (
                          <View
                            key={executor.id}
                            style={[
                              styles.executorCard,
                              { backgroundColor: executor.color + '15' },
                            ]}
                          >
                            <View
                              style={[styles.executorAvatar, { backgroundColor: executor.color }]}
                            >
                              <PlayerIcon see={executor.iconType} />
                            </View>
                            <Text
                              style={[styles.executorName, { color: colors.homeCardTitle }]}
                              numberOfLines={1}
                            >
                              {executor.name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* 任务内容 */}
                <View style={styles.taskSection}>
                  <View style={styles.taskHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.homeCardTitle }]}>
                      {t('taskModal.taskContent', '任务内容')}
                    </Text>
                    <View
                      style={[
                        styles.difficultyBadge,
                        { backgroundColor: getDifficultyColor(task.difficulty) + '15' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.difficultyText,
                          { color: getDifficultyColor(task.difficulty) },
                        ]}
                      >
                        {getDifficultyText(task.difficulty)}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.taskTitle, { color: colors.homeCardTitle }]}>
                    {task.title}
                  </Text>

                  {task.description && (
                    <Text style={[styles.taskDescription, { color: colors.homeCardDescription }]}>
                      {task.description}
                    </Text>
                  )}
                </View>

                {/* 选择按钮或观察者界面 */}
                <View style={styles.actionSection}>
                  {task?.isExecutor ? (
                    // 执行者界面 - 可以操作
                    <>
                      <Text style={[styles.actionPrompt, { color: colors.homeCardTitle }]}>
                        {t('taskModal.chooseCompletion', '请选择任务完成情况：')}
                      </Text>

                      {/* 错误提示 */}
                      {hasError && (
                        <View style={styles.errorContainer}>
                          <Ionicons name="warning" size={20} color="#FF6B6B" />
                          <Text style={[styles.errorText, { color: '#FF6B6B' }]}>
                            {errorMessage}
                          </Text>
                          <TouchableOpacity
                            style={styles.retryButton}
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
                        <View style={styles.progressContainer}>
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

                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={[styles.actionButton, { opacity: isProcessing ? 0.6 : 1 }]}
                          onPress={() => showWebCompatibleConfirmDialog(true)}
                          disabled={isProcessing}
                          activeOpacity={0.8}
                        >
                          <LinearGradient
                            colors={['#4CAF50', '#66BB6A']}
                            style={styles.actionButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Ionicons name="checkmark" size={20} color="white" />
                            <Text style={styles.actionButtonText}>
                              {t('taskModal.completed', '完成')}
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionButton, { opacity: isProcessing ? 0.6 : 1 }]}
                          onPress={() => showWebCompatibleConfirmDialog(false)}
                          disabled={isProcessing}
                          activeOpacity={0.8}
                        >
                          <LinearGradient
                            colors={['#FF6B6B', '#FF8A80']}
                            style={styles.actionButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Ionicons name="close" size={20} color="white" />
                            <Text style={styles.actionButtonText}>
                              {t('taskModal.notCompleted', '未完成')}
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>

                      {/* 快捷操作提示 */}
                      <Text style={[styles.quickTip, { color: colors.homeCardDescription }]}>
                        {t('taskModal.quickTip', '💡 点击按钮会显示确认对话框')}
                      </Text>
                    </>
                  ) : (
                    // 观察者界面 - 只能查看
                    <>
                      <View style={styles.observerSection}>
                        <Ionicons name="eye" size={24} color={colors.settingsAccent} />
                        <Text style={[styles.observerTitle, { color: colors.homeCardTitle }]}>
                          {t('taskModal.observerMode', '观察模式')}
                        </Text>
                        <Text
                          style={[
                            styles.observerDescription,
                            { color: colors.homeCardDescription },
                          ]}
                        >
                          {t('taskModal.observerHint', '等待其他玩家完成任务...')}
                        </Text>
                      </View>

                      {/* 只显示关闭按钮 */}
                      <TouchableOpacity
                        style={[
                          styles.observerCloseButton,
                          { backgroundColor: colors.settingsAccent },
                        ]}
                        onPress={onClose}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="eye-off" size={18} color="white" />
                        <Text style={styles.observerCloseText}>
                          {t('taskModal.closeObserver', '关闭观察')}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
            ) : (
              // 结果展示界面
              resultInfo && (
                <View style={styles.resultContainer}>
                  <Animated.View
                    style={[styles.resultIcon, { backgroundColor: resultInfo.color + '20' }]}
                  >
                    <Ionicons name={resultInfo.icon as any} size={48} color={resultInfo.color} />
                  </Animated.View>

                  <Text style={[styles.resultTitle, { color: colors.homeCardTitle }]}>
                    {resultInfo.title}
                  </Text>

                  <Text style={[styles.resultDescription, { color: colors.homeCardDescription }]}>
                    {resultInfo.description}
                  </Text>

                  {/* 添加成功/失败统计 */}
                  <View style={styles.resultStats}>
                    <View style={[styles.statItem, { backgroundColor: resultInfo.color + '15' }]}>
                      <Ionicons
                        name={resultInfo.success ? 'trending-up' : 'trending-down'}
                        size={16}
                        color={resultInfo.color}
                      />
                      <Text style={[styles.statText, { color: resultInfo.color }]}>
                        {resultInfo.success
                          ? t('taskModal.positive', '正面效果')
                          : t('taskModal.negative', '负面效果')}
                      </Text>
                    </View>
                  </View>

                  {/* 显示受影响的执行者 */}
                  {task.executors && task.executors.length > 0 && (
                    <View style={styles.affectedPlayersContainer}>
                      <Text
                        style={[styles.affectedPlayersTitle, { color: colors.homeCardDescription }]}
                      >
                        {t('taskModal.affectedPlayers', '受影响玩家：')}
                      </Text>
                      <View style={styles.affectedPlayersList}>
                        {task.executors.map((executor) => (
                          <View
                            key={executor.id}
                            style={[
                              styles.affectedPlayerChip,
                              { backgroundColor: executor.color + '20' },
                            ]}
                          >
                            <View
                              style={[
                                styles.affectedPlayerIcon,
                                { backgroundColor: executor.color },
                              ]}
                            >
                              <PlayerIcon see={executor.iconType} />
                            </View>
                            <Text style={[styles.affectedPlayerName, { color: executor.color }]}>
                              {executor.name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  <View style={styles.resultFooter}>
                    <Text style={[styles.resultFooterText, { color: colors.homeCardDescription }]}>
                      {t('taskModal.executing', '正在执行中...')}
                    </Text>
                  </View>
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
  executorSection: {
    marginBottom: 16, // ↓ 24 → 16
  },
  sectionTitle: {
    fontSize: 15, // ↓ 16 → 15
    fontWeight: '600',
    marginBottom: 8, // ↓ 12 → 8
  },
  executorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6, // ↓ 8 → 6
    justifyContent: 'center',
  },
  executorsScrollContainer: {
    flexDirection: 'row',
    gap: 8, // ↓ 12 → 8
    paddingRight: 4,
    paddingVertical: 2,
  },
  executorCard: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 8, // ↓ 12 → 8
    borderRadius: 10, // ↓ 12 → 10
    gap: 6, // ↓ 8 → 6
    minWidth: 70, // ↓ 90 → 70
  },
  executorAvatar: {
    width: 32, // ↓ 40 → 32
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  executorName: {
    fontSize: 12, // ↓ 14 → 12
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 70, // ↓ 80 → 70
  },
  singleExecutorWrapper: {
    alignItems: 'center',
  },
  singleExecutorCard: {
    minWidth: undefined,
    paddingVertical: 16, // ↓ 20 → 16
    paddingHorizontal: 20, // ↓ 28 → 20
  },
  executorAvatarLarge: {
    width: 50, // ↓ 60 → 50
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8, // ↓ 12 → 8
  },
  executorNameSingle: {
    fontSize: 16, // ↓ 18 → 16
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 140, // ↓ 160 → 140
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10, // ↓ 20 → 10
  },
  modal: {
    width: Math.min(screenWidth - 40, 360), // ↓ 400 → 360
    maxHeight: screenHeight * 0.75, // ↓ 0.8 → 0.75
    borderRadius: 20, // ↓ 24 → 20
    overflow: 'hidden',
  },
  modalContent: {
    padding: 16, // ↓ 24 → 16
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 }, // ↓ 8 → 6
    shadowOpacity: 0.15, // ↓ 0.2 → 0.15
    shadowRadius: 12, // ↓ 16 → 12
    elevation: 6, // ↓ 8 → 6
  },
  header: {
    alignItems: 'center',
    marginBottom: 16, // ↓ 24 → 16
  },
  typeIcon: {
    width: 70, // ↓ 80 → 70
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12, // ↓ 16 → 12
  },
  typeTitle: {
    fontSize: 20, // ↓ 22 → 20
    fontWeight: '700',
    marginBottom: 6, // ↓ 8 → 6
    textAlign: 'center',
  },
  typeDescription: {
    fontSize: 13, // ↓ 14 → 13
    textAlign: 'center',
    lineHeight: 18, // ↓ 20 → 18
  },
  taskSection: {
    marginBottom: 16, // ↓ 24 → 16
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8, // ↓ 12 → 8
  },
  difficultyBadge: {
    paddingHorizontal: 6, // ↓ 8 → 6
    paddingVertical: 2, // ↓ 4 → 2
    borderRadius: 4, // ↓ 6 → 4
  },
  difficultyText: {
    fontSize: 11, // ↓ 12 → 11
    fontWeight: '600',
  },
  taskTitle: {
    fontSize: 16, // ↓ 18 → 16
    fontWeight: '600',
    marginBottom: 6, // ↓ 8 → 6
    lineHeight: 22, // ↓ 24 → 22
  },
  taskDescription: {
    fontSize: 13, // ↓ 14 → 13
    lineHeight: 18, // ↓ 20 → 18
    opacity: 0.8,
  },
  actionSection: {
    alignItems: 'center',
  },
  actionPrompt: {
    fontSize: 14, // ↓ 16 → 14
    fontWeight: '600',
    marginBottom: 12, // ↓ 16 → 12
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8, // ↓ 12 → 8
    width: '100%',
  },
  actionButton: {
    flex: 1,
    borderRadius: 10, // ↓ 12 → 10
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12, // ↓ 14 → 12
    gap: 6, // ↓ 8 → 6
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14, // ↓ 16 → 14
    fontWeight: '600',
  },
  resultContainer: {
    alignItems: 'center',
    paddingVertical: 16, // ↓ 20 → 16
  },
  resultIcon: {
    width: 80, // ↓ 100 → 80
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16, // ↓ 20 → 16
  },
  resultTitle: {
    fontSize: 20, // ↓ 24 → 20
    fontWeight: '700',
    marginBottom: 8, // ↓ 12 → 8
    textAlign: 'center',
  },
  resultDescription: {
    fontSize: 14, // ↓ 16 → 14
    textAlign: 'center',
    lineHeight: 20, // ↓ 22 → 20
    marginBottom: 16, // ↓ 20 → 16
  },
  affectedPlayersContainer: {
    marginTop: 12, // ↓ 16 → 12
    alignItems: 'center',
  },
  affectedPlayersTitle: {
    fontSize: 13, // ↓ 14 → 13
    marginBottom: 6, // ↓ 8 → 6
  },
  affectedPlayersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6, // ↓ 8 → 6
  },
  affectedPlayerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8, // ↓ 10 → 8
    paddingVertical: 4, // ↓ 6 → 4
    borderRadius: 12, // ↓ 16 → 12
    gap: 4, // ↓ 6 → 4
  },
  affectedPlayerIcon: {
    width: 16, // ↓ 20 → 16
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  affectedPlayerName: {
    fontSize: 11, // ↓ 12 → 11
    fontWeight: '600',
  },
  resultFooter: {
    marginTop: 8, // ↓ 10 → 8
  },
  resultFooterText: {
    fontSize: 12, // ↓ 14 → 12
    fontStyle: 'italic',
  },
  observerSection: {
    alignItems: 'center',
    paddingVertical: 16, // ↓ 20 → 16
    gap: 6, // ↓ 8 → 6
  },
  observerTitle: {
    fontSize: 16, // ↓ 18 → 16
    fontWeight: '600',
    textAlign: 'center',
  },
  observerDescription: {
    fontSize: 13, // ↓ 14 → 13
    textAlign: 'center',
    opacity: 0.8,
  },
  executorInfo: {
    marginVertical: 12, // ↓ 16 → 12
    alignItems: 'center',
  },
  executorLabel: {
    fontSize: 13, // ↓ 14 → 13
    fontWeight: '600',
    marginBottom: 6, // ↓ 8 → 6
  },
  executorList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8, // ↓ 12 → 8
  },
  executorItem: {
    alignItems: 'center',
    gap: 2, // ↓ 4 → 2
  },
  observerExecutorAvatar: {
    width: 28, // ↓ 32 → 28
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5, // ↓ 2 → 1.5
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  observerExecutorName: {
    fontSize: 10, // ↓ 11 → 10
    fontWeight: '500',
    textAlign: 'center',
  },
  observerCloseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16, // ↓ 20 → 16
    paddingVertical: 10, // ↓ 12 → 10
    borderRadius: 6, // ↓ 8 → 6
    gap: 4, // ↓ 6 → 4
    marginTop: 12, // ↓ 16 → 12
  },
  observerCloseText: {
    fontSize: 13, // ↓ 14 → 13
    fontWeight: '600',
    color: 'white',
  },
  progressContainer: {
    marginVertical: 12, // ↓ 16 → 12
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 4, // ↓ 6 → 4
    borderRadius: 2, // ↓ 3 → 2
    overflow: 'hidden',
    marginBottom: 6, // ↓ 8 → 6
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11, // ↓ 12 → 11
    fontStyle: 'italic',
  },
  quickTip: {
    fontSize: 11, // ↓ 12 → 11
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 6, // ↓ 8 → 6
    opacity: 0.7,
  },
  resultStats: {
    marginTop: 12, // ↓ 16 → 12
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10, // ↓ 12 → 10
    paddingVertical: 4, // ↓ 6 → 4
    borderRadius: 12,
    gap: 4, // ↓ 6 → 4
  },
  statText: {
    fontSize: 11, // ↓ 12 → 11
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B15',
    padding: 8, // ↓ 12 → 8
    borderRadius: 6,
    marginVertical: 6, // ↓ 8 → 6
    gap: 6, // ↓ 8 → 6
  },
  errorText: {
    flex: 1,
    fontSize: 12, // ↓ 14 → 12
  },
  retryButton: {
    paddingHorizontal: 8, // ↓ 12 → 8
    paddingVertical: 2, // ↓ 4 → 2
    borderRadius: 4, // ↓ 6 → 4
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  retryText: {
    fontSize: 11, // ↓ 12 → 11
    fontWeight: '600',
  },
})
