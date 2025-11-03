// 全局类型声明

// NativeWind 样式类型扩展
declare module 'react-native' {
  interface ViewProps {
    className?: string;
  }
  interface TextProps {
    className?: string;
  }
  interface ImageProps {
    className?: string;
  }
  interface ScrollViewProps {
    className?: string;
  }
  interface TouchableOpacityProps {
    className?: string;
  }
  interface TouchableHighlightProps {
    className?: string;
  }
  interface TouchableWithoutFeedbackProps {
    className?: string;
  }
  interface PressableProps {
    className?: string;
  }
}

// Zustand 存储类型扩展
declare global {
  interface Window {
    // Zustand DevTools 扩展类型定义
    __ZUSTAND_DEVTOOLS_EXTENSION__?: {
      connect: (options?: unknown) => unknown;
      disconnect: () => void;
    };
  }
}

// AsyncStorage 键名类型
export type StorageKeys = typeof import('@/utils/storage').STORAGE_KEYS;

// 游戏相关全局类型
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'zh' | 'en';
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticFeedback: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: Date;
}

export interface GameHistory {
  id: string;
  mode: 'single' | 'multi';
  score: number;
  duration: number;
  won: boolean;
  completedAt: Date;
  players: string[];
}

export {};