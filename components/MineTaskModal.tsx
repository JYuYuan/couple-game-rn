import React, { useEffect } from 'react'
import { Dimensions, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { BaseModal } from '@/components/common/BaseModal'
import { BaseButton } from '@/components/common/BaseButton'
import { useTheme } from '@/hooks/useTheme'
import { useModalResultState } from '@/hooks/useModalState'
import { useModalAnimation } from '@/hooks/useModalAnimation'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

export interface MineTaskData {
  id: string
  title: string
  description?: string
  playerName: string
  playerColor: string
  minePosition: { row: number; col: number }
}

interface MineTaskModalProps {
  visible: boolean
  task: MineTaskData | null
  onComplete: (completed: boolean) => void
  onClose: () => void
}

export default function MineTaskModal({ visible, task, onComplete, onClose }: MineTaskModalProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()

  // 使用统一的 Modal 动画
  const { backdropStyle, modalStyle } = useModalAnimation(visible)

  // 使用统一的 Modal 结果状态管理
  const { isCompleted, showResult, reset, handleChoice } = useModalResultState()

  useEffect(() => {
    if (visible) {
      reset()
    }
  }, [visible])

  // 获取结果信息
  const getResultInfo = (): {
    icon: 'checkmark-circle' | 'close-circle'
    iconColor: string
    title: string
    description: string
    gradient: [string, string]
  } | null => {
    if (!task || isCompleted === null) return null

    return {
      icon: isCompleted ? 'checkmark-circle' : 'close-circle',
      iconColor: isCompleted ? '#4CAF50' : '#F44336',
      title: isCompleted
        ? t('minesweeper.task.completed', '任务完成！')
        : t('minesweeper.task.failed', '任务失败'),
      description: isCompleted
        ? t('minesweeper.task.completedDesc', '成功解除危机')
        : t('minesweeper.task.failedDesc', '受到地雷伤害'),
      gradient: isCompleted ? ['#4CAF50', '#66BB6A'] : ['#F44336', '#EF5350'],
    }
  }

  const resultInfo = getResultInfo()

  if (!task) return null

  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      backdropStyle={backdropStyle}
      modalAnimationStyle={modalStyle}
      modalStyle={styles.modal}
    >
      <LinearGradient
        colors={[colors.surface, colors.surface + 'F0']}
        style={styles.modalContent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {!showResult ? (
          // 任务展示界面
          <>
            {/* 踩雷提示头部 */}
            <View style={styles.header}>
              <View style={[styles.mineIcon, { backgroundColor: '#F44336' + '20' }]}>
                <Text style={styles.mineEmoji}>💣</Text>
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {t('minesweeper.task.hitMine', '踩到地雷了！')}
              </Text>
              <Text style={[styles.headerSubtitle, { color: '#F44336' }]}>
                {t('minesweeper.task.position', '位置')}
                {': ('}
                {task.minePosition.row + 1}
                {', '}
                {task.minePosition.col + 1}
                {')'}
              </Text>
            </View>

            {/* 玩家信息 */}
            <View style={styles.playerSection}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {t('minesweeper.task.triggeredBy', '触发者')}
              </Text>
              <View style={[styles.playerChip, { backgroundColor: task.playerColor + '15' }]}>
                <View style={[styles.playerDot, { backgroundColor: task.playerColor }]} />
                <Text style={[styles.playerName, { color: colors.text }]}>{task.playerName}</Text>
              </View>
            </View>

            {/* 任务内容 */}
            <View style={styles.taskSection}>
              <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>
              {task.description && (
                <Text style={[styles.taskDescription, { color: colors.textSecondary }]}>
                  {task.description}
                </Text>
              )}
            </View>

            {/* 规则说明 */}
            <View style={[styles.ruleBox, { backgroundColor: colors.surface + '40' }]}>
              <View style={styles.ruleRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#4CAF50" />
                <Text style={[styles.ruleText, { color: colors.textSecondary }]}>
                  {t('minesweeper.task.ruleSuccess', '完成任务：恢复生命值')}
                </Text>
              </View>
              <View style={styles.ruleRow}>
                <Ionicons name="close-circle-outline" size={16} color="#F44336" />
                <Text style={[styles.ruleText, { color: colors.textSecondary }]}>
                  {t('minesweeper.task.ruleFail', '失败惩罚：失去生命值')}
                </Text>
              </View>
            </View>

            {/* 操作按钮 */}
            <View style={styles.actionSection}>
              <BaseButton
                variant="success"
                size="large"
                onPress={() => handleChoice(true, onComplete)}
                style={styles.actionButton}
              >
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.actionButtonText}>
                  {t('minesweeper.task.complete', '完成任务')}
                </Text>
              </BaseButton>

              <BaseButton
                variant="danger"
                size="large"
                onPress={() => handleChoice(false, onComplete)}
                style={styles.actionButton}
              >
                <Ionicons name="close-circle" size={20} color="white" />
                <Text style={styles.actionButtonText}>
                  {t('minesweeper.task.giveUp', '放弃任务')}
                </Text>
              </BaseButton>
            </View>
          </>
        ) : (
          // 结果展示界面
          resultInfo && (
            <View style={styles.resultContainer}>
              <LinearGradient
                colors={resultInfo.gradient}
                style={styles.resultHeader}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons
                  name={resultInfo.icon}
                  size={48}
                  color="white"
                  style={styles.resultIcon}
                />
                <Text style={styles.resultTitle}>{resultInfo.title}</Text>
                <Text style={styles.resultDescription}>{resultInfo.description}</Text>
              </LinearGradient>

              <BaseButton
                variant="primary"
                size="large"
                onPress={onClose}
                style={styles.resultButton}
              >
                <Text style={styles.resultButtonText}>
                  {t('minesweeper.task.continue', '继续游戏')}
                </Text>
              </BaseButton>
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
    maxHeight: screenHeight * 0.85,
    overflow: 'hidden',
    padding: 0, // 移除padding，让LinearGradient填满
    borderRadius: 20, // 添加圆角
    backgroundColor: 'transparent', // 确保背景透明，让LinearGradient显示
  },
  modalContent: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  mineIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  mineEmoji: {
    fontSize: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  playerSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  playerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  playerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
  },
  taskSection: {
    marginBottom: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  taskDescription: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  ruleBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ruleText: {
    fontSize: 12,
    flex: 1,
  },
  actionSection: {
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  resultContainer: {
    alignItems: 'center',
  },
  resultHeader: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  resultIcon: {
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  resultDescription: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
  },
  resultButton: {
    width: '100%',
  },
  resultButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
})
