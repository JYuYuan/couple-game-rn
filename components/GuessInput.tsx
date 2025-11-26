import React, { useState, useEffect } from 'react'
import { StyleSheet, View, TextInput, TouchableOpacity, Text, Platform, KeyboardAvoidingView } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  Easing,
  interpolate,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { Colors } from '@/constants/theme'

export interface GuessInputProps {
  correctWord: string
  onGuessCorrect: () => void
  onGuessWrong?: () => void
  colors?: typeof Colors.light | typeof Colors.dark
  disabled?: boolean
  placeholder?: string
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient)

export const GuessInput: React.FC<GuessInputProps> = ({
  correctWord,
  onGuessCorrect,
  onGuessWrong,
  colors = Colors.light,
  disabled = false,
  placeholder,
}) => {
  const { t } = useTranslation()
  const [guess, setGuess] = useState('')
  const [showFeedback, setShowFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [isFocused, setIsFocused] = useState(false)

  // Use translated placeholder if not provided
  const inputPlaceholder = placeholder || t('drawGuess.game.guessPlaceholder')

  // Animation values
  const shakeTranslate = useSharedValue(0)
  const bounceScale = useSharedValue(1)
  const buttonScale = useSharedValue(1)
  const glowOpacity = useSharedValue(0)
  const successRotate = useSharedValue(0)
  const pulseScale = useSharedValue(1)
  const borderGlow = useSharedValue(0)

  // Focus pulse animation
  useEffect(() => {
    if (isFocused && !showFeedback) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      )
      borderGlow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      )
    } else {
      pulseScale.value = withSpring(1)
      borderGlow.value = withTiming(0)
    }
  }, [isFocused, showFeedback])

  const handleSubmit = () => {
    if (!guess.trim() || disabled || showFeedback) return

    const isCorrect = guess.trim().toLowerCase() === correctWord.toLowerCase()

    if (isCorrect) {
      // Success animations
      setShowFeedback('correct')

      // Bounce animation
      bounceScale.value = withSequence(
        withSpring(1.1, { damping: 8, stiffness: 200 }),
        withSpring(0.95, { damping: 8, stiffness: 200 }),
        withSpring(1.05, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 10, stiffness: 150 }),
      )

      // Success rotation
      successRotate.value = withSequence(
        withTiming(360, { duration: 600, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 0 }),
      )

      // Glow effect
      glowOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0.7, { duration: 400 }),
        withTiming(0, { duration: 400 }),
      )

      setTimeout(() => {
        setGuess('')
        setShowFeedback(null)
        onGuessCorrect()
      }, 1200)
    } else {
      // Wrong answer shake animation
      setShowFeedback('wrong')
      onGuessWrong?.()

      shakeTranslate.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-4, { duration: 50 }),
        withTiming(4, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      )

      setTimeout(() => {
        setShowFeedback(null)
      }, 900)
    }
  }

  const handleButtonPressIn = () => {
    buttonScale.value = withSpring(0.9, { damping: 10, stiffness: 400 })
  }

  const handleButtonPressOut = () => {
    buttonScale.value = withSpring(1, { damping: 10, stiffness: 400 })
  }

  const getFeedbackColor = () => {
    if (showFeedback === 'correct') return colors.success || '#10B981'
    if (showFeedback === 'wrong') return colors.error || '#EF4444'
    return '#F59E0B'
  }

  const getFeedbackIcon = () => {
    if (showFeedback === 'correct') return 'checkmark-circle'
    if (showFeedback === 'wrong') return 'close-circle'
    return 'paper-plane'
  }

  // Container animation style
  const containerAnimatedStyle = useAnimatedStyle(() => {
    'worklet'
    return {
      transform: [
        { translateX: shakeTranslate.value },
        { scale: bounceScale.value * pulseScale.value },
      ],
    }
  })

  // Glow animation style - 只用于反馈时的发光效果
  const glowAnimatedStyle = useAnimatedStyle(() => {
    'worklet'
    if (!showFeedback) {
      return {
        shadowOpacity: 0,
      }
    }
    const color = showFeedback === 'correct' ? '#10B981' : '#EF4444'
    return {
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: interpolate(glowOpacity.value, [0, 1], [0, 0.8]),
      shadowRadius: interpolate(glowOpacity.value, [0, 1], [0, 20]),
      elevation: interpolate(glowOpacity.value, [0, 1], [0, 10]),
    }
  })

  // Button animation style
  const buttonAnimatedStyle = useAnimatedStyle(() => {
    'worklet'
    return {
      transform: [{ scale: buttonScale.value }, { rotate: `${successRotate.value}deg` }],
    }
  })

  // Border glow style
  const borderAnimatedStyle = useAnimatedStyle(() => {
    'worklet'
    const glowIntensity = borderGlow.value

    // 在 worklet 中直接计算颜色，不调用外部函数
    let borderColor = '#F59E0B' // 默认橙色
    if (showFeedback === 'correct') {
      borderColor = colors.success || '#10B981'
    } else if (showFeedback === 'wrong') {
      borderColor = colors.error || '#EF4444'
    } else if (isFocused) {
      borderColor = `rgba(245, 158, 11, ${0.5 + glowIntensity * 0.5})`
    }

    return {
      borderColor,
      shadowColor: isFocused ? '#F59E0B' : '#000',
      shadowOffset: { width: 0, height: isFocused ? 4 : 2 },
      shadowOpacity: isFocused ? interpolate(glowIntensity, [0, 1], [0.1, 0.3]) : 0.15,
      shadowRadius: isFocused ? interpolate(glowIntensity, [0, 1], [4, 8]) : 6,
      elevation: isFocused ? 5 : 4,
    }
  })

  const isButtonDisabled = !guess.trim() || disabled || !!showFeedback

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ width: '100%' }}
    >
      <View style={styles.container}>
        <Animated.View style={[containerAnimatedStyle, glowAnimatedStyle]}>
          <Animated.View
            style={[
              styles.inputContainer,
              {
                // 使用 surface 颜色，确保在两种主题下都有对比度
                // 浅色主题: #FFFFFF (白色)
                // 深色主题: #2C2C2E (深灰色)
                backgroundColor: colors.surface || '#FFFFFF',
              },
              borderAnimatedStyle,
            ]}
          >
            {/* Input field */}
            <View style={styles.inputWrapper}>
              <Ionicons
                name="create-outline"
                size={22}
                color={isFocused ? '#F59E0B' : colors.homeCardDescription || '#999999'}
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.homeCardTitle || '#000000',
                    outlineStyle: 'none' as any, // 去掉焦点边框 (Web only)
                  },
                ]}
                value={guess}
                onChangeText={setGuess}
                placeholder={inputPlaceholder}
                placeholderTextColor={colors.homeCardDescription || '#999999'}
                onSubmitEditing={handleSubmit}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                returnKeyType="send"
                autoCorrect={false}
                autoCapitalize="none"
                editable={!disabled && !showFeedback}
              />
            </View>

            {/* Submit button with gradient */}
            <Animated.View style={buttonAnimatedStyle}>
              <TouchableOpacity
                onPress={handleSubmit}
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
                disabled={isButtonDisabled}
                activeOpacity={1}
                style={styles.submitButtonWrapper}
              >
                <AnimatedLinearGradient
                  colors={
                    showFeedback === 'correct'
                      ? ['#10B981', '#059669']
                      : showFeedback === 'wrong'
                        ? ['#EF4444', '#DC2626']
                        : ['#F59E0B', '#FBBF24']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.submitButton,
                    {
                      opacity: isButtonDisabled ? 0.5 : 1,
                    },
                  ]}
                >
                  <Ionicons name={getFeedbackIcon() as any} size={24} color="#FFFFFF" />
                </AnimatedLinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </Animated.View>

        {/* Feedback message */}
        {showFeedback && (
          <Animated.View
            style={[
              styles.feedbackContainer,
              {
                backgroundColor:
                  showFeedback === 'correct' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              },
            ]}
          >
            <LinearGradient
              colors={
                showFeedback === 'correct'
                  ? ['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.05)']
                  : ['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.05)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.feedbackGradient}
            >
              <Ionicons
                name={showFeedback === 'correct' ? 'trophy' : 'heart'}
                size={20}
                color={getFeedbackColor()}
              />
              <Text
                style={[
                  styles.feedbackText,
                  {
                    color: getFeedbackColor(),
                  },
                ]}
              >
                {showFeedback === 'correct' ? t('drawGuess.feedback.correct') : t('drawGuess.feedback.wrong')}
              </Text>
            </LinearGradient>
          </Animated.View>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 3,
    paddingHorizontal: 16,
    paddingVertical: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputIcon: {
    marginTop: Platform.OS === 'ios' ? 2 : 0,
  },
  input: {
    flex: 1,
    fontSize: 18,
    paddingVertical: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  submitButtonWrapper: {
    marginLeft: 8,
  },
  submitButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  feedbackContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  feedbackGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})
