import { aiClient } from './client'

/**
 * 生成的任务选项
 */
export interface TaskGenerationOptions {
  /** 任务集名称 */
  name: string
  /** 任务集描述 */
  description: string
  /** 生成数量，默认50 */
  count?: number
  /** 语言，默认中文 */
  language?: 'zh' | 'en' | 'ja'
  /** 难度级别 */
  difficulty?: 'easy' | 'normal' | 'hard' | 'extreme'
}

/**
 * Game Mode Task Generation Service
 * 游戏模式任务生成服务
 */
export class GameModeTaskService {
  /**
   * 生成任务列表
   * @param options - 生成选项
   * @returns 生成的任务列表（字符串数组）
   */
  async generateTasks(options: TaskGenerationOptions): Promise<string[]> {
    const { name, description, count = 50, language = 'zh', difficulty = 'normal' } = options

    // 如果没有配置 AI，返回空数组
    if (!aiClient.isConfigured()) {
      console.log('⚠️ AI not configured, skipping task generation')
      return []
    }

    // 获取系统提示词 - 根据描述和语言动态生成
    const systemPrompt = this.buildSystemPrompt(description, language)

    // 构建用户请求
    const userPrompt = this.buildUserPrompt({
      name,
      description,
      count,
      language,
      difficulty,
    })

    try {
      console.log(`🤖 Generating ${count} tasks for "${name}"...`)

      // 调用 AI 生成
      const response = await aiClient.simpleChat(systemPrompt, userPrompt, {
        temperature: 0.9, // 提高创意性和多样性
        max_tokens: 4000,
      })

      // 解析返回的任务列表
      const tasks = this.parseTasksResponse(response)

      // 去重
      const uniqueTasks = [...new Set(tasks)]

      console.log(`✨ Generated ${uniqueTasks.length} unique tasks`)

      // 如果生成的任务数量不够，返回所有生成的任务
      if (uniqueTasks.length < count) {
        console.log(
          `⚠️ Generated only ${uniqueTasks.length} tasks (requested ${count}), returning all`,
        )
      }

      return uniqueTasks.slice(0, count)
    } catch (error) {
      console.error('❌ Failed to generate tasks:', error)
      return []
    }
  }

  /**
   * 构建系统提示词 - 根据游戏描述动态生成
   */
  private buildSystemPrompt(description: string, language: 'zh' | 'en' | 'ja' = 'zh'): string {
    // 根据描述判断游戏类型
    const isCoupleGame =
      description.includes('情侣') ||
      description.includes('恋人') ||
      description.includes('couple') ||
      description.includes('romantic') ||
      description.includes('カップル') ||
      description.includes('恋人')

    const isPartyGame =
      description.includes('聚会') ||
      description.includes('派对') ||
      description.includes('party') ||
      description.includes('朋友') ||
      description.includes('パーティー') ||
      description.includes('友達')

    const isFamilyGame =
      description.includes('家庭') ||
      description.includes('亲子') ||
      description.includes('family') ||
      description.includes('父母') ||
      description.includes('家族') ||
      description.includes('親子')

    // 根据不同类型和语言生成不同的系统提示词
    const gameContexts = {
      zh: {
        couple: '情侣互动',
        party: '聚会派对',
        family: '家庭亲子',
        general: '互动娱乐',
      },
      en: {
        couple: 'Couple Interaction',
        party: 'Party Games',
        family: 'Family Fun',
        general: 'Interactive Entertainment',
      },
      ja: {
        couple: 'カップル向けゲーム',
        party: 'パーティーゲーム',
        family: '家族向けゲーム',
        general: 'インタラクティブエンターテイメント',
      },
    }

    const contexts = gameContexts[language] || gameContexts.zh
    let gameContext = contexts.general
    if (isCoupleGame) gameContext = contexts.couple
    else if (isPartyGame) gameContext = contexts.party
    else if (isFamilyGame) gameContext = contexts.family

    // 多语言系统提示词模板
    const systemPrompts = {
      zh: `你是一个专业的${gameContext}游戏任务设计师。你的任务是根据给定的游戏模式名称和描述，创造有趣、多样化且符合主题的游戏任务。

设计原则：
1. 任务要有趣、创意、多样化
2. 任务要符合给定的主题和难度
3. 任务要清晰明确，易于理解和执行
4. 每个任务都应该是独特的，避免重复
5. 任务可以包含奖励类任务（用 [奖励] 或 [Reward] 标记）
6. 任务应该促进玩家之间的互动和情感交流
7. 任务应该适合游戏描述中提到的场景和对象

游戏描述：${description}

请根据以上描述，设计符合场景特点的任务。

输出格式：
- 返回纯 JSON 数组格式
- 每个元素都是字符串
- 不要添加任何额外的说明文字
- 确保所有任务都是唯一的，没有重复`,

      en: `You are a professional ${gameContext} game task designer. Your task is to create fun, diverse, and theme-appropriate game tasks based on the given game mode name and description.

Design Principles:
1. Tasks should be fun, creative, and diverse
2. Tasks should match the given theme and difficulty
3. Tasks should be clear and easy to understand and execute
4. Each task should be unique, avoid repetition
5. Tasks can include reward tasks (marked with [Reward] or [奖励])
6. Tasks should promote interaction and emotional connection between players
7. Tasks should be appropriate for the scenarios and participants mentioned in the game description

Game Description: ${description}

Please design tasks that match the scenario characteristics described above.

Output Format:
- Return pure JSON array format
- Each element is a string
- Do not add any additional explanatory text
- Ensure all tasks are unique, no duplicates`,

      ja: `あなたは専門の${gameContext}タスクデザイナーです。与えられたゲームモードの名前と説明に基づいて、面白く、多様で、テーマに適したゲームタスクを作成してください。

デザイン原則：
1. タスクは面白く、創造的で、多様であること
2. タスクは与えられたテーマと難易度に合致すること
3. タスクは明確で理解しやすく、実行しやすいこと
4. 各タスクはユニークで、重複を避けること
5. タスクには報酬タスク（[奖励] または [Reward] でマーク）を含めることができる
6. タスクはプレイヤー間の交流と感情的なつながりを促進すること
7. タスクはゲーム説明で言及されているシナリオや参加者に適していること

ゲーム説明：${description}

上記の説明に基づいて、シナリオの特徴に合ったタスクを設計してください。

出力形式：
- 純粋なJSON配列形式で返す
- 各要素は文字列
- 追加の説明テキストを追加しないこと
- すべてのタスクがユニークで、重複がないことを確認すること`,
    }

    return systemPrompts[language] || systemPrompts.zh
  }

  /**
   * 构建用户提示词
   */
  private buildUserPrompt(options: Required<TaskGenerationOptions>): string {
    const { name, description, count, language, difficulty } = options

    // 多语言难度描述
    const difficultyDescriptions = {
      zh: {
        easy: '简单（轻松愉快的互动）',
        normal: '普通（有趣的互动挑战）',
        hard: '困难（需要勇气的挑战）',
        extreme: '极限（大胆刺激的挑战）',
      },
      en: {
        easy: 'Easy (relaxed and fun interactions)',
        normal: 'Normal (interesting interactive challenges)',
        hard: 'Hard (challenges requiring courage)',
        extreme: 'Extreme (bold and exciting challenges)',
      },
      ja: {
        easy: '簡単（気軽で楽しいインタラクション）',
        normal: '普通（面白いインタラクションチャレンジ）',
        hard: '難しい（勇気が必要なチャレンジ）',
        extreme: '極限（大胆で刺激的なチャレンジ）',
      },
    }

    const difficultyDesc =
      difficultyDescriptions[language]?.[difficulty] || difficultyDescriptions.zh[difficulty]

    // 多语言用户提示词模板
    const userPrompts = {
      zh: `请为以下游戏模式生成 ${count} 个任务：

游戏模式名称：${name}
游戏模式描述：${description}
难度级别：${difficultyDesc}
语言：中文

要求：
1. 生成 ${count} 个独特的任务，确保没有重复
2. 任务要符合"${name}"这个主题
3. 参考描述内容：${description}
4. 任务难度应该符合 ${difficultyDesc} 的定位
5. 可以包含一些奖励类任务（用 [奖励] 或 [Reward] 标记）
6. 任务应该多样化，涵盖不同类型的互动方式

请只返回 JSON 数组格式，每个元素是一个任务字符串。不要添加任何其他文字说明。

示例格式：
[
  "亲吻对方的额头",
  "讲一个关于对方的甜蜜故事",
  "[奖励] 获得一个拥抱",
  "模仿对方最喜欢的动作"
]

现在请生成 ${count} 个任务：`,

      en: `Please generate ${count} tasks for the following game mode:

Game Mode Name: ${name}
Game Mode Description: ${description}
Difficulty Level: ${difficultyDesc}
Language: English

Requirements:
1. Generate ${count} unique tasks, ensure no duplicates
2. Tasks should match the "${name}" theme
3. Reference description content: ${description}
4. Task difficulty should match the ${difficultyDesc} positioning
5. Can include some reward tasks (marked with [Reward] or [奖励])
6. Tasks should be diverse, covering different types of interactions

Please return only JSON array format, each element is a task string. Do not add any other explanatory text.

Example format:
[
  "Kiss your partner's forehead",
  "Tell a sweet story about your partner",
  "[Reward] Get a hug",
  "Imitate your partner's favorite gesture"
]

Now please generate ${count} tasks:`,

      ja: `以下のゲームモード用に ${count} 個のタスクを生成してください：

ゲームモード名：${name}
ゲームモード説明：${description}
難易度レベル：${difficultyDesc}
言語：日本語

要件：
1. ${count} 個のユニークなタスクを生成し、重複がないことを確認する
2. タスクは「${name}」というテーマに合致すること
3. 説明内容を参考にする：${description}
4. タスクの難易度は ${difficultyDesc} の位置付けに合致すること
5. 報酬タスク（[奖励] または [Reward] でマーク）を含めることができる
6. タスクは多様で、異なるタイプのインタラクションをカバーすること

JSON配列形式のみを返してください。各要素はタスク文字列です。他の説明テキストを追加しないでください。

例の形式：
[
  "パートナーの額にキスする",
  "パートナーについての甘い話をする",
  "[Reward] ハグをもらう",
  "パートナーのお気に入りのジェスチャーを真似する"
]

それでは ${count} 個のタスクを生成してください：`,
    }

    return userPrompts[language] || userPrompts.zh
  }

  /**
   * 解析 AI 返回的任务列表
   */
  private parseTasksResponse(response: string): string[] {
    try {
      // 尝试提取 JSON 数组内容
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        console.error('❌ No JSON array found in response')
        console.log('📝 Raw response:', response.substring(0, 500))
        return []
      }

      const parsed = JSON.parse(jsonMatch[0])

      if (!Array.isArray(parsed)) {
        console.error('❌ Response is not an array')
        return []
      }

      // 过滤并返回有效的字符串任务
      return parsed.filter((item) => typeof item === 'string' && item.trim().length > 0)
    } catch (error) {
      console.error('❌ Failed to parse AI response:', error)
      console.log('📝 Raw response:', response.substring(0, 500))
      return []
    }
  }

  /**
   * 验证任务是否有效
   */
  validateTask(task: string): { valid: boolean; reason?: string } {
    if (!task || task.trim().length === 0) {
      return { valid: false, reason: '任务不能为空' }
    }

    if (task.length > 200) {
      return { valid: false, reason: '任务太长，建议在200字以内' }
    }

    return { valid: true }
  }
}

// 导出默认实例
export const gameModeTaskService = new GameModeTaskService()
