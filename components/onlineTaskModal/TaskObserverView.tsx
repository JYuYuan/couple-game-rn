import React from 'react'
import { StyleSheet, Text, View, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { TaskModalData } from '@/types/online'
import { ExecutorTaskCard } from './ExecutorTaskCard'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/store'

interface TaskObserverViewProps {
  task: TaskModalData
  colors: any
  onComplete?: (completed: boolean) => void
}

export const TaskObserverView: React.FC<TaskObserverViewProps> = ({ task, colors, onComplete }) => {
  const { t } = useTranslation()
  const { playerId } = useSettingsStore()

  // 🐾 找到当前玩家的 ExecutorTask
  const currentExecutorTask = task.executorTasks?.find(
    (et) => et.executor.id.toString() === playerId?.toString(),
  )

  // 是否是执行者
  const isExecutor = !!currentExecutorTask
  // 当前玩家是否已完成
  const hasCompleted = currentExecutorTask?.completed || false

  // 计算完成进度
  const totalExecutors = task.executorTasks?.length || 0
  const completedExecutors = task.executorTasks?.filter((et) => et.completed).length || 0
  const completionPercentage = totalExecutors > 0 ? (completedExecutors / totalExecutors) * 100 : 0

  return (
    <View style={styles.container}>
      {/* 标题和进度 */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="people-outline" size={24} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>
            {t('taskModal.observerView.title', '任务执行进度')}
          </Text>
        </View>

        {/* 进度条 */}
        <View style={styles.progressContainer}>
          <View style={styles.progressInfo}>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {completedExecutors} / {totalExecutors}{' '}
              {t('taskModal.observerView.completed', '已完成')}
            </Text>
            <Text style={[styles.progressPercentage, { color: colors.primary }]}>
              {Math.round(completionPercentage)}%
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${completionPercentage}%`,
                  backgroundColor: completionPercentage === 100 ? '#4CAF50' : colors.primary,
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* 执行者列表 */}
      <View style={styles.executorsList}>
        {task.executorTasks?.map((executorTask, index) => {
          const isCurrentPlayer = executorTask.executor.id.toString() === playerId?.toString()
          return (
            <ExecutorTaskCard
              key={`${executorTask.executor.id}-${index}`}
              executorTask={executorTask}
              isCurrentPlayer={isCurrentPlayer}
              colors={colors}
              onComplete={isCurrentPlayer && !executorTask.completed ? onComplete : undefined}
            />
          )
        })}
      </View>

      {/* 状态提示 */}
      <View style={styles.statusSection}>
        {isExecutor && !hasCompleted && (
          <View style={[styles.statusBox, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="alert-circle" size={20} color={colors.primary} />
            <Text style={[styles.statusText, { color: colors.text }]}>
              {t('taskModal.observerView.yourTurn', '请完成你的任务')}
            </Text>
          </View>
        )}

        {isExecutor && hasCompleted && completedExecutors < totalExecutors && (
          <View style={[styles.statusBox, { backgroundColor: '#4CAF5015' }]}>
            <Ionicons name="checkmark-done-circle" size={20} color="#4CAF50" />
            <Text style={[styles.statusText, { color: colors.text }]}>
              {t('taskModal.observerView.waitingOthers', '等待其他玩家完成...')}
            </Text>
          </View>
        )}

        {!isExecutor && (
          <View style={[styles.statusBox, { backgroundColor: colors.border + '40' }]}>
            <Ionicons name="eye-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.statusText, { color: colors.text }]}>
              {t('taskModal.observerView.watching', '观察模式 - 你不是执行者')}
            </Text>
          </View>
        )}

        {completedExecutors === totalExecutors && (
          <View style={[styles.statusBox, { backgroundColor: '#4CAF5015' }]}>
            <Ionicons name="trophy" size={20} color="#4CAF50" />
            <Text style={[styles.statusText, { color: colors.text }]}>
              {t('taskModal.observerView.allCompleted', '所有任务已完成！')}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },

  // 标题区域
  header: {
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },

  // 进度区域
  progressContainer: {
    gap: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },

  // 执行者列表
  executorsList: {
    gap: 12,
  },

  // 状态区域
  statusSection: {
    gap: 10,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
})
