import React from 'react'
import { Dimensions, StyleSheet, Text, View, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BaseModal } from '@/components/common'
import { useTheme } from '@/hooks'
import { useTranslation } from 'react-i18next'
import { TaskModalData, ExecutorTask } from '@/types/online'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { useSettingsStore } from '@/store'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

interface ObserverTaskModalProps {
  visible: boolean
  task: TaskModalData
  onClose: () => void
}

export default function ObserverTaskModal({ visible, task, onClose }: ObserverTaskModalProps) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const { playerId } = useSettingsStore()

  // 计算完成进度
  const totalExecutors = task.executorTasks?.length || 0
  const completedExecutors = task.executorTasks?.filter((et) => et.completed).length || 0
  const completionPercentage = totalExecutors > 0 ? (completedExecutors / totalExecutors) * 100 : 0

  // 获取任务类型信息
  const getTaskTypeInfo = () => {
    switch (task.type) {
      case 'trap':
        return {
          icon: 'alert-circle-outline',
          color: '#FF6B6B',
          bgColor: '#FFF5F5',
          title: t('taskModal.taskTypes.trap.title', '陷阱挑战'),
        }
      case 'star':
        return {
          icon: 'star-outline',
          color: '#FFB800',
          bgColor: '#FFFBF0',
          title: t('taskModal.taskTypes.star.title', '幸运任务'),
        }
      case 'collision':
        return {
          icon: 'flash-outline',
          color: '#9C27B0',
          bgColor: '#F9F5FB',
          title: t('taskModal.taskTypes.collision.title', '碰撞挑战'),
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

  // 渲染执行者卡片
  const renderExecutorCard = (executorTask: ExecutorTask, index: number) => {
    const executor = executorTask.executor
    const isCurrentPlayer = executor.id.toString() === playerId?.toString()
    const isCompleted = executorTask.completed
    const result = executorTask.result

    return (
      <View
        key={`${executor.id}-${index}`}
        style={[
          styles.executorCard,
          {
            backgroundColor: colors.surface,
            borderColor: isCompleted
              ? result?.completed
                ? '#4CAF50'
                : '#FF6B6B'
              : colors.border,
          },
        ]}
      >
        {/* 执行者信息 */}
        <View style={styles.executorHeader}>
          <View style={[styles.avatarContainer, { backgroundColor: executor.color }]}>
            <PlayerAvatar avatarId={executor.avatarId} color={executor.color} />
          </View>

          <View style={styles.executorInfo}>
            <Text style={[styles.executorName, { color: colors.text }]}>
              {executor.name}
              {isCurrentPlayer && ` ${t('taskModal.you', '(你)')}`}
            </Text>
            <Text style={[styles.taskTitle, { color: colors.textSecondary }]} numberOfLines={2}>
              {executorTask.task.title}
            </Text>
          </View>

          {/* 状态指示器 */}
          {isCompleted ? (
            <View style={styles.statusBadge}>
              <Ionicons
                name={result?.completed ? 'checkmark-circle' : 'close-circle'}
                size={28}
                color={result?.completed ? '#4CAF50' : '#FF6B6B'}
              />
            </View>
          ) : (
            <View style={styles.statusBadge}>
              <View style={[styles.loadingDot, { backgroundColor: colors.primary }]} />
            </View>
          )}
        </View>

        {/* 完成结果 */}
        {isCompleted && result && (
          <View
            style={[
              styles.resultBox,
              {
                backgroundColor: result.completed ? '#4CAF5015' : '#FF6B6B15',
              },
            ]}
          >
            <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
              {result.completed
                ? t('taskModal.results.taskCompleted', '任务完成')
                : t('taskModal.results.taskFailed', '任务失败')}
            </Text>
            <Text style={[styles.resultContent, { color: colors.text }]}>
              {result.content === 0
                ? t('taskModal.results.backToStart', '回到起点')
                : result.content > 0
                  ? t('taskModal.results.moveForward', `前进 ${result.content} 格`)
                  : t('taskModal.results.moveBackward', `后退 ${Math.abs(result.content)} 格`)}
            </Text>
          </View>
        )}
      </View>
    )
  }

  if (!visible) return null

  const taskTypeInfo = getTaskTypeInfo()

  return (
    <BaseModal visible={visible} onClose={onClose} modalStyle={styles.modal}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          {/* 标题 */}
          <View style={styles.header}>
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

            <View style={styles.titleRow}>
              <Ionicons name="people-outline" size={24} color={colors.primary} />
              <Text style={[styles.title, { color: colors.text }]}>
                {t('taskModal.observer.title', '任务执行进度')}
              </Text>
            </View>
          </View>

          {/* 进度条 */}
          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                {t('taskModal.observer.progress', '完成进度')}: {completedExecutors} /{' '}
                {totalExecutors}
              </Text>
              <Text
                style={[
                  styles.progressPercentage,
                  { color: completionPercentage === 100 ? '#4CAF50' : colors.primary },
                ]}
              >
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

          {/* 执行者列表 */}
          <View style={styles.executorsList}>
            {task.executorTasks?.map((executorTask, index) => renderExecutorCard(executorTask, index))}
          </View>

          {/* 状态提示 */}
          {completedExecutors < totalExecutors ? (
            <View style={[styles.hintBox, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Text style={[styles.hintText, { color: colors.text }]}>
                {t('taskModal.observer.waiting', '等待玩家完成任务...')}
              </Text>
            </View>
          ) : (
            <View style={[styles.hintBox, { backgroundColor: '#4CAF5015' }]}>
              <Ionicons name="checkmark-done-circle" size={20} color="#4CAF50" />
              <Text style={[styles.hintText, { color: colors.text }]}>
                {t('taskModal.observer.allCompleted', '所有任务已完成！')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </BaseModal>
  )
}

const styles = StyleSheet.create({
  modal: {
    width: Math.min(screenWidth - 40, 450),
    maxHeight: screenHeight * 0.85,
    overflow: 'hidden',
    borderRadius: 20,
  },
  scrollView: {
    maxHeight: screenHeight * 0.85,
  },
  modalContent: {
    padding: 20,
    borderRadius: 20,
    gap: 16,
  },

  // 标题区域
  header: {
    gap: 12,
  },
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
  progressSection: {
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
    fontSize: 18,
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
  },

  // 执行者列表
  executorsList: {
    gap: 12,
  },
  executorCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    gap: 12,
  },
  executorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  executorInfo: {
    flex: 1,
    gap: 4,
  },
  executorName: {
    fontSize: 16,
    fontWeight: '600',
  },
  taskTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  statusBadge: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // 结果框
  resultBox: {
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  resultContent: {
    fontSize: 14,
    fontWeight: '600',
  },

  // 提示框
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  hintText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
})
