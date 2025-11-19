/**
 * AI Service Usage Examples
 * AI 服务使用示例
 */

import {
  aiClient,
  drawGuessWordService,
  getGameSystemPrompt,
  type WordGenerationOptions,
} from '@/services'

// React 需要导入
import React from 'react'
import { View, Button, Text } from 'react-native'

/**
 * 示例 1: 生成你画我猜的词语
 */
export async function example1_generateDrawGuessWords() {
  console.log('🎨 示例 1: 生成你画我猜词语\n')

  // 基础用法 - 生成 5 个中等难度的词语
  const words1 = await drawGuessWordService.generateWords()
  console.log('生成的词语:', words1)

  // 自定义选项 - 生成简单难度的动物类词语
  const options: WordGenerationOptions = {
    difficulty: 'easy',
    category: '动物',
    count: 3,
    language: 'zh',
  }
  const words2 = await drawGuessWordService.generateWords(options)
  console.log('\n动物类词语:', words2)

  // 生成单个词语
  const singleWord = await drawGuessWordService.generateSingleWord({
    difficulty: 'hard',
    category: '情感',
  })
  console.log('\n单个困难词语:', singleWord)
}

/**
 * 示例 2: 直接使用 AI 客户端
 */
export async function example2_useAIClient() {
  console.log('🤖 示例 2: 使用 AI 客户端\n')

  // 简单对话
  const systemPrompt = getGameSystemPrompt('draw-guess')
  const response = await aiClient.simpleChat(systemPrompt, '给我一个适合画的词语，主题是"浪漫"')
  console.log('AI 回复:', response)

  // 完整对话（包含多轮）
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: '生成一个词语' },
  ]

  const fullResponse = await aiClient.chat(messages, {
    temperature: 0.7,
    max_tokens: 500,
  })

  console.log('\n完整回复:', fullResponse)
}

/**
 * 示例 3: 在 React Native 组件中使用
 */
export function ExampleComponent() {
  const [words, setWords] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)

  const generateWords = async () => {
    setLoading(true)
    try {
      const newWords = await drawGuessWordService.generateWords({
        difficulty: 'medium',
        count: 5,
      })
      setWords(newWords)
      console.log('✨ 生成成功:', newWords)
    } catch (error) {
      console.error('❌ 生成失败:', error)
      // 这里会自动使用备用词语
    } finally {
      setLoading(false)
    }
  }

  return (
    <View>
      <Button onPress={generateWords} disabled={loading}>
        {loading ? '生成中...' : '生成词语'}
      </Button>

      {words.map((word, index) => (
        <View key={index}>
          <Text>
            {word.word} - {word.difficulty} - {word.category}
          </Text>
          <Text>提示: {word.hints?.join(', ')}</Text>
        </View>
      ))}
    </View>
  )
}

/**
 * 示例 4: 测试 API 连接
 */
export async function example4_testConnection() {
  console.log('🔌 示例 4: 测试 API 连接\n')

  const isConnected = await aiClient.testConnection()
  console.log('连接状态:', isConnected ? '✅ 成功' : '❌ 失败')
}

/**
 * 示例 5: 验证词语
 */
export function example5_validateWords() {
  console.log('✅ 示例 5: 验证词语\n')

  const testWords = ['猫', '这是一个很长的词语不适合游戏', '123', '']

  testWords.forEach((word) => {
    const result = drawGuessWordService.validateWord(word)
    console.log(`"${word}":`, result.valid ? '✅ 有效' : `❌ 无效 - ${result.reason}`)
  })
}

/**
 * 示例 6: 获取可用分类
 */
export function example6_getCategories() {
  console.log('📂 示例 6: 获取可用分类\n')

  const categories = drawGuessWordService.getAvailableCategories()
  console.log('可用分类:', categories)
}

// 导出所有示例
export const examples = {
  example1_generateDrawGuessWords,
  example2_useAIClient,
  example4_testConnection,
  example5_validateWords,
  example6_getCategories,
}
