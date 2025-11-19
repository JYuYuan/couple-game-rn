import { useEffect, useState } from 'react'
import { useSettingsStore } from '@/store'
import { aiClient } from '@/server'

/**
 * AI 配置 Hook
 * 自动从设置读取配置并同步到 AI 客户端
 */
export function useAIConfig() {
  const { aiSettings, setAISettings } = useSettingsStore()
  const [isLoading, setIsLoading] = useState(false)

  // 同步配置到 AI 客户端
  useEffect(() => {
    if (aiSettings.enabled && aiSettings.apiKey) {
      // 应用配置
      aiClient.updateConfig(aiSettings.apiKey, aiSettings.apiUrl, aiSettings.apiModel)

      // 验证配置
      const config = aiClient.getConfig()
      console.log('🤖 AI Config applied:', {
        enabled: aiSettings.enabled,
        configured: aiClient.isConfigured(),
        ...config,
      })
    } else {
      console.log('⚠️  AI is disabled or not configured')
    }
  }, [aiSettings.enabled, aiSettings.apiKey, aiSettings.apiUrl, aiSettings.apiModel])

  // 测试连接
  const testConnection = async () => {
    if (!aiSettings.enabled) {
      return { success: false, message: 'AI 功能未启用' }
    }

    if (!aiSettings.apiKey) {
      return { success: false, message: 'API Key 未配置' }
    }

    setIsLoading(true)
    try {
      const success = await aiClient.testConnection()
      return {
        success,
        message: success ? 'AI 连接测试成功！' : 'AI 连接测试失败',
      }
    } catch (error) {
      return {
        success: false,
        message: `连接失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    aiSettings,
    setAISettings,
    isAIEnabled: aiSettings.enabled && aiClient.isConfigured(),
    isConfigured: aiClient.isConfigured(),
    isLoading,
    testConnection,
  }
}

/**
 * 初始化 AI 配置
 * 从 settings store 读取配置并应用到 AI 客户端
 * 可以在应用启动时调用
 */
export function initializeAIConfig() {
  // 这个函数需要在 React 组件外调用
  // 通常在 _layout.tsx 或 App.tsx 中使用
  console.log('🚀 Initializing AI configuration...')

  // 注意：这里需要直接访问 store，不能使用 hook
  // 具体实现需要根据 zustand store 的访问方式调整
  return {
    message: 'Use useAIConfig hook in components to initialize AI configuration',
  }
}
