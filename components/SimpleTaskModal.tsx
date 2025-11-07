import React, { useEffect } from 'react'
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { BaseModal } from '@/components/common/BaseModal'
import { usePageBase } from '@/hooks/usePageBase'
import { useModalAnimation } from '@/hooks/useModalAnimation'
import { useModalResultState } from '@/hooks/useModalState'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

export interface SimpleTaskData {
  id: string
  title: string
  description?: string
  points: number
}

interface SimpleTaskModalProps {
  visible: boolean
  task: SimpleTaskData | null
  onComplete: (completed: boolean) => void
  onClose: () => void
}

export default function SimpleTaskModal({
  visible,
  task,
  onComplete,
  onClose,
}: SimpleTaskModalProps) {
  const { colors, t } = usePageBase()

  // 使用统一的 Modal 动画
  const { backdropStyle, modalStyle } = useModalAnimation(visible, {
    duration: 400,
    backdropDuration: 300,
  })

  // 使用统一的 Modal 结果状态管理
  const { isCompleted, showResult, reset, handleChoice } = useModalResultState()

  useEffect(() => {
    if (visible) {
      reset()
    }
  }, [visible, reset])

  // 获取结果信息
  const getResultInfo = () => {
    if (!task || isCompleted === null) return null

    return {
      success: isCompleted,
      icon: isCompleted ? 'checkmark-circle' : 'close-circle',
      color: isCompleted ? '#4CAF50' : '#FF6B6B',
      title: isCompleted
        ? t('simpleTaskModal.taskCompleted', '任务完成！')
        : t('simpleTaskModal.taskFailed', '任务失败！'),
      description: isCompleted
        ? t('simpleTaskModal.earnedPoints', '获得 {{points}} 积分', { points: task.points })
        : t('simpleTaskModal.noPointsEarned', '未获得积分'),
    }
  }

  if (!task) return null

  const resultInfo = getResultInfo()

  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      backdropStyle={backdropStyle}
      modalAnimationStyle={modalStyle}
      modalStyle={styles.modal}
    >
      <LinearGradient
        colors={[colors.homeCardBackground, colors.homeCardBackground + 'F0']}
        style={styles.modalContent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {!showResult ? (
          // 任务展示界面
          <>
            {/* 任务头部 */}
            <View style={styles.header}>
              <View style={[styles.taskIcon, { backgroundColor: '#FFD700' + '20' }]}>
                <Ionicons name="star" size={32} color="#FFD700" />
              </View>
              <Text style={[styles.headerTitle, { color: colors.homeCardTitle }]}>
                {t('simpleTaskModal.taskChallenge', '任务挑战')}
              </Text>
            </View>

            {/* 任务内容 */}
            <View style={styles.taskSection}>
              <Text style={[styles.taskTitle, { color: colors.homeCardTitle }]}>
                {task.title}
              </Text>

              {task.description && (
                <Text style={[styles.taskDescription, { color: colors.homeCardDescription }]}>
                  {task.description}
                </Text>
              )}

              {/* 积分显示 */}
              <View style={styles.pointsSection}>
                <Text style={[styles.pointsLabel, { color: colors.homeCardDescription }]}>
                  {t('simpleTaskModal.completedReward', '完成奖励')}
                </Text>
                <View style={styles.pointsBadge}>
                  <Ionicons name="diamond" size={16} color="#FFD700" />
                  <Text style={styles.pointsText}>
                    {t('simpleTaskModal.pointsAmount', '{{points}} 积分', {
                      points: task.points,
                    })}
                  </Text>
                </View>
              </View>
            </View>

            {/* 选择按钮 */}
            <View style={styles.actionSection}>
              <Text style={[styles.actionPrompt, { color: colors.homeCardTitle }]}>
                {t('simpleTaskModal.chooseCompletion', '请选择任务完成情况：')}
              </Text>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleChoice(true, onComplete)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#4CAF50', '#66BB6A']}
                    style={styles.actionButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="checkmark" size={24} color="white" />
                    <Text style={styles.actionButtonText}>
                      {t('simpleTaskModal.completed', '完成')}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleChoice(false, onComplete)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#FF6B6B', '#FF8A80']}
                    style={styles.actionButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="close" size={24} color="white" />
                    <Text style={styles.actionButtonText}>
                      {t('simpleTaskModal.notCompleted', '未完成')}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          // 结果展示界面
          resultInfo && (
            <View style={styles.resultContainer}>
              <View style={[styles.resultIcon, { backgroundColor: resultInfo.color + '20' }]}>
                <Ionicons name={resultInfo.icon as any} size={48} color={resultInfo.color} />
              </View>

              <Text style={[styles.resultTitle, { color: colors.homeCardTitle }]}>
                {resultInfo.title}
              </Text>

              <Text style={[styles.resultDescription, { color: colors.homeCardDescription }]}>
                {resultInfo.description}
              </Text>

              <View style={styles.resultFooter}>
                <Text style={[styles.resultFooterText, { color: colors.homeCardDescription }]}>
                  {t('simpleTaskModal.updatingScore', '正在更新积分...')}
                </Text>
              </View>
            </View>
          )
        )}
      </LinearGradient>
    </BaseModal>
  )
}

const styles = StyleSheet.create({
  modal: {
    width: Math.min(screenWidth - 40, 400),
    maxHeight: screenHeight * 0.8,
    overflow: 'hidden',
    padding: 0, // 移除padding，让LinearGradient填满
  },
  modalContent: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  taskIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  taskSection: {
    marginBottom: 24,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 24,
    textAlign: 'center',
  },
  taskDescription: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 16,
  },
  pointsSection: {
    alignItems: 'center',
    marginTop: 16,
  },
  pointsLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700' + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
  },
  actionSection: {
    alignItems: 'center',
  },
  actionPrompt: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 12,
    width: '100%',
  },
  actionButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 56, // 确保按钮有最小高度，防止被压扁
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12, // 添加水平 padding，防止内容过于拥挤
    gap: 8,
    minHeight: 56, // 与按钮高度一致
    borderRadius: 16, // LinearGradient 需要明确设置圆角
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  resultContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  resultIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  resultDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  resultFooter: {
    marginTop: 10,
  },
  resultFooterText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
})
