import React, { useEffect, useState, useMemo } from 'react'
import { Dimensions, StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { BaseButton, BaseModal } from '@/components/common'
import { useTheme, useModalAnimation } from '@/hooks'
import { useTranslation } from 'react-i18next'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

interface VictoryWinner {
  id: string | number
  name: string
  color: string
  tasks?: string[] // 🐾 胜利任务列表
  [key: string]: any
}

interface VictoryModalProps {
  visible: boolean
  winner: VictoryWinner | null
  isWinner?: boolean // 当前玩家是否是胜利者
  onRestart?: () => void
  onExit: () => void
  onClose?: () => void
}

export default function VictoryModal({
  visible,
  winner,
  isWinner = false,
  onRestart,
  onExit,
  onClose,
}: VictoryModalProps) {
  const { colors } = useTheme()
  const { t } = useTranslation()

  // 任务完成状态
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set())

  // 🐾 从 winner.tasks 中获取任务列表
  const selectedTasks = useMemo(() => {
    if (!winner?.tasks || winner.tasks.length === 0) return []

    return winner.tasks.map((task, index) => ({
      id: index,
      title: task,
    }))
  }, [winner?.tasks])
  // 所有任务是否完成
  const allTasksCompleted = useMemo(
    () => selectedTasks.length > 0 && completedTasks.size === selectedTasks.length,
    [selectedTasks, completedTasks],
  )

  // 切换任务完成状态
  const toggleTaskCompletion = (taskId: number) => {
    if (!isWinner) return
    setCompletedTasks((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  // 重置任务状态
  useEffect(() => {
    if (visible) {
      setCompletedTasks(new Set())
    }
  }, [visible])

  // 使用统一的 Modal 动画 hook
  const { backdropStyle, modalStyle } = useModalAnimation(visible, {
    duration: 300,
    initialScale: 0.8,
    translateY: 50,
  })

  // 庆祝彩带动画（保留特殊动画）
  const confettiScale = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      // 🐾 使用 withTiming 让彩带动画更流畅
      confettiScale.value = withTiming(1, { duration: 500 })
    } else {
      confettiScale.value = withTiming(0, { duration: 200 })
    }
  }, [visible, confettiScale])

  const confettiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: confettiScale.value }],
  }))

  if (!winner) return null

  return (
    <BaseModal
      visible={visible}
      onClose={() => onClose?.()}
      backdropStyle={backdropStyle}
      modalAnimationStyle={modalStyle}
      modalStyle={StyleSheet.flatten([styles.modalContainer])}
    >
      {/* 庆祝背景 */}
      <Animated.View style={[styles.confettiContainer, confettiStyle]}>
        <View style={[styles.confetti, { backgroundColor: '#FFD700', top: 20, left: 30 }]} />
        <View style={[styles.confetti, { backgroundColor: '#FF6B6B', top: 40, right: 40 }]} />
        <View style={[styles.confetti, { backgroundColor: '#4ECDC4', top: 60, left: 60 }]} />
        <View style={[styles.confetti, { backgroundColor: '#45B7D1', top: 80, right: 80 }]} />
        <View style={[styles.confetti, { backgroundColor: '#96CEB4', bottom: 60, left: 40 }]} />
        <View style={[styles.confetti, { backgroundColor: '#FFEAA7', bottom: 80, right: 60 }]} />
      </Animated.View>

      <LinearGradient
        colors={[colors.surface, colors.surface + 'F0']}
        style={[styles.modal, { borderColor: colors.border }]}
      >
        {/* 胜利庆祝界面 */}
        <View style={styles.victoryContent}>
          {/* 胜利标题 */}
          <View style={styles.victoryHeader}>
            <View style={styles.crownContainer}>
              <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.crownGradient}>
                <Text style={styles.crownEmoji}>👑</Text>
              </LinearGradient>
            </View>

            <Text style={[styles.victoryTitle, { color: colors.text }]}>
              {isWinner
                ? t('victoryModal.youWin', '🎉 你赢了！🎉')
                : t('victoryModal.gameOver', '🎮 游戏结束')}
            </Text>

            <View style={[styles.winnerCard, { backgroundColor: winner.color + '15' }]}>
              <View style={[styles.winnerAvatar, { backgroundColor: winner.color }]}>
                <Text style={styles.winnerAvatarText}>{winner.name.charAt(0)}</Text>
              </View>
              <View style={styles.winnerInfo}>
                <Text style={[styles.winnerName, { color: colors.text }]}>{winner.name}</Text>
                <Text style={[styles.winnerSubtext, { color: colors.textSecondary }]}>
                  {isWinner
                    ? t('victoryModal.congratulations', '恭喜获得胜利！')
                    : t('victoryModal.winnerIs', '胜利者')}
                </Text>
              </View>
            </View>
          </View>

          {/* 🎯 胜利任务列表 */}
          {selectedTasks.length > 0 && (
            <View style={styles.tasksSection}>
              <Text style={[styles.tasksTitle, { color: colors.text }]}>
                {t('victoryModal.completeTasks', '其他玩家请完成以下任务')}
              </Text>
              <Text style={[styles.tasksSubtitle, { color: colors.textSecondary }]}>
                {t(
                  'victoryModal.tasksProgress',
                  `已完成 ${completedTasks.size}/${selectedTasks.length}`,
                )}
              </Text>

              <View style={styles.tasksList}>
                {selectedTasks.map((task) => {
                  const isCompleted = completedTasks.has(task.id)
                  return (
                    <TouchableOpacity
                      key={task.id}
                      style={[
                        styles.taskItem,
                        {
                          backgroundColor: isCompleted ? colors.primary + '15' : colors.surface,
                          borderColor: isCompleted ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => toggleTaskCompletion(task.id)}
                      activeOpacity={0.7}
                    >
                      {isWinner && (
                        <View
                          style={[
                            styles.taskCheckbox,
                            {
                              backgroundColor: isCompleted ? colors.primary : 'transparent',
                              borderColor: isCompleted ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          {isCompleted && <Ionicons name="checkmark" size={16} color="white" />}
                        </View>
                      )}
                      <Text
                        style={[
                          styles.taskText,
                          {
                            color: isCompleted ? colors.text : colors.textSecondary,
                            textDecorationLine: isCompleted ? 'line-through' : 'none',
                          },
                        ]}
                      >
                        {task.title}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* 进度提示 */}
              {!allTasksCompleted && (
                <View style={[styles.progressHint, { backgroundColor: colors.primary + '10' }]}>
                  <Ionicons name="information-circle" size={16} color={colors.primary} />
                  <Text style={[styles.progressHintText, { color: colors.primary }]}>
                    {t('victoryModal.completeAllTasks', '完成所有任务后才能继续')}
                  </Text>
                </View>
              )}

              {allTasksCompleted && (
                <View style={[styles.progressHint, { backgroundColor: '#4CAF5015' }]}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={[styles.progressHintText, { color: '#4CAF50' }]}>
                    {t('victoryModal.allTasksCompleted', '所有任务已完成！')}
                  </Text>
                </View>
              )}
            </View>
          )}
          {isWinner && allTasksCompleted && (
            <>
              <View style={styles.buttonContainer}>
                {onRestart && (
                  <BaseButton
                    title={t('victoryModal.restart', '重新开始')}
                    variant="primary"
                    size="large"
                    iconName="refresh"
                    iconPosition="left"
                    onPress={onRestart}
                    disabled={selectedTasks.length > 0 && !allTasksCompleted}
                    style={styles.primaryButton}
                  />
                )}

                <BaseButton
                  title={t('victoryModal.exitGame', '退出游戏')}
                  variant="secondary"
                  size="large"
                  iconName="exit"
                  iconPosition="left"
                  onPress={onExit}
                  disabled={selectedTasks.length > 0 && !allTasksCompleted}
                  style={[styles.secondaryButton, { borderColor: colors.border }]}
                />
              </View>
            </>
          )}
          {!isWinner && (
            <View style={styles.spectatorContainer}>
              <Text style={[styles.spectatorText, { color: colors.textSecondary }]}>
                {t('victoryModal.waitingForWinner', '等待胜利者操作...')}
              </Text>
              <BaseButton
                title={t('victoryModal.close', '关闭')}
                variant="secondary"
                size="medium"
                onPress={onClose}
                style={[styles.closeButton, { borderColor: colors.border }]}
              />
            </View>
          )}
          {/* 按钮区域 - 只有胜利者或房主才能操作 */}
        </View>
      </LinearGradient>
    </BaseModal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  confettiContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: -1,
  },
  confetti: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modal: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  victoryContent: {
    padding: 24,
  },
  victoryHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  crownContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 16,
  },
  crownGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownEmoji: {
    fontSize: 36,
  },
  victoryTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  winnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  winnerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerAvatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  winnerInfo: {
    flex: 1,
  },
  winnerName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  winnerSubtext: {
    fontSize: 14,
    opacity: 0.8,
  },
  // 🎯 任务列表样式
  tasksSection: {
    marginBottom: 20,
  },
  tasksTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  tasksSubtitle: {
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
  tasksList: {
    gap: 10,
    marginBottom: 12,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 10,
  },
  taskCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  progressHint: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  progressHintText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  rewardSection: {
    marginBottom: 24,
  },
  rewardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  rewardDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    opacity: 0.8,
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  spectatorContainer: {
    alignItems: 'center',
    gap: 16,
  },
  spectatorText: {
    fontSize: 15,
    textAlign: 'center',
    opacity: 0.8,
  },
  closeButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
})
