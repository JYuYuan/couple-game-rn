import React, { useEffect } from 'react'
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Colors } from '@/constants/theme'
import { GamePlayer } from '@/hooks/use-game-players'
import { useTranslation } from 'react-i18next'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

interface VictoryModalProps {
  visible: boolean
  winner: GamePlayer | null
  isWinner?: boolean // 当前玩家是否是胜利者
  onRestart?: () => void
  onExit: () => void
  onClose: () => void
}

export default function VictoryModal({
  visible,
  winner,
  isWinner = false,
  onRestart,
  onExit,
  onClose,
}: VictoryModalProps) {
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme] as any
  const { t } = useTranslation()

  // 动画值
  const scale = useSharedValue(0)
  const opacity = useSharedValue(0)
  const confettiScale = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      // 直接设置为显示状态，不使用动画
      opacity.value = 1
      scale.value = 1
      confettiScale.value = 1
    } else {
      // 直接设置为隐藏状态，不使用动画
      opacity.value = 0
      scale.value = 1
      confettiScale.value = 1
    }
  }, [visible])

  const modalStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))

  const confettiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: confettiScale.value }],
  }))

  if (!winner) return null

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <BlurView intensity={20} style={StyleSheet.absoluteFillObject}>
        <View style={styles.overlay}>
          <Animated.View style={[styles.modalContainer, modalStyle]}>
            {/* 庆祝背景 */}
            <Animated.View style={[styles.confettiContainer, confettiStyle]}>
              <View style={[styles.confetti, { backgroundColor: '#FFD700', top: 20, left: 30 }]} />
              <View style={[styles.confetti, { backgroundColor: '#FF6B6B', top: 40, right: 40 }]} />
              <View style={[styles.confetti, { backgroundColor: '#4ECDC4', top: 60, left: 60 }]} />
              <View style={[styles.confetti, { backgroundColor: '#45B7D1', top: 80, right: 80 }]} />
              <View
                style={[styles.confetti, { backgroundColor: '#96CEB4', bottom: 60, left: 40 }]}
              />
              <View
                style={[styles.confetti, { backgroundColor: '#FFEAA7', bottom: 80, right: 60 }]}
              />
            </Animated.View>

            <LinearGradient
              colors={[colors.homeCardBackground, colors.homeCardBackground + 'F0']}
              style={[styles.modal, { borderColor: colors.homeCardBorder }]}
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

                  <Text style={[styles.victoryTitle, { color: colors.homeCardTitle }]}>
                    {isWinner
                      ? t('victoryModal.youWin', '🎉 你赢了！🎉')
                      : t('victoryModal.gameOver', '🎮 游戏结束')}
                  </Text>

                  <View style={[styles.winnerCard, { backgroundColor: winner.color + '15' }]}>
                    <View style={[styles.winnerAvatar, { backgroundColor: winner.color }]}>
                      <Text style={styles.winnerAvatarText}>{winner.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.winnerInfo}>
                      <Text style={[styles.winnerName, { color: colors.homeCardTitle }]}>
                        {winner.name}
                      </Text>
                      <Text style={[styles.winnerSubtext, { color: colors.homeCardDescription }]}>
                        {isWinner
                          ? t('victoryModal.congratulations', '恭喜获得胜利！')
                          : t('victoryModal.winnerIs', '胜利者')}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 按钮区域 - 只有胜利者或房主才能操作 */}
                {isWinner ? (
                  <View style={styles.buttonContainer}>
                    {onRestart && (
                      <TouchableOpacity style={styles.primaryButton} onPress={onRestart}>
                        <LinearGradient
                          colors={['#4CAF50', '#66BB6A']}
                          style={styles.primaryButtonGradient}
                        >
                          <Ionicons name="refresh" size={20} color="white" />
                          <Text style={styles.primaryButtonText}>
                            {t('victoryModal.restart', '重新开始')}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.secondaryButton, { borderColor: colors.homeCardBorder }]}
                      onPress={onExit}
                    >
                      <Ionicons name="exit" size={20} color={colors.homeCardDescription} />
                      <Text
                        style={[styles.secondaryButtonText, { color: colors.homeCardDescription }]}
                      >
                        {t('victoryModal.exitGame', '退出游戏')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.spectatorContainer}>
                    <Text style={[styles.spectatorText, { color: colors.homeCardDescription }]}>
                      {t('victoryModal.waitingForWinner', '等待胜利者操作...')}
                    </Text>
                    <TouchableOpacity
                      style={[styles.closeButton, { borderColor: colors.homeCardBorder }]}
                      onPress={onClose}
                    >
                      <Text style={[styles.closeButtonText, { color: colors.homeCardDescription }]}>
                        {t('victoryModal.close', '关闭')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </BlurView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
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
