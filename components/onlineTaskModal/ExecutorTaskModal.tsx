import React, { useCallback } from 'react'
import { Dimensions, StyleSheet, Text, View, Vibration } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BaseButton, BaseModal } from '@/components/common'
import { useTheme } from '@/hooks'
import { useTranslation } from 'react-i18next'
import { ExecutorTask } from '@/types/online'
import { PlayerAvatar } from '@/components/PlayerAvatar'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

interface ExecutorTaskModalProps {
  visible: boolean
  executorTask: ExecutorTask
  taskType: 'trap' | 'star' | 'collision'
  difficulty: string
  onComplete: (completed: boolean) => void
  onClose: () => void
}

export default function ExecutorTaskModal({
  visible,
  executorTask,
  taskType,
  difficulty,
  onComplete,
  onClose,
}: ExecutorTaskModalProps) {
  const { colors } = useTheme()
  const { t } = useTranslation()

  // 获取任务类型信息
  const getTaskTypeInfo = () => {
    switch (taskType) {
      case 'trap':
        return {
          icon: 'alert-circle-outline',
          color: '#FF6B6B',
          bgColor: '#FFF5F5',
          title: t('taskModal.taskTypes.trap.title', '陷阱挑战'),
          ruleReward: t('taskModal.taskTypes.trap.ruleReward', '完成任务：前进 3-6 格'),
          rulePenalty: t('taskModal.taskTypes.trap.rulePenalty', '失败惩罚：后退 3-6 格'),
        }
      case 'star':
        return {
          icon: 'star-outline',
          color: '#FFB800',
          bgColor: '#FFFBF0',
          title: t('taskModal.taskTypes.star.title', '幸运任务'),
          ruleReward: t('taskModal.taskTypes.star.ruleReward', '完成任务：前进 3-6 格'),
          rulePenalty: t('taskModal.taskTypes.star.rulePenalty', '失败惩罚：后退 3-6 格'),
        }
      case 'collision':
        return {
          icon: 'flash-outline',
          color: '#9C27B0',
          bgColor: '#F9F5FB',
          title: t('taskModal.taskTypes.collision.title', '碰撞挑战'),
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
  const getDifficultyInfo = (diff: string) => {
    switch (diff) {
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
      triggerHaptic()
      onComplete(completed)
    },
    [triggerHaptic, onComplete],
  )

  if (!visible) return null

  const taskTypeInfo = getTaskTypeInfo()
  const difficultyInfo = getDifficultyInfo(difficulty)
  const executor = executorTask.executor

  return (
    <BaseModal visible={visible} onClose={onClose} modalStyle={styles.modal}>
      <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
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
          <View style={[styles.difficultyTag, { backgroundColor: difficultyInfo.color }]}>
            <Text style={styles.difficultyText}>{difficultyInfo.text}</Text>
          </View>
        </View>

        {/* 执行者信息 */}
        <View style={styles.executorSection}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {t('taskModal.executor', '执行者')}
          </Text>
          <View
            style={[
              styles.executorInfo,
              { backgroundColor: executor.color + '15', borderColor: executor.color },
            ]}
          >
            <View style={[styles.avatarContainer, { backgroundColor: executor.color }]}>
              <PlayerAvatar avatarId={executor.avatarId} color={executor.color} />
            </View>
            <Text style={[styles.executorName, { color: colors.text }]}>
              {executor.name} {t('taskModal.you', '(你)')}
            </Text>
          </View>
        </View>

        {/* 任务内容 */}
        <View style={styles.taskSection}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {t('taskModal.taskContent', '任务内容')}
          </Text>
          <View style={[styles.taskBox, { backgroundColor: colors.border + '20' }]}>
            <Text style={[styles.taskTitle, { color: colors.text }]}>
              {executorTask.task.title}
            </Text>
            {executorTask.task.description && (
              <Text style={[styles.taskDescription, { color: colors.textSecondary }]}>
                {executorTask.task.description}
              </Text>
            )}
          </View>
        </View>

        {/* 规则说明 */}
        <View style={[styles.ruleBox, { backgroundColor: taskTypeInfo.bgColor }]}>
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

        {/* 提示信息 */}
        <View style={[styles.hintBox, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <Text style={[styles.hintText, { color: colors.text }]}>
            {t('taskModal.executorHint', '请选择任务是否完成')}
          </Text>
        </View>

        {/* 操作按钮 */}
        <View style={styles.actionButtons}>
          <BaseButton
            title={t('taskModal.completed', '已完成')}
            variant="primary"
            size="medium"
            iconName="checkmark-circle"
            iconPosition="left"
            onPress={() => handleTaskChoice(true)}
            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
          />

          <BaseButton
            title={t('taskModal.notCompleted', '未完成')}
            variant="primary"
            size="medium"
            iconName="close-circle"
            iconPosition="left"
            onPress={() => handleTaskChoice(false)}
            style={[styles.actionButton, { backgroundColor: '#FF6B6B' }]}
          />
        </View>
      </View>
    </BaseModal>
  )
}

const styles = StyleSheet.create({
  modal: {
    width: Math.min(screenWidth - 40, 420),
    maxHeight: screenHeight * 0.85,
    overflow: 'hidden',
    borderRadius: 20,
  },
  modalContent: {
    padding: 20,
    borderRadius: 20,
    gap: 16,
  },

  // 类型标签
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  difficultyTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 4,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },

  // 执行者区域
  executorSection: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  executorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1.5,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  executorName: {
    fontSize: 16,
    fontWeight: '600',
  },

  // 任务区域
  taskSection: {
    gap: 10,
  },
  taskBox: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  taskDescription: {
    fontSize: 14,
    lineHeight: 20,
  },

  // 规则框
  ruleBox: {
    borderRadius: 12,
    padding: 12,
    gap: 10,
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

  // 提示框
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  hintText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },

  // 操作按钮
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
  },
})
