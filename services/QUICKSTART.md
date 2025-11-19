# AI 服务快速入门指南 🚀

欢迎使用 AI 服务！这个指南将帮助你在 5 分钟内开始使用。

## 第一步：配置 API Key 🔑

1. 访问 [SiliconFlow](https://siliconflow.cn) 注册账号并获取 API Key

2. 在项目根目录创建 `.env` 文件：

```bash
cp .env.example .env
```

3. 编辑 `.env` 文件，填入你的 API Key：

```bash
EXPO_PUBLIC_SILICONFLOW_API_KEY=sk-your-actual-api-key-here
```

## 第二步：测试连接 🧪

运行测试脚本验证配置是否正确：

```bash
node server/test-ai-service.js
```

如果看到 `✅ API 连接成功`，说明配置成功！

## 第三步：在你画我猜游戏中使用 🎨

打开 `app/draw-guess.tsx` 文件，添加以下代码：

```typescript
import { drawGuessWordService } from '@/services'

// 在你的组件中
function DrawGuessGame() {
  const [currentWord, setCurrentWord] = useState(null)
  const [loading, setLoading] = useState(false)

  // 生成新词语
  const generateNewWord = async () => {
    setLoading(true)
    try {
      const word = await drawGuessWordService.generateSingleWord({
        difficulty: 'medium',
        category: '随机',
      })
      setCurrentWord(word)
      console.log('生成的词语:', word)
    } catch (error) {
      console.error('生成失败:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View>
      <Button onPress={generateNewWord} disabled={loading}>
        {loading ? '生成中...' : '生成新词语'}
      </Button>

      {currentWord && (
        <View>
          <Text>词语: {currentWord.word}</Text>
          <Text>难度: {currentWord.difficulty}</Text>
          <Text>分类: {currentWord.category}</Text>

          {/* 显示提示 */}
          {currentWord.hints?.map((hint, index) => (
            <Text key={index}>提示 {index + 1}: {hint}</Text>
          ))}
        </View>
      )}
    </View>
  )
}
```

## 常用 API 📚

### 1. 生成多个词语

```typescript
const words = await drawGuessWordService.generateWords({
  difficulty: 'easy',    // 'easy' | 'medium' | 'hard'
  category: '动物',      // 见下方分类列表
  count: 5,             // 生成数量
  language: 'zh',       // 'zh' | 'en'
})
```

### 2. 生成单个词语

```typescript
const word = await drawGuessWordService.generateSingleWord({
  difficulty: 'medium',
  category: '食物',
})
```

### 3. 验证词语

```typescript
const result = drawGuessWordService.validateWord('猫')
if (result.valid) {
  console.log('词语有效')
} else {
  console.log('词语无效:', result.reason)
}
```

### 4. 获取可用分类

```typescript
const categories = drawGuessWordService.getAvailableCategories()
// ['随机', '动物', '食物', '物品', '自然', '建筑', '情感', ...]
```

## 词语分类列表 📂

- 随机（混合）
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

## 难度说明 🎯

- **简单 (easy)**: 日常常见物品，容易画也容易猜
- **中等 (medium)**: 需要一些思考和创意
- **困难 (hard)**: 需要较强的绘画技巧和想象力

## 错误处理 🛡️

AI 服务有完善的错误处理机制，即使 API 调用失败也会返回备用词语：

```typescript
try {
  const words = await drawGuessWordService.generateWords()
  // 优先使用 AI 生成的词语
} catch (error) {
  // 自动使用备用词语库，不会影响游戏体验
  console.log('使用备用词语')
}
```

## 高级用法 🚀

### 直接使用 AI 客户端

```typescript
import { aiClient, getGameSystemPrompt } from '@/services'

const systemPrompt = getGameSystemPrompt('draw-guess')
const response = await aiClient.simpleChat(
  systemPrompt,
  '生成 3 个适合情侣的浪漫词语'
)
```

### 批量生成并缓存

```typescript
// 游戏开始时批量生成
const allWords = await drawGuessWordService.generateWords({
  count: 20,
  difficulty: 'medium',
})

// 保存到状态中，游戏过程中使用
const [wordPool, setWordPool] = useState(allWords)
```

## 常见问题 ❓

### Q: API Key 从哪里获取？
A: 访问 [https://siliconflow.cn](https://siliconflow.cn) 注册账号后在控制台获取。

### Q: 生成词语需要多长时间？
A: 通常 1-3 秒。建议提前批量生成并缓存。

### Q: 如果网络失败怎么办？
A: 服务会自动使用内置的备用词语库，保证游戏正常运行。

### Q: 可以自定义词语主题吗？
A: 可以！使用 `category` 参数指定分类，或直接使用 AI 客户端发送自定义请求。

### Q: 如何调试？
A: 查看控制台日志，服务会输出关键信息：
- `✨ Generated N words` - 生成成功
- `❌ Failed to generate` - 生成失败
- `📝 Raw response` - AI 原始响应

## 下一步 🎯

- ✅ 在你画我猜游戏中集成 AI 词语生成
- 🔜 为其他游戏添加 AI 辅助功能
- 🔜 自定义游戏提示词
- 🔜 添加词语收藏功能

## 需要帮助？ 💬

查看完整文档：[server/README.md](./README.md)

示例代码：[server/examples.tsx](./examples.tsx)

---

Nya~! 祝你使用愉快！🐾
