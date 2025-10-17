# WebRTC Expo Go 兼容性修复

## 问题描述

`react-native-webrtc` 无法在 Expo Go 中运行，因为它依赖于原生模块。当应用在 Expo Go 中启动时，会抛出以下错误：

```
TypeError: (0, _reactNative.requireNativeComponent) is not a function
```

## 解决方案

创建了一个 WebRTC 包装器 (`services/webrtc-wrapper.ts`)，实现以下功能：

1. **环境检测**: 检测是否在 Expo Go 中运行
2. **动态加载**: 只在非 Expo Go 环境中加载 `react-native-webrtc`
3. **Mock 实现**: 在 Expo Go 中提供模拟实现，避免应用崩溃
4. **运行时检查**: 提供 `isWebRTCAvailable()` 函数检查 WebRTC 是否可用

## 修改的文件

### 1. 新建文件

- `services/webrtc-wrapper.ts` - WebRTC 包装器

### 2. 修改的文件

- `services/p2p-server.ts` - 使用 webrtc-wrapper 替代直接导入
- `services/p2p-client.ts` - 使用 webrtc-wrapper 替代直接导入
- `services/socket-service.ts` - 使用 webrtc-wrapper 替代直接导入
- `services/webrtc-signaling.ts` - 移除类型导入，使用 any 类型

### 3. Manager 文件优化

- `services/p2p/player-manager.ts` - 改进导出方式
- `services/p2p/room-manager.ts` - 改进导出方式
- `services/p2p/game-instance-manager.ts` - 改进导出方式

## 使用方式

### 在 Expo Go 中

应用可以正常启动，但 P2P 功能会被禁用。尝试使用 P2P 功能时会显示友好的错误消息：

```
WebRTC 不可用。P2P 模式需要使用 expo-dev-client 或生产构建，无法在 Expo Go 中运行。
```

### 在开发构建或生产环境中

WebRTC 功能完全可用。需要先运行以下命令之一：

#### 开发构建 (推荐用于开发)
```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

#### 生产构建
```bash
# 使用 EAS Build
eas build --platform ios
eas build --platform android
```

## WebRTC 可用性检查

代码中已添加 WebRTC 可用性检查：

```typescript
import { isWebRTCAvailable } from './webrtc-wrapper'

if (!isWebRTCAvailable()) {
  throw new Error('WebRTC 不可用。P2P 模式需要使用 expo-dev-client 或生产构建')
}
```

## 控制台输出

### Expo Go 中
```
🔶 Running in Expo Go - WebRTC features are mocked and will not work
```

### 开发构建/生产环境中
```
✅ WebRTC loaded successfully
```

## 技术细节

### 包装器实现原理

1. **环境检测**
   ```typescript
   const isExpoGo = !!(global as any).__expo?.isExpoGo
   ```

2. **条件加载**
   ```typescript
   if (isExpoGo) {
     // 使用 Mock 实现
   } else {
     // 使用 require() 动态加载真实的 WebRTC
     const webrtc = require('react-native-webrtc')
   }
   ```

3. **类型安全**
   - 使用 `any` 类型避免类型冲突
   - 导出统一的接口供其他模块使用

## 注意事项

1. **Expo Go 限制**: P2P 功能在 Expo Go 中完全不可用
2. **开发建议**: 如需测试 P2P 功能，请使用 `expo run:ios` 或 `expo run:android`
3. **生产部署**: 确保使用生产构建，而非 Expo Go

## 相关文档

- [React Native WebRTC](https://github.com/react-native-webrtc/react-native-webrtc)
- [Expo Dev Client](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
