/**
 * AI Service Test Script
 * 测试 AI 服务是否正常工作
 *
 * 运行方式:
 * node server/test-ai-service.js
 */

// 注意：这个文件需要在设置好 .env 之后运行
require('dotenv').config()

const { aiClient, drawGuessWordService, getSupportedGameTypes } = require('./index')

async function runTests() {
  console.log('🧪 开始测试 AI 服务...\n')
  console.log('='.repeat(60))

  // 测试 1: API 连接测试
  console.log('\n📡 测试 1: API 连接')
  console.log('-'.repeat(60))
  try {
    const isConnected = await aiClient.testConnection()
    console.log(isConnected ? '✅ API 连接成功' : '❌ API 连接失败')
  } catch (error) {
    console.error('❌ 连接测试失败:', error.message)
  }

  // 测试 2: 支持的游戏类型
  console.log('\n🎮 测试 2: 支持的游戏类型')
  console.log('-'.repeat(60))
  const gameTypes = getSupportedGameTypes()
  console.log('支持的游戏:', gameTypes.join(', '))

  // 测试 3: 生成简单难度词语
  console.log('\n🎨 测试 3: 生成简单难度词语')
  console.log('-'.repeat(60))
  try {
    const easyWords = await drawGuessWordService.generateWords({
      difficulty: 'easy',
      count: 3,
    })
    console.log('✅ 生成成功:')
    easyWords.forEach((word, index) => {
      console.log(`  ${index + 1}. ${word.word} (${word.category}) - ${word.difficulty}`)
      console.log(`     提示: ${word.hints?.join(', ')}`)
    })
  } catch (error) {
    console.error('❌ 生成失败:', error.message)
  }

  // 测试 4: 生成困难难度词语
  console.log('\n🎨 测试 4: 生成困难难度词语')
  console.log('-'.repeat(60))
  try {
    const hardWords = await drawGuessWordService.generateWords({
      difficulty: 'hard',
      category: '情感',
      count: 2,
    })
    console.log('✅ 生成成功:')
    hardWords.forEach((word, index) => {
      console.log(`  ${index + 1}. ${word.word} (${word.category}) - ${word.difficulty}`)
      console.log(`     提示: ${word.hints?.join(', ')}`)
    })
  } catch (error) {
    console.error('❌ 生成失败:', error.message)
  }

  // 测试 5: 获取可用分类
  console.log('\n📂 测试 5: 获取可用分类')
  console.log('-'.repeat(60))
  const categories = drawGuessWordService.getAvailableCategories()
  console.log('可用分类:', categories.join(', '))

  // 测试 6: 词语验证
  console.log('\n✅ 测试 6: 词语验证')
  console.log('-'.repeat(60))
  const testWords = ['猫', '这是一个很长的词语不适合游戏', '123', '', '彩虹']
  testWords.forEach((word) => {
    const result = drawGuessWordService.validateWord(word)
    const status = result.valid ? '✅' : '❌'
    const reason = result.reason ? ` (${result.reason})` : ''
    console.log(`  ${status} "${word}"${reason}`)
  })

  console.log('\n' + '='.repeat(60))
  console.log('🎉 测试完成!\n')
}

// 运行测试
runTests().catch((error) => {
  console.error('❌ 测试运行失败:', error)
  process.exit(1)
})
