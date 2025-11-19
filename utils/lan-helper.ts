/**
 * LAN Service 辅助工具
 * 统一处理 LAN 模式和在线模式的切换逻辑
 */

import { ConnectionType } from '@/types/online'
import { getLANService } from '@/sockets/lan'

/**
 * 根据连接类型执行不同的操作
 *
 * 统一处理 LAN 模式和在线模式的逻辑分支和错误处理
 *
 * @param connectionType - 当前连接类型
 * @param lanOperation - LAN 模式下要执行的操作
 * @param onlineOperation - 在线模式下要执行的操作
 * @param errorContext - 错误上下文信息，用于日志记录
 * @returns 操作的返回值
 *
 * @example
 * ```ts
 * const result = await withLANService(
 *   connectionType,
 *   (lanService) => lanService.startGame(data),
 *   () => socketService.startGame(data),
 *   '开始游戏'
 * )
 * ```
 */
export async function withLANService<T>(
  connectionType: ConnectionType,
  lanOperation: (lanService: any) => T | Promise<T>,
  onlineOperation: () => T | Promise<T>,
  errorContext: string = 'LAN操作',
): Promise<T> {
  if (connectionType === 'lan') {
    try {
      const lanService = getLANService()
      return await lanOperation(lanService)
    } catch (error) {
      console.error(`❌ [LAN] ${errorContext}失败:`, error)
      throw error
    }
  }
  return await onlineOperation()
}

/**
 * 同步版本的 withLANService
 *
 * 用于不需要异步操作的场景
 */
export function withLANServiceSync<T>(
  connectionType: ConnectionType,
  lanOperation: (lanService: any) => T,
  onlineOperation: () => T,
  errorContext: string = 'LAN操作',
): T {
  if (connectionType === 'lan') {
    try {
      const lanService = getLANService()
      return lanOperation(lanService)
    } catch (error) {
      console.error(`❌ [LAN] ${errorContext}失败:`, error)
      throw error
    }
  }
  return onlineOperation()
}

/**
 * 带数据转换的 LAN Service 包装器
 *
 * 用于需要转换数据格式的场景
 *
 * @param connectionType - 当前连接类型
 * @param data - 原始数据
 * @param dataTransformer - 数据转换函数（可选）
 * @param lanOperation - LAN 操作
 * @param onlineOperation - 在线操作
 * @param errorContext - 错误上下文
 */
export async function withLANServiceTransform<TInput, TOutput>(
  connectionType: ConnectionType,
  data: TInput,
  dataTransformer: ((data: TInput) => any) | undefined,
  lanOperation: (lanService: any, transformedData: any) => TOutput | Promise<TOutput>,
  onlineOperation: (data: TInput) => TOutput | Promise<TOutput>,
  errorContext: string = 'LAN操作',
): Promise<TOutput> {
  if (connectionType === 'lan') {
    try {
      const lanService = getLANService()
      const transformedData = dataTransformer
        ? dataTransformer(data)
        : { ...(data as any), type: errorContext.toLowerCase().replace(/\s+/g, '_') }

      console.log(`📤 [LAN] ${errorContext}:`, JSON.stringify(transformedData))
      return await lanOperation(lanService, transformedData)
    } catch (error) {
      console.error(`❌ [LAN] ${errorContext}失败:`, error)
      throw error
    }
  }
  return await onlineOperation(data)
}

/**
 * 事件监听包装器
 *
 * 统一处理 LAN 和在线模式的事件监听
 */
export function withEventListener(
  connectionType: ConnectionType,
  event: string,
  callback: Function,
  action: 'on' | 'off',
  onlineService: any,
): void {
  if (connectionType === 'lan') {
    try {
      const lanService = getLANService()
      lanService[action](event, callback)
    } catch (error) {
      console.warn(`⚠️ [LAN] 事件${action === 'on' ? '监听' : '移除'}失败:`, error)
    }
  } else {
    onlineService[action](event, callback)
  }
}
