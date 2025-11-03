/**
 * 通用验证工具函数
 * 
 * 提供常用的验证方法，包括：
 * - 字符串验证
 * - 数字验证
 * - 房间代码验证
 * - 用户名验证
 * - 等等
 */

export interface ValidationResult {
  /** 是否验证通过 */
  isValid: boolean
  /** 错误消息 */
  message?: string
}

/**
 * 验证字符串是否为空或仅包含空白字符
 * 
 * @param value - 要验证的字符串
 * @param fieldName - 字段名称，用于错误消息
 * @returns 验证结果
 * 
 * @example
 * ```tsx
 * const result = validateRequired('', '用户名')
 * // { isValid: false, message: '用户名不能为空' }
 * ```
 */
export const validateRequired = (
  value: string | null | undefined,
  fieldName: string = '此字段'
): ValidationResult => {
  if (!value || value.trim().length === 0) {
    return {
      isValid: false,
      message: `${fieldName}不能为空`,
    }
  }
  return { isValid: true }
}

/**
 * 验证字符串长度
 * 
 * @param value - 要验证的字符串
 * @param minLength - 最小长度
 * @param maxLength - 最大长度
 * @param fieldName - 字段名称
 * @returns 验证结果
 */
export const validateLength = (
  value: string,
  minLength: number = 0,
  maxLength: number = Infinity,
  fieldName: string = '此字段'
): ValidationResult => {
  const length = value.trim().length
  
  if (length < minLength) {
    return {
      isValid: false,
      message: `${fieldName}长度不能少于${minLength}个字符`,
    }
  }
  
  if (length > maxLength) {
    return {
      isValid: false,
      message: `${fieldName}长度不能超过${maxLength}个字符`,
    }
  }
  
  return { isValid: true }
}

/**
 * 验证房间代码格式
 * 
 * @param roomCode - 房间代码
 * @returns 验证结果
 */
export const validateRoomCode = (roomCode: string): ValidationResult => {
  const requiredResult = validateRequired(roomCode, '房间代码')
  if (!requiredResult.isValid) {
    return requiredResult
  }
  
  const lengthResult = validateLength(roomCode, 4, 8, '房间代码')
  if (!lengthResult.isValid) {
    return lengthResult
  }
  
  // 房间代码只能包含字母和数字
  const codePattern = /^[A-Za-z0-9]+$/
  if (!codePattern.test(roomCode)) {
    return {
      isValid: false,
      message: '房间代码只能包含字母和数字',
    }
  }
  
  return { isValid: true }
}

/**
 * 验证用户名格式
 * 
 * @param username - 用户名
 * @returns 验证结果
 */
export const validateUsername = (username: string): ValidationResult => {
  const requiredResult = validateRequired(username, '用户名')
  if (!requiredResult.isValid) {
    return requiredResult
  }
  
  const lengthResult = validateLength(username, 2, 20, '用户名')
  if (!lengthResult.isValid) {
    return lengthResult
  }
  
  // 用户名不能包含特殊字符
  const usernamePattern = /^[A-Za-z0-9\u4e00-\u9fa5_-]+$/
  if (!usernamePattern.test(username)) {
    return {
      isValid: false,
      message: '用户名只能包含字母、数字、中文、下划线和连字符',
    }
  }
  
  return { isValid: true }
}

/**
 * 验证数字范围
 * 
 * @param value - 要验证的数字
 * @param min - 最小值
 * @param max - 最大值
 * @param fieldName - 字段名称
 * @returns 验证结果
 */
export const validateNumberRange = (
  value: number,
  min: number = -Infinity,
  max: number = Infinity,
  fieldName: string = '数值'
): ValidationResult => {
  if (isNaN(value)) {
    return {
      isValid: false,
      message: `${fieldName}必须是有效数字`,
    }
  }
  
  if (value < min) {
    return {
      isValid: false,
      message: `${fieldName}不能小于${min}`,
    }
  }
  
  if (value > max) {
    return {
      isValid: false,
      message: `${fieldName}不能大于${max}`,
    }
  }
  
  return { isValid: true }
}

/**
 * 验证邮箱格式
 * 
 * @param email - 邮箱地址
 * @returns 验证结果
 */
export const validateEmail = (email: string): ValidationResult => {
  const requiredResult = validateRequired(email, '邮箱地址')
  if (!requiredResult.isValid) {
    return requiredResult
  }
  
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailPattern.test(email)) {
    return {
      isValid: false,
      message: '请输入有效的邮箱地址',
    }
  }
  
  return { isValid: true }
}

/**
 * 验证URL格式
 * 
 * @param url - URL地址
 * @returns 验证结果
 */
export const validateUrl = (url: string): ValidationResult => {
  const requiredResult = validateRequired(url, 'URL地址')
  if (!requiredResult.isValid) {
    return requiredResult
  }
  
  try {
    new URL(url)
    return { isValid: true }
  } catch {
    return {
      isValid: false,
      message: '请输入有效的URL地址',
    }
  }
}

/**
 * 组合多个验证器
 * 
 * @param validators - 验证器数组
 * @returns 组合验证结果
 * 
 * @example
 * ```tsx
 * const result = combineValidators([
 *   () => validateRequired(username, '用户名'),
 *   () => validateLength(username, 2, 20, '用户名'),
 * ])
 * ```
 */
export const combineValidators = (
  validators: (() => ValidationResult)[]
): ValidationResult => {
  for (const validator of validators) {
    const result = validator()
    if (!result.isValid) {
      return result
    }
  }
  return { isValid: true }
}

/**
 * 创建表单验证器
 * 
 * @param fields - 字段验证配置
 * @returns 表单验证结果
 * 
 * @example
 * ```tsx
 * const result = validateForm({
 *   username: [
 *     () => validateRequired(formData.username, '用户名'),
 *     () => validateUsername(formData.username),
 *   ],
 *   roomCode: [
 *     () => validateRequired(formData.roomCode, '房间代码'),
 *     () => validateRoomCode(formData.roomCode),
 *   ],
 * })
 * ```
 */
export const validateForm = (
  fields: Record<string, (() => ValidationResult)[]>
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {}
  let isValid = true
  
  for (const [fieldName, validators] of Object.entries(fields)) {
    const result = combineValidators(validators)
    if (!result.isValid) {
      errors[fieldName] = result.message || '验证失败'
      isValid = false
    }
  }
  
  return { isValid, errors }
}