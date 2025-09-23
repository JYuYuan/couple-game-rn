import React, { forwardRef, useImperativeHandle } from 'react'
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { WHEEL_REWARDS, WheelResult } from '@/hooks/use-wheel-game'

const { width } = Dimensions.get('window')
const WHEEL_SIZE = Math.min(width * 0.8, 300)
const SEGMENT_ANGLE = 360 / WHEEL_REWARDS.length

export interface WheelOfFortuneRef {
  spin: () => void
}

interface WheelOfFortuneProps {
  onSpinComplete: (result: WheelResult) => void
  disabled?: boolean
}

const WheelOfFortune = forwardRef<WheelOfFortuneRef, WheelOfFortuneProps>(
  ({ onSpinComplete, disabled = false }, ref) => {
    const rotation = useSharedValue(0)
    const isSpinning = useSharedValue(false)

    useImperativeHandle(ref, () => ({
      spin: () => {
        if (isSpinning.value) return

        // 计算随机停止角度
        const randomAngle = Math.random() * 360
        const totalRotation = 360 * 5 + randomAngle // 转5圈加随机角度

        // 计算最终停止在哪个奖励区域
        const finalAngle = randomAngle % 360
        const segmentIndex = Math.floor((360 - finalAngle) / SEGMENT_ANGLE) % WHEEL_REWARDS.length
        const selectedReward = WHEEL_REWARDS[segmentIndex]

        isSpinning.value = true

        rotation.value = withSequence(
          withTiming(rotation.value + totalRotation, {
            duration: 3000,
            easing: Easing.out(Easing.cubic),
          }),
          withTiming(rotation.value + totalRotation, {
            duration: 500,
            easing: Easing.elastic(1.2),
          }),
        )

        // 3.5秒后触发完成回调
        setTimeout(() => {
          isSpinning.value = false
          runOnJS(onSpinComplete)({
            id: selectedReward.id,
            label: selectedReward.label,
            type: selectedReward.type as 'task' | 'extra_spin',
            difficulty: selectedReward.difficulty,
            color: selectedReward.color,
          })
        }, 3500)
      },
    }))

    WheelOfFortune.displayName = 'WheelOfFortune'

    const wheelAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${rotation.value}deg` }],
    }))

    const renderSegment = (reward: (typeof WHEEL_REWARDS)[0], index: number) => {
      const startAngle = index * SEGMENT_ANGLE

      return (
        <View
          key={reward.id}
          style={[
            styles.segment,
            {
              transform: [{ rotate: `${startAngle}deg` }],
            },
          ]}
        >
          <LinearGradient
            colors={[reward.color, reward.color + '80']}
            style={styles.segmentGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.segmentContent}>
              <Text style={styles.segmentText} />
            </View>
          </LinearGradient>
        </View>
      )
    }

    return (
      <View style={styles.container}>
        {/* 转盘背景 */}
        <View style={styles.wheelContainer}>
          <Animated.View style={[styles.wheel, wheelAnimatedStyle]}>
            {WHEEL_REWARDS.map((reward, index) => renderSegment(reward, index))}
          </Animated.View>

          {/* 指针 */}
          <View style={styles.pointer}>
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.pointerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.pointerText}>▼</Text>
            </LinearGradient>
          </View>
        </View>

        {/* 转盘中心按钮 */}
        <TouchableOpacity
          style={[styles.centerButton, disabled && styles.centerButtonDisabled]}
          disabled={disabled}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={disabled ? ['#CCCCCC', '#999999'] : ['#FF6B6B', '#FF8A80']}
            style={styles.centerButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[styles.centerButtonText, disabled && styles.centerButtonTextDisabled]}>
              转盘
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    )
  },
)

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  wheelContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheel: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  segment: {
    position: 'absolute',
    width: WHEEL_SIZE / 2,
    height: WHEEL_SIZE / 2,
    top: 0,
    left: WHEEL_SIZE / 2,
    transformOrigin: '0% 100%',
    borderLeftWidth: 1,
    borderLeftColor: '#FFFFFF50',
  },
  segmentGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  segmentContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
  },
  segmentText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  pointer: {
    position: 'absolute',
    top: -10,
    zIndex: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pointerGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  centerButton: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  centerButtonDisabled: {
    opacity: 0.6,
  },
  centerButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  centerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  centerButtonTextDisabled: {
    color: '#666666',
  },
})

export default WheelOfFortune
