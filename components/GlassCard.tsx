import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number; // 毛玻璃强度
  borderGlow?: boolean; // 是否显示边框发光
  liquidAnimation?: boolean; // 是否显示液态动画
  glowIntensity?: 'low' | 'medium' | 'high'; // 发光强度
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 30,
  borderGlow = true,
  liquidAnimation = true,
  glowIntensity = 'medium',
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme] as any;

  // 动画值
  const liquidFlow = useSharedValue(0);
  const glowPulse = useSharedValue(0);

  useEffect(() => {
    if (liquidAnimation) {
      // 液态流动动画
      liquidFlow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 4000 }),
          withTiming(0, { duration: 4000 })
        ),
        -1
      );
    }

    if (borderGlow) {
      // 发光脉冲动画
      glowPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000 }),
          withTiming(0.3, { duration: 2000 })
        ),
        -1
      );
    }
  }, [liquidAnimation, borderGlow]);

  // 液态流动样式
  const liquidStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          liquidFlow.value,
          [0, 0.5, 1],
          [-50, 0, 50]
        ),
      },
    ],
    opacity: interpolate(
      liquidFlow.value,
      [0, 0.3, 0.7, 1],
      [0.3, 0.8, 0.8, 0.3]
    ),
  }));

  // 发光样式
  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(
      glowPulse.value,
      [0, 1],
      [0.3, 0.8]
    ),
    borderWidth: interpolate(
      glowPulse.value,
      [0, 1],
      [1, 2]
    ),
  }));

  // 获取发光强度设置
  const getGlowIntensity = () => {
    switch (glowIntensity) {
      case 'low':
        return {
          shadowRadius: 10,
          shadowColor: colors.nitrogenBlue,
          borderColor: colors.glassBorder,
        };
      case 'high':
        return {
          shadowRadius: 25,
          shadowColor: colors.nitrogenCyan,
          borderColor: colors.glassGlow,
        };
      default: // medium
        return {
          shadowRadius: 15,
          shadowColor: colors.nitrogenBlue,
          borderColor: colors.glassBorder,
        };
    }
  };

  const glowSettings = getGlowIntensity();

  return (
    <Animated.View
      style={[
        styles.container,
        borderGlow && {
          ...glowSettings,
          shadowOffset: { width: 0, height: 0 },
          elevation: 10,
        },
        borderGlow && glowStyle,
        style,
      ]}
    >
      {/* 背景毛玻璃效果 */}
      <BlurView
        intensity={intensity}
        tint={colors.homeBlurTint}
        style={StyleSheet.absoluteFillObject}
      />

      {/* 液态氮流动效果 */}
      {liquidAnimation && (
        <Animated.View style={[styles.liquidLayer, liquidStyle]}>
          <LinearGradient
            colors={[
              colors.liquidGradientStart,
              colors.liquidGradientMiddle,
              colors.liquidGradientEnd,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      )}

      {/* 主背景渐变 */}
      <LinearGradient
        colors={[
          colors.glassBackground,
          colors.frostWhite,
          colors.glassBackground,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* 内容容器 */}
      <View style={styles.content}>
        {children}
      </View>

      {/* 顶部高光效果 */}
      <LinearGradient
        colors={[
          colors.frostWhite,
          'transparent',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.highlight}
        pointerEvents="none"
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  liquidLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  content: {
    position: 'relative',
    zIndex: 2,
    padding: 20,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 1,
  },
});

export default GlassCard;