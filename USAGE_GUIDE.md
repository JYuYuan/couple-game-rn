# 项目依赖使用指南

本文档介绍如何使用项目中新添加的 NativeWind、Zustand 和 AsyncStorage。

## 🎨 NativeWind (Tailwind CSS)

### 基本使用

```tsx
import {View, Text} from 'react-native';

export const MyComponent = () => {
    return (
        <View className="flex-1 bg-blue-500 p-4">
            <Text className="text-white text-lg font-bold">Hello World</Text>
        </View>
    );
};
```

### 自定义主题颜色

配置文件：`tailwind.config.js`

```javascript
theme: {
  extend: {
    colors: {
      primary: "#007AFF",
      secondary: "#5AC8FA",
      success: "#34C759",
      warning: "#FF9500",
      error: "#FF3B30",
      background: "#F2F2F7",
      surface: "#FFFFFF",
      text: "#000000",
      textSecondary: "#8E8E93",
    },
  },
}
```

### 常用样式类

- 布局：`flex-1`, `flex-row`, `justify-center`, `items-center`
- 间距：`p-4`, `m-2`, `px-4`, `py-2`, `space-x-2`
- 颜色：`bg-primary`, `text-white`, `border-secondary`
- 圆角：`rounded-md`, `rounded-lg`, `rounded-full`
- 阴影：`shadow-md`, `shadow-lg`

## 🗃️ Zustand 状态管理

### 游戏状态管理

```tsx
import { useGameStore } from '@/store';

export const GameComponent = () => {
  const {
    status,
    players,
    diceValue,
    startGame,
    rollDice,
    movePlayer
  } = useGameStore();

  const handleStartGame = () => {
    startGame();
  };

  const handleRollDice = () => {
    const result = rollDice();
    console.log('骰子点数:', result);
  };

  return (
    <View>
      <Text>游戏状态: {status}</Text>
      <Text>骰子点数: {diceValue}</Text>
      {/* 其他 UI */}
    </View>
  );
};
```

### 设置状态管理

```tsx
import { useSettingsStore } from '@/store';

export const SettingsComponent = () => {
  const {
    theme,
    soundEnabled,
    musicVolume,
    setTheme,
    setSoundEnabled,
    setMusicVolume
  } = useSettingsStore();

  return (
    <View>
      <Text>当前主题: {theme}</Text>
      <Switch
        value={soundEnabled}
        onValueChange={setSoundEnabled}
      />
      <Slider
        value={musicVolume}
        onValueChange={setMusicVolume}
      />
    </View>
  );
};
```

### 用户状态管理

```tsx
import { useUserStore } from '@/store';

export const UserProfileComponent = () => {
  const {
    profile,
    isLoggedIn,
    statistics,
    updateProfile,
    addExperience
  } = useUserStore();

  const handleLevelUp = () => {
    addExperience(100);
  };

  if (!isLoggedIn) {
    return <Text>请先登录</Text>;
  }

  return (
    <View>
      <Text>用户名: {profile?.name}</Text>
      <Text>等级: {profile?.level}</Text>
      <Text>经验: {profile?.experience}</Text>
      <Text>总游戏次数: {statistics.totalGames}</Text>
    </View>
  );
};
```

## 💾 AsyncStorage 本地存储

### 基本存储操作

```tsx
import { StorageService, STORAGE_KEYS } from '@/utils';

// 保存数据
const saveUserData = async (userData: any) => {
  try {
    await StorageService.setItem(STORAGE_KEYS.USER_PROFILE, userData);
    console.log('用户数据保存成功');
  } catch (error) {
    console.error('保存失败:', error);
  }
};

// 读取数据
const loadUserData = async () => {
  try {
    const userData = await StorageService.getItem(STORAGE_KEYS.USER_PROFILE);
    return userData;
  } catch (error) {
    console.error('读取失败:', error);
    return null;
  }
};

// 删除数据
const clearUserData = async () => {
  try {
    await StorageService.removeItem(STORAGE_KEYS.USER_PROFILE);
    console.log('用户数据已清除');
  } catch (error) {
    console.error('清除失败:', error);
  }
};
```

### 游戏数据存储

```tsx
import { GameStorageService } from '@/utils';

// 保存游戏进度
const saveGame = async () => {
  try {
    const gameState = useGameStore.getState();
    await GameStorageService.saveGameProgress(gameState);
    Alert.alert('成功', '游戏进度已保存');
  } catch (error) {
    Alert.alert('错误', '保存失败');
  }
};

// 加载游戏进度
const loadGame = async () => {
  try {
    const savedGame = await GameStorageService.loadGameProgress();
    if (savedGame) {
      // 恢复游戏状态
      useGameStore.setState(savedGame);
      Alert.alert('成功', '游戏进度已加载');
    }
  } catch (error) {
    Alert.alert('错误', '加载失败');
  }
};

// 保存游戏历史
const saveGameResult = async (result: any) => {
  try {
    await GameStorageService.saveGameHistory(result);
    console.log('游戏结果已保存到历史记录');
  } catch (error) {
    console.error('保存游戏历史失败:', error);
  }
};
```

### 设置数据存储

```tsx
import { SettingsStorageService } from '@/utils';

// 保存设置
const saveSettings = async (settings: any) => {
  try {
    await SettingsStorageService.saveSettings(settings);
    console.log('设置已保存');
  } catch (error) {
    console.error('保存设置失败:', error);
  }
};

// 标记教程已完成
const markTutorialCompleted = async () => {
  try {
    await SettingsStorageService.setTutorialCompleted(true);
    console.log('教程状态已更新');
  } catch (error) {
    console.error('更新教程状态失败:', error);
  }
};
```

## 🛠️ 工具函数

```tsx
import {
  formatTime,
  formatScore,
  debounce,
  throttle,
  generateUniqueId,
  clamp,
  randomIntBetween
} from '@/utils';

// 时间格式化
const formattedTime = formatTime(125); // "02:05"

// 分数格式化
const formattedScore = formatScore(1500); // "1.5K"

// 防抖函数
const debouncedSearch = debounce((query: string) => {
  console.log('搜索:', query);
}, 300);

// 节流函数
const throttledUpdate = throttle(() => {
  console.log('更新');
}, 1000);

// 生成唯一ID
const uniqueId = generateUniqueId();

// 数值限制
const clampedValue = clamp(value, 0, 100);

// 随机整数
const randomDice = randomIntBetween(1, 6);
```

## 📁 项目结构

```
src/
├── components/     # React 组件
├── store/         # Zustand 状态管理
│   ├── gameStore.ts
│   ├── settingsStore.ts
│   ├── userStore.ts
│   └── index.ts
├── utils/         # 工具函数
│   ├── storage.ts
│   ├── board.ts
│   └── index.ts
├── types/         # TypeScript 类型定义
│   └── game.ts
├── hooks/         # 自定义 Hooks
├── constants/     # 常量定义
└── assets/        # 静态资源
```

## 🚀 最佳实践

1. **状态管理**：使用 Zustand 管理全局状态，避免 prop drilling
2. **样式**：使用 NativeWind 类名而不是内联样式
3. **存储**：敏感数据使用加密存储，普通数据使用 AsyncStorage
4. **类型安全**：充分利用 TypeScript 类型检查
5. **性能优化**：使用 debounce/throttle 优化频繁操作

## 🔗 相关文档

- [NativeWind 官方文档](https://www.nativewind.dev/)
- [Zustand 官方文档](https://zustand-demo.pmnd.rs/)
- [AsyncStorage 官方文档](https://react-native-async-storage.github.io/async-storage/)