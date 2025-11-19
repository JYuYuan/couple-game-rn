import { aiClient } from './client'
import { getGameSystemPrompt } from './prompts'
import type { GeneratedWord, WordGenerationOptions } from '../types'

/**
 * Draw & Guess Word Generation Service
 * 你画我猜词语生成服务
 */
export class DrawGuessWordService {
  /**
   * 生成游戏词语
   * @param options - 生成选项
   * @returns 生成的词语列表
   */
  async generateWords(options: WordGenerationOptions = {}): Promise<GeneratedWord[]> {
    const {
      difficulty = 'medium',
      category = '随机',
      count = 5,
      language = 'zh',
    } = options

    const systemPrompt = getGameSystemPrompt('draw-guess')

    // 构建用户请求
    const userPrompt = this.buildUserPrompt({ difficulty, category, count, language })

    try {
      // 调用 AI 生成
      const response = await aiClient.simpleChat(systemPrompt, userPrompt, {
        temperature: 0.8, // 提高创意性
        max_tokens: 2000,
      })

      // 解析返回的 JSON
      const words = this.parseWordsResponse(response, { difficulty, category })

      console.log(`✨ Generated ${words.length} words for draw-guess game`)
      return words
    } catch (error) {
      console.error('❌ Failed to generate words:', error)
      // 返回备用词语
      return this.getFallbackWords({ difficulty, category, count })
    }
  }

  /**
   * 生成单个词语
   * @param options - 生成选项
   * @returns 生成的词语
   */
  async generateSingleWord(
    options: Omit<WordGenerationOptions, 'count'> = {}
  ): Promise<GeneratedWord> {
    const words = await this.generateWords({ ...options, count: 1 })
    return words[0] || this.getFallbackWords({ ...options, count: 1 })[0]
  }

  /**
   * 构建用户提示词
   */
  private buildUserPrompt(options: Required<WordGenerationOptions>): string {
    const { difficulty, category, count, language } = options

    // 多语言难度描述
    const difficultyDesc = {
      zh: {
        easy: '简单（日常常见物品，容易画也容易猜）',
        medium: '中等（需要一些思考和创意）',
        hard: '困难（需要较强的绘画技巧和想象力）',
      },
      en: {
        easy: 'Easy (common daily items, easy to draw and guess)',
        medium: 'Medium (requires some thinking and creativity)',
        hard: 'Hard (requires strong drawing skills and imagination)',
      },
      ja: {
        easy: '簡単（日常的によく見る物、描きやすく当てやすい）',
        medium: '普通（考えと創造力が必要）',
        hard: '難しい（高い描画スキルと想像力が必要）',
      },
    }

    // 多语言分类名称
    const categoryNames = {
      zh: {
        random: '随机',
        animal: '动物',
        food: '食物',
        item: '物品',
        nature: '自然',
        building: '建筑',
        emotion: '情感',
        sport: '运动',
        profession: '职业',
        transport: '交通',
        plant: '植物',
      },
      en: {
        random: 'Random',
        animal: 'Animal',
        food: 'Food',
        item: 'Item',
        nature: 'Nature',
        building: 'Building',
        emotion: 'Emotion',
        sport: 'Sport',
        profession: 'Profession',
        transport: 'Transport',
        plant: 'Plant',
      },
      ja: {
        random: 'ランダム',
        animal: '動物',
        food: '食べ物',
        item: '物品',
        nature: '自然',
        building: '建物',
        emotion: '感情',
        sport: 'スポーツ',
        profession: '職業',
        transport: '交通',
        plant: '植物',
      },
    }

    const langDifficulty = difficultyDesc[language] || difficultyDesc.zh
    const langCategories = categoryNames[language] || categoryNames.zh
    const categoryName =
      langCategories[category.toLowerCase() as keyof typeof langCategories] || category

    // 多语言提示词模板
    const prompts = {
      zh: `请生成 ${count} 个适合"你画我猜"游戏的词语。

要求：
- 难度：${langDifficulty[difficulty]}
- 分类：${category === '随机' || category === 'Random' || category === 'ランダム' ? '混合各种分类' : categoryName}
- 语言：中文

请返回 JSON 数组格式，每个词语包含：
- word: 词语本身
- difficulty: 难度级别（easy/medium/hard）
- category: 所属分类
- hints: 3个渐进式提示（从模糊到明确）

示例格式：
[
  {
    "word": "彩虹",
    "difficulty": "easy",
    "category": "自然",
    "hints": ["天空中的现象", "雨后常见", "七种颜色"]
  }
]

请只返回 JSON 数组，不要任何其他文字。`,
      en: `Please generate ${count} words suitable for the "Draw & Guess" game.

Requirements:
- Difficulty: ${langDifficulty[difficulty]}
- Category: ${category === '随机' || category === 'Random' || category === 'ランダム' ? 'Mix of various categories' : categoryName}
- Language: English

Please return JSON array format, each word should contain:
- word: The word itself
- difficulty: Difficulty level (easy/medium/hard)
- category: Category
- hints: 3 progressive hints (from vague to specific)

Example format:
[
  {
    "word": "Rainbow",
    "difficulty": "easy",
    "category": "Nature",
    "hints": ["Phenomenon in the sky", "Common after rain", "Seven colors"]
  }
]

Please return only the JSON array, no other text.`,
      ja: `「お絵描き伝言ゲーム」に適した ${count} 個の単語を生成してください。

要件：
- 難易度：${langDifficulty[difficulty]}
- カテゴリー：${category === '随机' || category === 'Random' || category === 'ランダム' ? '様々なカテゴリーのミックス' : categoryName}
- 言語：日本語

JSON配列形式で返してください。各単語には以下を含めてください：
- word: 単語自体
- difficulty: 難易度レベル（easy/medium/hard）
- category: カテゴリー
- hints: 3つの段階的なヒント（曖昧なものから具体的なものへ）

例の形式：
[
  {
    "word": "虹",
    "difficulty": "easy",
    "category": "自然",
    "hints": ["空の現象", "雨の後によく見られる", "七色"]
  }
]

JSON配列のみを返してください。他のテキストは不要です。`,
    }

    return prompts[language] || prompts.zh
  }

  /**
   * 解析 AI 返回的词语
   */
  private parseWordsResponse(
    response: string,
    options: Pick<WordGenerationOptions, 'difficulty' | 'category'>
  ): GeneratedWord[] {
    try {
      // 尝试提取 JSON 内容
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('No JSON array found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array')
      }

      // 验证和标准化数据
      return parsed.map((item) => ({
        word: item.word || '',
        difficulty: item.difficulty || options.difficulty || 'medium',
        category: item.category || options.category || '未分类',
        hints: Array.isArray(item.hints) ? item.hints : [],
      }))
    } catch (error) {
      console.error('❌ Failed to parse AI response:', error)
      console.log('📝 Raw response:', response)
      return []
    }
  }

  /**
   * 获取备用词语（当 AI 生成失败时使用）
   */
  private getFallbackWords(
    options: Pick<WordGenerationOptions, 'difficulty' | 'category' | 'count'>
  ): GeneratedWord[] {
    const { difficulty = 'medium', count = 5 } = options

    const fallbackWordsByDifficulty: Record<string, GeneratedWord[]> = {
      easy: [
        {
          word: '太阳',
          difficulty: 'easy',
          category: '自然',
          hints: ['天上的', '很热的', '白天才有'],
        },
        {
          word: '苹果',
          difficulty: 'easy',
          category: '食物',
          hints: ['水果', '红色的', '可以做派'],
        },
        {
          word: '猫',
          difficulty: 'easy',
          category: '动物',
          hints: ['宠物', '会喵喵叫', '喜欢抓老鼠'],
        },
        {
          word: '雨伞',
          difficulty: 'easy',
          category: '物品',
          hints: ['下雨用的', '可以撑开', '防水的'],
        },
        {
          word: '星星',
          difficulty: 'easy',
          category: '自然',
          hints: ['晚上看到的', '一闪一闪的', '在天上'],
        },
      ],
      medium: [
        {
          word: '彩虹',
          difficulty: 'medium',
          category: '自然',
          hints: ['雨后现象', '七种颜色', '弧形的'],
        },
        {
          word: '钢琴',
          difficulty: 'medium',
          category: '物品',
          hints: ['乐器', '黑白键', '很大很重'],
        },
        {
          word: '企鹅',
          difficulty: 'medium',
          category: '动物',
          hints: ['不会飞的鸟', '住在南极', '黑白色'],
        },
        {
          word: '火锅',
          difficulty: 'medium',
          category: '食物',
          hints: ['冬天吃的', '很烫', '一群人围着吃'],
        },
        {
          word: '摩天轮',
          difficulty: 'medium',
          category: '建筑',
          hints: ['游乐园里的', '圆形的', '会转动'],
        },
      ],
      hard: [
        {
          word: '时光隧道',
          difficulty: 'hard',
          category: '概念',
          hints: ['科幻概念', '和时间有关', '可以穿越'],
        },
        {
          word: '牵手',
          difficulty: 'hard',
          category: '情感',
          hints: ['情侣会做的', '手的动作', '表达亲密'],
        },
        {
          word: '回忆',
          difficulty: 'hard',
          category: '概念',
          hints: ['抽象的', '关于过去', '在脑海里'],
        },
        {
          word: '灯塔',
          difficulty: 'hard',
          category: '建筑',
          hints: ['海边的', '很高的', '指引方向'],
        },
        {
          word: '梦想',
          difficulty: 'hard',
          category: '概念',
          hints: ['抽象的', '每个人都有', '激励人的'],
        },
      ],
    }

    const words = fallbackWordsByDifficulty[difficulty] || fallbackWordsByDifficulty.medium

    // 随机打乱并返回指定数量
    const shuffled = [...words].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }

  /**
   * 获取所有可用的分类
   */
  getAvailableCategories(language: 'zh' | 'en' | 'ja' = 'zh'): string[] {
    const categories = {
      zh: ['随机', '动物', '食物', '物品', '自然', '建筑', '情感', '运动', '职业', '交通', '植物'],
      en: [
        'Random',
        'Animal',
        'Food',
        'Item',
        'Nature',
        'Building',
        'Emotion',
        'Sport',
        'Profession',
        'Transport',
        'Plant',
      ],
      ja: [
        'ランダム',
        '動物',
        '食べ物',
        '物品',
        '自然',
        '建物',
        '感情',
        'スポーツ',
        '職業',
        '交通',
        '植物',
      ],
    }

    return categories[language] || categories.zh
  }

  /**
   * 验证词语是否适合游戏
   */
  validateWord(
    word: string,
    language: 'zh' | 'en' | 'ja' = 'zh'
  ): { valid: boolean; reason?: string } {
    const errorMessages = {
      zh: {
        empty: '词语不能为空',
        tooLong: '词语太长，不适合游戏',
        noNumbers: '词语不应包含数字',
      },
      en: {
        empty: 'Word cannot be empty',
        tooLong: 'Word is too long for the game',
        noNumbers: 'Word should not contain numbers',
      },
      ja: {
        empty: '単語を空にすることはできません',
        tooLong: '単語が長すぎてゲームに適していません',
        noNumbers: '単語に数字を含めることはできません',
      },
    }

    const messages = errorMessages[language] || errorMessages.zh

    if (!word || word.trim().length === 0) {
      return { valid: false, reason: messages.empty }
    }

    if (word.length > 10) {
      return { valid: false, reason: messages.tooLong }
    }

    if (/[0-9]/.test(word)) {
      return { valid: false, reason: messages.noNumbers }
    }

    return { valid: true }
  }
}

// 导出默认实例
export const drawGuessWordService = new DrawGuessWordService()
