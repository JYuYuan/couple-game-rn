/**
 * Flying Chess 游戏核心UI组件
 * 统一offline和online的UI渲染
 */

import React from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated from 'react-native-reanimated'
import GameBoard from '@/components/GameBoard'
import TaskModal from '@/components/TaskModal'
import VictoryModal from '@/components/VictoryModal'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { GameCoreProps } from './types'

interface GameCorePropsWithAnimation extends GameCoreProps {
  diceAnimatedStyle: any // 动画样式从外部传入
}

/**
 * Flying Chess 游戏核心UI组件
 * 统一offline和online的UI渲染
 */
export default function GameCore({
  mode,
  gameStatus,
  players,
  currentPlayer,
  currentPlayerIndex,
  boardPath,
  diceValue,
  isRolling,
  isMoving,
  showTaskModal,
  taskModalData,
  showVictoryModal,
  winner,
  onDiceRoll,
  onTaskComplete,
  onResetGame,
  onExit,
  colors,
  t,
  isOwnTurn = true, // offline默认true, online根据实际情况
  isHost = true, // offline默认true, online根据实际情况
  diceAnimatedStyle,
}: GameCorePropsWithAnimation) {
  // 判断是否可以投骰子
  const canRollDice =
    mode === 'offline'
      ? !isRolling && !isMoving // 离线模式: 只要不在动画中就可以
      : isOwnTurn && !isRolling && !isMoving // 在线模式: 还要检查是否自己的回合

  return (
    <View style={[styles.container, { backgroundColor: colors.homeBackground }]}>
      {/* 背景渐变 */}
      <LinearGradient
        colors={[colors.homeGradientStart, colors.homeGradientMiddle, colors.homeGradientEnd]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 游戏状态栏 */}
        <View style={[styles.statusBar, { backgroundColor: colors.homeCardBackground }]}>
          <View style={styles.statusLeft}>
            <Text style={[styles.statusTitle, { color: colors.homeCardTitle }]}>
              {gameStatus === 'waiting'
                ? t('flyingChess.gameStatus.waiting', '准备开始')
                : gameStatus === 'playing'
                  ? t('flyingChess.gameStatus.playing', '游戏进行中')
                  : t('flyingChess.gameStatus.finished', '游戏结束')}
            </Text>
            {gameStatus === 'playing' && currentPlayer && (
              <Text style={[styles.currentPlayerText, { color: currentPlayer.color }]}>
                {mode === 'online' && !isOwnTurn && '等待对方...'}
                {(mode === 'offline' || isOwnTurn) &&
                  t('flyingChess.currentPlayer', '轮到 {{playerName}}', {
                    playerName: currentPlayer.name,
                  })}
              </Text>
            )}
          </View>

          {gameStatus === 'playing' && (
            <View style={styles.diceContainer}>
              <View style={styles.diceWrapper}>
                <TouchableOpacity
                  style={[
                    styles.diceButton,
                    {
                      backgroundColor: !canRollDice ? '#FF6B6B' : colors.settingsAccent,
                      borderWidth: 3,
                      borderColor: 'white',
                      opacity: !canRollDice ? 0.6 : 1,
                    },
                  ]}
                  onPress={onDiceRoll}
                  disabled={!canRollDice}
                  activeOpacity={0.8}
                >
                  {isRolling ? (
                    <Animated.View style={diceAnimatedStyle}>
                      <Text style={styles.diceEmoji}>🎲</Text>
                    </Animated.View>
                  ) : (
                    <Text style={[styles.diceResultText, { color: 'white' }]}>
                      {diceValue || '🎲'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              <Text
                style={[styles.diceText, { color: colors.homeCardDescription, fontWeight: '600' }]}
              >
                {isRolling
                  ? t('flyingChess.dice.rolling', '投掷中...')
                  : isMoving
                    ? t('flyingChess.dice.moving', '棋子移动中...')
                    : mode === 'online' && !isOwnTurn
                      ? t('flyingChess.dice.waitingOpponent', '等待对方投骰子')
                      : t('flyingChess.dice.clickToRoll', '点击投掷骰子')}
              </Text>
            </View>
          )}
        </View>

        {/* 玩家信息 */}
        <View style={[styles.playersInfo, { backgroundColor: colors.homeCardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.homeCardTitle }]}>
            {t('flyingChess.playersStatus', '玩家状态')}
          </Text>
          <View style={styles.playersGrid}>
            {players.map((player, index) => (
              <View
                key={player.id}
                style={[
                  styles.playerCard,
                  {
                    backgroundColor: player.color + '15',
                    borderColor: currentPlayerIndex === index ? player.color : 'transparent',
                    borderWidth: currentPlayerIndex === index ? 2 : 0,
                  },
                ]}
              >
                <PlayerAvatar
                  avatarId={player.avatarId || ''}
                  color={player.color || '#999'}
                  size={32}
                />
                <View style={styles.playerInfo}>
                  <Text style={[styles.playerName, { color: colors.homeCardTitle }]}>
                    {player.name}
                  </Text>
                  <Text style={[styles.playerPosition, { color: colors.homeCardDescription }]}>
                    {t('flyingChess.position', '位置: {{position}}', {
                      position: (player.position || 0) + 1,
                    })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 游戏棋盘 */}
        <View style={[styles.boardSection, { backgroundColor: colors.homeCardBackground }]}>
          <GameBoard
            players={players as any} // 类型兼容性转换
            boardData={boardPath}
            currentPlayer={currentPlayerIndex}
          />
        </View>
      </ScrollView>

      {/* 任务弹窗 */}
      <TaskModal
        visible={showTaskModal}
        task={taskModalData}
        players={players as any} // 类型兼容性转换
        onComplete={onTaskComplete}
        onClose={() => {}} // 由外部控制关闭
      />

      {/* 胜利弹窗 */}
      <VictoryModal
        visible={showVictoryModal}
        winner={winner as any} // 类型兼容性转换
        isWinner={
          mode === 'offline' || winner?.id === parseInt(currentPlayer?.id?.toString() || '0')
        }
        onRestart={onResetGame}
        onExit={onExit}
        onClose={() => {}} // 由外部控制关闭
      />
    </View>
  )
}

// 样式定义
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusLeft: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  currentPlayerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  diceContainer: {
    alignItems: 'center',
    gap: 12,
  },
  diceWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1,
  },
  diceEmoji: {
    fontSize: 32,
  },
  diceResultText: {
    fontSize: 24,
    fontWeight: '700',
  },
  diceText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  playersInfo: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  playersGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  playerCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  playerPosition: {
    fontSize: 12,
  },
  boardSection: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
})
