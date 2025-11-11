import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BaseButton } from '@/components/common'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { ExecutorTask } from '@/types/online'
import { useTranslation } from 'react-i18next'

interface ExecutorTaskCardProps {
  executorTask: ExecutorTask
  isCurrentPlayer: boolean
  colors: any
  onComplete?: (completed: boolean) => void
}

export const ExecutorTaskCard: React.FC<ExecutorTaskCardProps> = ({
  executorTask,
  isCurrentPlayer,
  colors,
  onComplete,
}) => {
  const { t } = useTranslation()
  const executor = executorTask.executor
  const isCompleted = executorTask.completed
  const result = executorTask.result

  return (
    <View
      style={[
        styles.executorCard,
        {
          backgroundColor: isCurrentPlayer ? colors.primary + '10' : colors.surface,
          borderColor: isCurrentPlayer ? colors.primary : colors.border,
        },
      ]}
    >
      {/* 执行者头像和名字 */}
      <View style={styles.executorHeader}>
        <View style={[styles.executorAvatarContainer, { backgroundColor: executor.color }]}>
          <PlayerAvatar avatarId={executor.avatarId} color={executor.color} />
        </View>
        <View style={styles.executorInfo}>
          <Text style={[styles.executorName, { color: colors.text }]}>
            {executor.name}
            {isCurrentPlayer && ' (你)'}
          </Text>
          <Text
            style={[styles.executorTask, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {executorTask.task.title}
          </Text>
        </View>

        {/* 完成状态指示器 */}
        {isCompleted ? (
          <View style={styles.statusBadge}>
            <Ionicons
              name={result?.completed ? 'checkmark-circle' : 'close-circle'}
              size={24}
              color={result?.completed ? '#4CAF50' : '#FF6B6B'}
            />
          </View>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: colors.border }]}>
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
          </View>
        )}
      </View>

      {/* 如果已完成，显示结果 */}
      {isCompleted && result && (
        <View
          style={[
            styles.resultBox,
            {
              backgroundColor: result.completed ? '#4CAF5015' : '#FF6B6B15',
              borderColor: result.completed ? '#4CAF50' : '#FF6B6B',
            },
          ]}
        >
          <Text style={[styles.resultText, { color: colors.text }]}>
            {result.completed
              ? t('taskModal.results.taskCompleted', '任务完成！')
              : t('taskModal.results.taskFailed', '任务失败！')}
          </Text>
          <Text style={[styles.resultContent, { color: colors.textSecondary }]}>
            {result.content === 0
              ? t('taskModal.results.backToStart', '回到起点')
              : result.content > 0
                ? t('taskModal.results.moveForward', `前进 ${result.content} 格`)
                : t('taskModal.results.moveBackward', `后退 ${Math.abs(result.content)} 格`)}
          </Text>
        </View>
      )}

      {/* 如果是当前玩家且未完成，显示操作按钮 */}
      {isCurrentPlayer && !isCompleted && onComplete && (
        <View style={styles.actionButtons}>
          <BaseButton
            title={t('taskModal.completed', '完成')}
            variant="primary"
            size="small"
            iconName="checkmark-circle"
            iconPosition="left"
            onPress={() => onComplete(true)}
            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
          />

          <BaseButton
            title={t('taskModal.notCompleted', '未完成')}
            variant="primary"
            size="small"
            iconName="close-circle"
            iconPosition="left"
            onPress={() => onComplete(false)}
            style={[styles.actionButton, { backgroundColor: '#FF6B6B' }]}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  // 执行者卡片
  executorCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  executorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  executorAvatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  executorInfo: {
    flex: 1,
    gap: 4,
  },
  executorName: {
    fontSize: 15,
    fontWeight: '600',
  },
  executorTask: {
    fontSize: 13,
    lineHeight: 17,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 结果框
  resultBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultContent: {
    fontSize: 13,
  },

  // 操作按钮
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
  },
})
