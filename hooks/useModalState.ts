/**
 * Modal 状态管理 Hook
 *
 * 统一管理 Modal 组件的常见状态，消除重复代码
 */

import { useCallback, useState } from 'react'

/**
 * Modal 状态返回值
 */
export interface ModalState {
  /** 任务/操作是否完成（null = 未开始，true = 完成，false = 失败） */
  isCompleted: boolean | null
  /** 是否显示结果 */
  showResult: boolean
  /** 是否正在处理中 */
  isProcessing: boolean
  /** 是否有错误 */
  hasError: boolean
  /** 错误消息 */
  errorMessage: string

  // 状态设置函数
  setIsCompleted: (value: boolean | null) => void
  setShowResult: (value: boolean) => void
  setIsProcessing: (value: boolean) => void
  setHasError: (value: boolean) => void
  setErrorMessage: (value: string) => void

  // 便捷操作函数
  reset: () => void
  markCompleted: () => void
  markFailed: (errorMsg?: string) => void
  startProcessing: () => void
  finishProcessing: () => void
}

/**
 * useModalState Hook
 *
 * 提供统一的 Modal 状态管理，包含完成状态、结果显示、处理状态和错误处理
 *
 * @example
 * ```tsx
 * function MyModal({ visible, onClose }) {
 *   const modalState = useModalState()
 *
 *   useEffect(() => {
 *     if (visible) {
 *       modalState.reset()
 *     }
 *   }, [visible])
 *
 *   const handleComplete = async () => {
 *     modalState.startProcessing()
 *     try {
 *       await doSomething()
 *       modalState.markCompleted()
 *     } catch (error) {
 *       modalState.markFailed(error.message)
 *     }
 *   }
 *
 *   return (
 *     <Modal>
 *       {modalState.isProcessing && <LoadingSpinner />}
 *       {modalState.hasError && <ErrorMessage text={modalState.errorMessage} />}
 *     </Modal>
 *   )
 * }
 * ```
 */
export function useModalState(): ModalState {
  const [isCompleted, setIsCompleted] = useState<boolean | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')

  /**
   * 重置所有状态到初始值
   */
  const reset = useCallback(() => {
    setIsCompleted(null)
    setShowResult(false)
    setIsProcessing(false)
    setHasError(false)
    setErrorMessage('')
  }, [])

  /**
   * 标记为完成
   */
  const markCompleted = useCallback(() => {
    setIsCompleted(true)
    setShowResult(true)
    setIsProcessing(false)
    setHasError(false)
    setErrorMessage('')
  }, [])

  /**
   * 标记为失败
   * @param errorMsg - 错误消息（可选）
   */
  const markFailed = useCallback((errorMsg: string = '') => {
    setIsCompleted(false)
    setShowResult(true)
    setIsProcessing(false)
    setHasError(true)
    setErrorMessage(errorMsg)
  }, [])

  /**
   * 开始处理（显示加载状态）
   */
  const startProcessing = useCallback(() => {
    setIsProcessing(true)
    setHasError(false)
    setErrorMessage('')
  }, [])

  /**
   * 完成处理（隐藏加载状态）
   */
  const finishProcessing = useCallback(() => {
    setIsProcessing(false)
  }, [])

  return {
    // 状态
    isCompleted,
    showResult,
    isProcessing,
    hasError,
    errorMessage,

    // 状态设置函数
    setIsCompleted,
    setShowResult,
    setIsProcessing,
    setHasError,
    setErrorMessage,

    // 便捷操作函数
    reset,
    markCompleted,
    markFailed,
    startProcessing,
    finishProcessing,
  }
}

/**
 * useModalResultState Hook (简化版)
 *
 * 仅包含完成状态和结果显示，用于简单的 Modal 场景
 *
 * @example
 * ```tsx
 * function SimpleModal({ visible, task, onComplete }) {
 *   const { isCompleted, showResult, reset, handleChoice } = useModalResultState()
 *
 *   useEffect(() => {
 *     if (visible) reset()
 *   }, [visible])
 *
 *   return (
 *     <Modal>
 *       {!showResult ? (
 *         <>
 *           <Button onPress={() => handleChoice(true, onComplete)}>完成</Button>
 *           <Button onPress={() => handleChoice(false, onComplete)}>失败</Button>
 *         </>
 *       ) : (
 *         <ResultDisplay success={isCompleted} />
 *       )}
 *     </Modal>
 *   )
 * }
 * ```
 */
export function useModalResultState() {
  const [isCompleted, setIsCompleted] = useState<boolean | null>(null)
  const [showResult, setShowResult] = useState(false)

  const reset = useCallback(() => {
    setIsCompleted(null)
    setShowResult(false)
  }, [])

  /**
   * 处理用户选择并延迟执行回调
   * @param completed - 是否完成
   * @param onComplete - 完成回调
   * @param delay - 延迟时间（毫秒），默认1500ms
   */
  const handleChoice = useCallback(
    (completed: boolean, onComplete: (completed: boolean) => void, delay: number = 1500) => {
      setIsCompleted(completed)
      setShowResult(true)

      // 延迟执行回调，让用户看到结果
      setTimeout(() => {
        onComplete(completed)
      }, delay)
    },
    []
  )

  return {
    isCompleted,
    showResult,
    setIsCompleted,
    setShowResult,
    reset,
    handleChoice,
  }
}
