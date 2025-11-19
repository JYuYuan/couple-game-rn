# Server - AI 服务

这个目录包含了项目的 AI 服务模块，用于为游戏提供智能辅助功能。

## 📁 目录结构

```
server/
├── ai/                          # AI 服务核心
│   ├── client.ts               # SiliconFlow AI 客户端
│   ├── prompts.ts              # 游戏角色提示词配置
│   ├── draw-guess-service.ts   # 你画我猜词语生成服务
│   └── index.ts                # 统一导出
├── types/                       # TypeScript 类型定义
│   └── index.ts
├── examples.tsx                 # 使用示例
└── index.ts                     # 服务模块入口
```

## 🚀 快速开始

### 1. 配置环境变量

在项目根目录创建 `.env` 文件（基于 `.env.example`）：

```bash
# AI 服务配置
EXPO_PUBLIC_SILICONFLOW_API_KEY=sk-your-api-key-here
```

从 [SiliconFlow](https://siliconflow.cn) 获取你的 API Key。

### 2. 使用示例

#### 生成你画我猜词语

```typescript
import { drawGuessWordService } from '@/services'

// 生成 5 个中等难度的词语
const words = await drawGuessWordService.generateWords({
  difficulty: 'medium',
  category: '动物',
  count: 5,
  language: 'zh',
})

console.log(words)
// [
//   {
//     word: "企鹅",
//     difficulty: "medium",
//     category: "动物",
//     hints: ["不会飞的鸟", "住在南极", "黑白色"]
//   },
//   ...
// ]
```

#### 在 React Native 组件中使用

```typescript
import { drawGuessWordService } from '@/services'
import { useState } from 'react'

function DrawGuessGame() {
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(false)

  const generateNewWords = async () => {
    setLoading(true)
    try {
      const newWords = await drawGuessWordService.generateWords({
        difficulty: 'easy',
        count: 3,
      })
      setWords(newWords)
    } catch (error) {
      console.error('生成失败:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View>
      <Button onPress={generateNewWords} disabled={loading}>
        {loading ? '生成中...' : '生成新词语'}
      </Button>
      {/* 显示词语 */}
    </View>
  )
}
```

#### 直接使用 AI 客户端

```typescript
import { aiClient, getGameSystemPrompt } from '@/services'

// 获取游戏专属的系统提示词
const systemPrompt = getGameSystemPrompt('draw-guess')

// 发送自定义请求
const response = await aiClient.simpleChat(
  systemPrompt,
  '生成 3 个适合情侣玩的绘画词语'
)

console.log(response)
```

## 🎮 支持的游戏

当前支持以下游戏的 AI 功能：

1. **你画我猜** (`draw-guess`)
   - 智能词语生成
   - 多难度级别（简单、中等、困难）
   - 多分类支持（动物、食物、物品等）
   - 渐进式提示

2. **扫雷** (`minesweeper`)
   - 策略分析（开发中）
   - 安全区域推荐

3. **扫雷对战** (`minesweeper-battle`)
   - 竞技策略建议（开发中）

4. **飞行棋** (`flying-chess`)
   - 走棋建议（开发中）

5. **转盘积分** (`wheel-points`)
   - 创意任务生成（开发中）

## 📚 API 文档

### DrawGuessWordService

#### `generateWords(options?)`

生成多个游戏词语。

**参数:**
- `options.difficulty?`: `'easy' | 'medium' | 'hard'` - 难度级别（默认: `'medium'`）
- `options.category?`: `string` - 词语分类（默认: `'随机'`）
- `options.count?`: `number` - 生成数量（默认: `5`）
- `options.language?`: `'zh' | 'en'` - 语言（默认: `'zh'`）

**返回:** `Promise<GeneratedWord[]>`

#### `generateSingleWord(options?)`

生成单个词语。

**参数:** 同上（不包括 `count`）

**返回:** `Promise<GeneratedWord>`

#### `getAvailableCategories()`

获取所有可用的词语分类。

**返回:** `string[]`

#### `validateWord(word)`

验证词语是否适合游戏。

**参数:**
- `word`: `string` - 要验证的词语

**返回:** `{ valid: boolean, reason?: string }`

### SiliconFlowClient

#### `chat(messages, options?)`

发送聊天请求。

**参数:**
- `messages`: `AIMessage[]` - 消息数组
- `options?`: `AIRequestOptions` - 请求选项

**返回:** `Promise<AIResponse>`

#### `simpleChat(systemPrompt, userMessage, options?)`

发送简单的单次请求。

**参数:**
- `systemPrompt`: `string` - 系统提示词
- `userMessage`: `string` - 用户消息
- `options?`: `AIRequestOptions` - 请求选项

**返回:** `Promise<string>`

#### `testConnection()`

测试 API 连接。

**返回:** `Promise<boolean>`

## 🎨 词语分类

支持以下分类：

- 随机（混合各种分类）
- 动物
- 食物
- 物品
- 自然
- 建筑
- 情感
- 运动
- 职业
- 交通
- 植物

## 🔧 配置选项

### 环境变量

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| `EXPO_PUBLIC_SILICONFLOW_API_KEY` | SiliconFlow API Key | - | ✅ |
| `EXPO_PUBLIC_SILICONFLOW_API_URL` | API 地址 | `https://api.siliconflow.cn/v1/chat/completions` | ❌ |
| `EXPO_PUBLIC_SILICONFLOW_MODEL` | AI 模型 | `Qwen/QwQ-32B` | ❌ |

## 🛡️ 错误处理

AI 服务内置了完善的错误处理机制：

1. **API 调用失败**: 自动返回备用词语库
2. **网络超时**: 使用本地词语数据
3. **解析错误**: 回退到默认词语

```typescript
try {
  const words = await drawGuessWordService.generateWords()
  // AI 生成成功
} catch (error) {
  // 即使失败也会返回备用词语，保证游戏正常运行
  console.log('使用备用词语:', words)
}
```

## 📝 最佳实践

1. **缓存词语**: 批量生成并缓存，减少 API 调用
2. **备用方案**: 始终准备本地词语库作为后备
3. **用户体验**: 生成时显示加载状态
4. **成本控制**: 合理设置 `max_tokens` 和调用频率

## 🔍 调试

启用调试日志：

```typescript
// AI 服务会自动输出关键日志
// ✨ Generated 5 words for draw-guess game
// ❌ Failed to generate words: [error details]
```

## 📄 许可证

MIT

---

Nya~! 如果有任何问题，欢迎提 issue 喵~ 🐾
