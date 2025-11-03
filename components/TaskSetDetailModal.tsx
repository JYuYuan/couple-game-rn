import React, { useEffect } from 'react'
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TaskCategory, TaskSet } from '@/types/tasks'
import { usePageBase } from '@/hooks/usePageBase'

const { height: screenHeight } = Dimensions.get('window')

interface TaskSetDetailModalProps {
  visible: boolean
  taskSet: TaskSet | null
  category: TaskCategory | null
  onClose: () => void
  onEdit?: () => void
  onToggleActive?: () => void
  onDelete?: () => void
  isEdit?: boolean
}

export const TaskSetDetailModal: React.FC<TaskSetDetailModalProps> = ({
  visible,
  taskSet,
  category,
  onClose,
  onEdit,
  onToggleActive,
  onDelete,
  isEdit,
}) => {
  const insets = useSafeAreaInsets()
  const { colors, t } = usePageBase()

  // 动画值
  const translateY = useSharedValue(screenHeight)

  useEffect(() => {
    if (visible) {
      // 打开动画 - 从下滑入
      translateY.value = withTiming(0, { duration: 350 })
    } else {
      // 关闭动画 - 向下滑出
      translateY.value = withTiming(screenHeight, { duration: 300 })
    }
  }, [visible])

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  const handleBackdropPress = () => {
    onClose()
  }

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

  if (!visible || !taskSet) return null

  return (
    <Modal visible={visible} transparent={true} animationType="none" onRequestClose={onClose}>
      {/* 透明背景蒙层 */}
      <View style={styles.backdrop}>
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <View style={styles.backdropTouchable} />
        </TouchableWithoutFeedback>
      </View>

      {/* 弹窗内容 */}
      <Animated.View style={[styles.modalContainer, modalStyle]}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.homeCardBackground,
              paddingBottom: insets.bottom + 20,
            },
          ]}
        >
          {/* 标题区域 */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.titleRow}>
                <Text style={[styles.modalTitle, { color: colors.homeCardTitle }]}>
                  {taskSet.name}
                </Text>
                <View style={styles.badges}>
                  <View
                    style={[
                      styles.typeBadge,
                      {
                        backgroundColor:
                          taskSet.type === 'system'
                            ? colors.settingsAccent + '20'
                            : '#FF9500' + '20',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        { color: taskSet.type === 'system' ? colors.settingsAccent : '#FF9500' },
                      ]}
                    >
                      {taskSet.type === 'system'
                        ? t('tasks.taskSet.type.system', '系统')
                        : t('tasks.taskSet.type.custom', '自定义')}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.difficultyBadge,
                      { backgroundColor: getDifficultyColor(taskSet.difficulty) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.difficultyText,
                        { color: getDifficultyColor(taskSet.difficulty) },
                      ]}
                    >
                      {getDifficultyText(taskSet.difficulty)}
                    </Text>
                  </View>
                </View>
              </View>

              {taskSet.description && (
                <Text style={[styles.modalDescription, { color: colors.homeCardDescription }]}>
                  {taskSet.description}
                </Text>
              )}

              {/* 分类和统计信息 */}
              <View style={styles.infoRow}>
                {category && (
                  <View style={styles.categoryInfo}>
                    <Ionicons
                      name={category.icon as keyof typeof Ionicons.glyphMap}
                      size={16}
                      color={category.color}
                    />
                    <Text style={[styles.categoryName, { color: colors.homeCardDescription }]}>
                      {category.name}
                    </Text>
                  </View>
                )}
                <Text style={[styles.taskCount, { color: colors.homeCardDescription }]}>
                  {t('tasks.taskSet.tasks', '{{count}} 个任务', { count: taskSet.tasks.length })}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.headerCloseButton}>
              <Ionicons name="close" size={24} color={colors.homeCardDescription} />
            </TouchableOpacity>
          </View>

          {/* 操作按钮 */}
          {isEdit !== false && (
            <View style={styles.actionBar}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: taskSet.isActive ? '#4ECDC4' + '20' : colors.homeCardBorder },
                ]}
                onPress={onToggleActive}
              >
                <Ionicons
                  name={taskSet.isActive ? 'pause-circle' : 'play-circle'}
                  size={18}
                  color={taskSet.isActive ? '#4ECDC4' : colors.homeCardDescription}
                />
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: taskSet.isActive ? '#4ECDC4' : colors.homeCardDescription },
                  ]}
                >
                  {taskSet.isActive
                    ? t('tasks.taskSet.status.enabled', '已启用')
                    : t('tasks.taskSet.status.disabled', '已禁用')}
                </Text>
              </TouchableOpacity>

              <View style={styles.iconButtonGroup}>
                <TouchableOpacity
                  style={[styles.iconButton, { backgroundColor: colors.settingsAccent + '15' }]}
                  onPress={onEdit}
                >
                  <Ionicons name="create" size={18} color={colors.settingsAccent} />
                </TouchableOpacity>

                {taskSet.type === 'custom' && (
                  <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: '#FF6B6B' + '15' }]}
                    onPress={onDelete}
                  >
                    <Ionicons name="trash" size={18} color="#FF6B6B" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* 任务列表 */}
          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            <View style={styles.taskList}>
              <Text style={[styles.sectionTitle, { color: colors.homeCardTitle }]}>
                {t('taskSetDetail.taskList', '任务列表')}
              </Text>

              {taskSet.tasks.map((task, index) => {
                const taskObj = typeof task === 'string' ? { title: task } : task

                return (
                  <View
                    key={index}
                    style={[
                      styles.taskItem,
                      {
                        backgroundColor: colors.homeBackground,
                        borderColor: colors.homeCardBorder,
                      },
                    ]}
                  >
                    <View style={styles.taskHeader}>
                      <View style={styles.taskNumber}>
                        <Text style={[styles.taskNumberText, { color: colors.settingsAccent }]}>
                          {index + 1}
                        </Text>
                      </View>
                      <View style={styles.taskContent}>
                        <Text style={[styles.taskTitle, { color: colors.homeCardTitle }]}>
                          {taskObj.title}
                        </Text>
                        {taskObj.description && (
                          <Text
                            style={[styles.taskDescription, { color: colors.homeCardDescription }]}
                          >
                            {taskObj.description}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                )
              })}

              {taskSet.tasks.length === 0 && (
                <View style={styles.emptyTasks}>
                  <Ionicons name="document-outline" size={48} color={colors.homeCardDescription} />
                  <Text style={[styles.emptyText, { color: colors.homeCardDescription }]}>
                    {t('taskSetDetail.emptyTasks', '暂无任务')}
                  </Text>
                </View>
              )}
            </View>

            {/* 底部空白区域 */}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: screenHeight * 0.75, // 3/4屏高度
  },
  modalContent: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flex: 1,
    marginRight: 16,
  },
  headerCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  titleRow: {
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
  },
  taskCount: {
    fontSize: 14,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(60, 60, 67, 0.08)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  iconButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  taskList: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  taskItem: {
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  taskNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  taskNumberText: {
    fontSize: 14,
    fontWeight: '600',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    lineHeight: 22,
  },
  taskDescription: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.7,
  },
  taskMeta: {
    alignItems: 'flex-end',
  },
  taskCategory: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.6,
  },
  emptyTasks: {
    alignItems: 'center',
    paddingVertical: 40,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 20,
  },
})
