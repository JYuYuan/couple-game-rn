/**
 * 统一日志管理系统
 *
 * 提供统一的日志格式、级别控制和上下文管理
 * 在开发环境自动启用，生产环境可配置
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LoggerConfig {
  /** 是否启用日志 */
  enabled: boolean
  /** 最小日志级别 */
  level: LogLevel
  /** 是否显示时间戳 */
  showTimestamp: boolean
  /** 是否显示文件位置 */
  showLocation: boolean
}

class Logger {
  private config: LoggerConfig = {
    enabled: __DEV__, // 开发环境默认启用
    level: __DEV__ ? 'debug' : 'info', // 开发环境显示所有日志
    showTimestamp: true,
    showLocation: false,
  }

  private readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  }

  private readonly levelEmoji: Record<LogLevel, string> = {
    debug: '🐛',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
  }

  /**
   * 更新日志配置
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 获取当前配置
   */
  getConfig(): LoggerConfig {
    return { ...this.config }
  }

  /**
   * 检查是否应该输出日志
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false
    return (
      this.levelPriority[level] >= this.levelPriority[this.config.level]
    )
  }

  /**
   * 格式化日志消息
   */
  private format(
    level: LogLevel,
    context: string,
    message: string,
    ...args: any[]
  ): any[] {
    const parts: string[] = []

    // 时间戳
    if (this.config.showTimestamp) {
      const now = new Date()
      const time = `${now.getHours().toString().padStart(2, '0')}:${now
        .getMinutes()
        .toString()
        .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now
        .getMilliseconds()
        .toString()
        .padStart(3, '0')}`
      parts.push(`[${time}]`)
    }

    // 级别标识
    parts.push(this.levelEmoji[level])

    // 上下文
    parts.push(`[${context}]`)

    // 消息
    parts.push(message)

    return [parts.join(' '), ...args]
  }

  /**
   * Debug 级别日志 - 用于详细的调试信息
   */
  debug(context: string, message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(...this.format('debug', context, message, ...args))
    }
  }

  /**
   * Info 级别日志 - 用于一般信息
   */
  info(context: string, message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(...this.format('info', context, message, ...args))
    }
  }

  /**
   * Warn 级别日志 - 用于警告信息
   */
  warn(context: string, message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(...this.format('warn', context, message, ...args))
    }
  }

  /**
   * Error 级别日志 - 用于错误信息
   */
  error(context: string, message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(...this.format('error', context, message, ...args))
    }
  }

  /**
   * 创建带上下文的日志器
   *
   * 用于在模块内部快速创建带固定上下文的日志器
   *
   * @example
   * ```ts
   * const log = logger.createContextLogger('SocketContext')
   * log.debug('连接建立')
   * log.error('连接失败', error)
   * ```
   */
  createContextLogger(context: string) {
    return {
      debug: (message: string, ...args: any[]) =>
        this.debug(context, message, ...args),
      info: (message: string, ...args: any[]) =>
        this.info(context, message, ...args),
      warn: (message: string, ...args: any[]) =>
        this.warn(context, message, ...args),
      error: (message: string, ...args: any[]) =>
        this.error(context, message, ...args),
    }
  }

  /**
   * 分组日志 - 用于输出分组信息
   */
  group(context: string, title: string, collapsed: boolean = false): void {
    if (!this.config.enabled) return
    const method = collapsed ? console.groupCollapsed : console.group
    method(`${this.levelEmoji.info} [${context}] ${title}`)
  }

  /**
   * 结束分组
   */
  groupEnd(): void {
    if (!this.config.enabled) return
    console.groupEnd()
  }

  /**
   * 性能计时开始
   */
  time(label: string): void {
    if (!this.config.enabled) return
    console.time(`⏱️ ${label}`)
  }

  /**
   * 性能计时结束
   */
  timeEnd(label: string): void {
    if (!this.config.enabled) return
    console.timeEnd(`⏱️ ${label}`)
  }

  /**
   * 输出表格
   */
  table(context: string, data: any): void {
    if (!this.config.enabled) return
    this.info(context, 'Table data:')
    console.table(data)
  }

  /**
   * 输出对象详情
   */
  dir(context: string, label: string, obj: any): void {
    if (!this.config.enabled) return
    this.info(context, label)
    console.dir(obj, { depth: null })
  }

  /**
   * 断言 - 条件为 false 时输出错误
   */
  assert(
    condition: boolean,
    context: string,
    message: string,
    ...args: any[]
  ): void {
    if (!this.config.enabled) return
    if (!condition) {
      this.error(context, `Assertion failed: ${message}`, ...args)
    }
  }
}

/**
 * 全局日志器实例
 */
export const logger = new Logger()

/**
 * 常用的上下文日志器
 */
export const contextLoggers = {
  socket: logger.createContextLogger('SocketContext'),
  lan: logger.createContextLogger('LANService'),
  game: logger.createContextLogger('GameManager'),
  ui: logger.createContextLogger('UI'),
  network: logger.createContextLogger('Network'),
  storage: logger.createContextLogger('Storage'),
}

/**
 * 类型导出
 */
export type { LogLevel, LoggerConfig }
