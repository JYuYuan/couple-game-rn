/**
 * 动画配置常量
 *
 * 统一管理项目中使用的动画配置，确保动画效果的一致性
 */

import { withTiming, withSpring, Easing } from 'react-native-reanimated'

/**
 * Timing 动画配置预设
 */
export const timingConfig = {
  /** 快速动画 - 150ms */
  fast: {
    duration: 150,
    easing: Easing.out(Easing.ease),
  },
  /** 正常动画 - 300ms */
  normal: {
    duration: 300,
    easing: Easing.out(Easing.ease),
  },
  /** 慢速动画 - 500ms */
  slow: {
    duration: 500,
    easing: Easing.out(Easing.ease),
  },
  /** 超慢动画 - 800ms */
  verySlow: {
    duration: 800,
    easing: Easing.out(Easing.ease),
  },
} as const

/**
 * Spring 动画配置预设
 */
export const springConfig = {
  /** 弹性动画 - 适合按钮点击 */
  bouncy: {
    damping: 10,
    stiffness: 100,
    mass: 1,
  },
  /** 平滑动画 - 适合 Modal */
  smooth: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  /** 硬动画 - 适合快速响应 */
  stiff: {
    damping: 20,
    stiffness: 200,
    mass: 1,
  },
  /** 柔和动画 - 适合渐变效果 */
  gentle: {
    damping: 25,
    stiffness: 120,
    mass: 1,
  },
} as const

/**
 * Easing 函数预设
 */
export const easingPresets = {
  /** 线性 */
  linear: Easing.linear,
  /** 缓入 */
  easeIn: Easing.in(Easing.ease),
  /** 缓出 */
  easeOut: Easing.out(Easing.ease),
  /** 缓入缓出 */
  easeInOut: Easing.inOut(Easing.ease),
  /** 弹性缓出 */
  elasticOut: Easing.elastic(1),
  /** 回弹 */
  back: Easing.back(1.5),
  /** 弹跳 */
  bounce: Easing.bounce,
} as const

/**
 * 常用动画持续时间（毫秒）
 */
export const animationDuration = {
  instant: 0,
  veryFast: 100,
  fast: 150,
  normal: 300,
  slow: 500,
  verySlow: 800,
  long: 1000,
} as const

/**
 * 动画辅助函数
 */
export const animationHelpers = {
  /**
   * 创建 timing 动画
   */
  timing: (value: number, config = timingConfig.normal) =>
    withTiming(value, config),

  /**
   * 创建 spring 动画
   */
  spring: (value: number, config = springConfig.smooth) =>
    withSpring(value, config),

  /**
   * 创建快速 timing 动画
   */
  fastTiming: (value: number) => withTiming(value, timingConfig.fast),

  /**
   * 创建普通 timing 动画
   */
  normalTiming: (value: number) => withTiming(value, timingConfig.normal),

  /**
   * 创建慢速 timing 动画
   */
  slowTiming: (value: number) => withTiming(value, timingConfig.slow),

  /**
   * 创建弹性 spring 动画
   */
  bouncySpring: (value: number) => withSpring(value, springConfig.bouncy),

  /**
   * 创建平滑 spring 动画
   */
  smoothSpring: (value: number) => withSpring(value, springConfig.smooth),
}

/**
 * Modal 动画配置预设
 */
export const modalAnimationPresets = {
  /** 默认 Modal 动画 */
  default: {
    duration: 300,
    initialScale: 0.8,
    translateY: 50,
    backdropDuration: 200,
  },
  /** 从底部滑入的 Modal */
  slideUp: {
    duration: 400,
    initialScale: 1,
    translateY: 100,
    backdropDuration: 300,
  },
  /** 快速弹出的 Modal */
  quick: {
    duration: 200,
    initialScale: 0.9,
    translateY: 30,
    backdropDuration: 150,
  },
  /** 慢速淡入的 Modal */
  fade: {
    duration: 500,
    initialScale: 1,
    translateY: 0,
    backdropDuration: 500,
  },
} as const

/**
 * 按钮动画配置预设
 */
export const buttonAnimationPresets = {
  /** 按下缩小 */
  pressScale: {
    pressed: 0.95,
    normal: 1,
    duration: 100,
  },
  /** 按下发光 */
  pressGlow: {
    pressed: 1.2,
    normal: 1,
    duration: 150,
  },
} as const

/**
 * 加载动画配置
 */
export const loadingAnimationPresets = {
  /** 旋转加载 */
  rotate: {
    duration: 1000,
    easing: Easing.linear,
  },
  /** 脉冲加载 */
  pulse: {
    duration: 1200,
    scaleRange: [0.8, 1.2],
  },
  /** 呼吸加载 */
  breathe: {
    duration: 2000,
    opacityRange: [0.3, 1],
  },
} as const
