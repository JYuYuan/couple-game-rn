import React, { useEffect, useState } from 'react'
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/theme'
import { spacing } from '@/constants/commonStyles'
import { PlayerAvatar } from '@/components/PlayerAvatar'

export interface DrawGuessTaskData {
  id: string
  title: string
  description: string
  playerName: string
  playerColor: string
  playerAvatar: string // avatarId 是字符串类型
  difficulty: string
}

interface DrawGuessTaskModalProps {
  visible: boolean
  task: DrawGuessTaskData | null
  onComplete: (completed: boolean) => void
  onClose: () => void
  colors?: typeof Colors.light | typeof Colors.dark
}

export const DrawGuessTaskModal: React.FC<DrawGuessTaskModalProps> = ({
  visible,
  task,
  onComplete,
  onClose,
  colors = Colors.light,
}) => {
  const [countdown, setCountdown] = useState(3)
  const [showTask, setShowTask] = useState(false)

  // 动画值
  const scale = useSharedValue(0)
  const rotate = useSharedValue(0)
  const opacity = useSharedValue(0)

  useEffect(() => {
    if (visible && task) {
      // 重置状态
      setCountdown(3)
      setShowTask(false)

      // 入场动画
      scale.value = withSpring(1, { damping: 15, stiffness: 150 })
      opacity.value = withTiming(1, { duration: 300 })
      rotate.value = withSequence(
        withTiming(-5, { duration: 100 }),
        withTiming(5, { duration: 100 }),
        withTiming(0, { duration: 100 }),
      )

      // 倒计时
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            setShowTask(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    } else {
      // 退场动画
      scale.value = withTiming(0, { duration: 200 })
      opacity.value = withTiming(0, { duration: 200 })
    }
  }, [visible, task])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
    opacity: opacity.value,
  }))

  if (!task) return null

  const getDifficultyColor = () => {
    switch (task.difficulty) {
      case 'easy':
        return '#10B981'
      case 'normal':
        return '#F59E0B'
      case 'hard':
        return '#EF4444'
      case 'extreme':
        return '#8B5CF6'
      default:
        return '#6B7280'
    }
  }

  const getDifficultyLabel = () => {
    switch (task.difficulty) {
      case 'easy':
        return '简单'
      case 'normal':
        return '普通'
      case 'hard':
        return '困难'
      case 'extreme':
        return '极限'
      default:
        return '默认'
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={90} tint="dark" style={styles.modalOverlay}>
        <Animated.View style={[styles.modalContent, animatedStyle]}>
          {!showTask ? (
            // 倒计时界面
            <View style={styles.countdownContainer}>
              <LinearGradient
                colors={['#F59E0B', '#FBBF24']}
                style={styles.countdownGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.countdownContent}>
                  <Ionicons name="hourglass-outline" size={60} color="#FFFFFF" />
                  <Text style={styles.countdownText}>{countdown}</Text>
                  <Text style={styles.countdownLabel}>准备接受挑战...</Text>
                </View>
              </LinearGradient>
            </View>
          ) : (
            // 任务详情界面
            <View style={[styles.taskContainer, { backgroundColor: colors.homeCardBackground }]}>
              {/* 顶部装饰 */}
              <LinearGradient
                colors={['#F59E0B', '#FBBF24']}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.headerContent}>
                  <Ionicons name="brush-outline" size={32} color="#FFFFFF" />
                  <Text style={styles.headerTitle}>挑战任务</Text>
                </View>
              </LinearGradient>

              {/* 玩家信息 */}
              <View style={styles.playerSection}>
                <View style={styles.playerInfo}>
                  <PlayerAvatar avatarId={task.playerAvatar} color={task.playerColor} size={64} />
                  <View style={styles.playerDetails}>
                    <Text style={[styles.playerName, { color: colors.homeCardTitle }]}>
                      {task.playerName}
                    </Text>
                    <View
                      style={[
                        styles.difficultyBadge,
                        { backgroundColor: getDifficultyColor() + '20' },
                      ]}
                    >
                      <Ionicons name="flash" size={16} color={getDifficultyColor()} />
                      <Text style={[styles.difficultyText, { color: getDifficultyColor() }]}>
                        {getDifficultyLabel()}难度
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* 任务内容 */}
              <View style={styles.taskContent}>
                <View style={styles.taskTitleSection}>
                  <Ionicons name="sparkles" size={24} color="#F59E0B" />
                  <Text style={[styles.taskTitle, { color: colors.homeCardTitle }]}>
                    {task.title}
                  </Text>
                </View>
              </View>

              {/* 提示信息 */}
              <View style={[styles.tipSection, { backgroundColor: colors.homeCardBorder + '20' }]}>
                <Ionicons name="information-circle" size={20} color="#6B7280" />
                <Text style={[styles.tipText, { color: colors.homeCardDescription }]}>
                  完成任务后点击下方按钮继续游戏
                </Text>
              </View>

              {/* 按钮区域 */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onComplete(true)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                    <Text style={styles.buttonText}>完成任务</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onComplete(false)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#EF4444', '#DC2626']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="close-circle" size={24} color="#FFFFFF" />
                    <Text style={styles.buttonText}>放弃任务</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
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
    width: '90%',
    maxWidth: 400,
  },
  // 倒计时样式
  countdownContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  countdownGradient: {
    padding: spacing.xl * 2,
  },
  countdownContent: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  countdownText: {
    fontSize: 80,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  countdownLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // 任务详情样式
  taskContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  headerGradient: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  playerSection: {
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  playerDetails: {
    flex: 1,
    gap: spacing.sm,
  },
  playerName: {
    fontSize: 20,
    fontWeight: '700',
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  difficultyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  taskContent: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  taskTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  taskDescriptionBox: {
    padding: spacing.lg,
    borderRadius: 16,
  },
  taskDescription: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  tipSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  tipText: {
    fontSize: 13,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.xl,
    paddingTop: 0,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
