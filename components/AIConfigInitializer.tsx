import { useEffect } from 'react'
import { useAIConfig } from '@/hooks/useAIConfig'

/**
 * AI Configuration Initializer
 * 自动初始化 AI 配置的组件
 *
 * 使用方法：
 * 在 app/_layout.tsx 中引入并使用：
 * ```tsx
 * import { AIConfigInitializer } from '@/components/AIConfigInitializer'
 *
 * export default function RootLayout() {
 *   return (
 *     <>
 *       <AIConfigInitializer />
 *       <Stack>...</Stack>
 *     </>
 *   )
 * }
 * ```
 */
export function AIConfigInitializer() {
  const { aiSettings, isConfigured } = useAIConfig()

  useEffect(() => {
    if (aiSettings.enabled) {
      console.log('🤖 AI Configuration Status:', {
        enabled: aiSettings.enabled,
        configured: isConfigured,
        hasApiKey: !!aiSettings.apiKey,
        hasApiUrl: !!aiSettings.apiUrl,
        hasApiModel: !!aiSettings.apiModel,
      })
    }
  }, [aiSettings, isConfigured])

  // 这个组件不渲染任何 UI
  return null
}
