import { useCallback } from 'react'
import { showError as toastError, showSuccess as toastSuccess } from '@/utils/toast'

/**
 * 错误处理 Hook
 * 统一管理错误和成功消息的显示
 */
export function useErrorHandler() {
  const showError = useCallback(
    (title: string, message?: string, duration?: number, onPress?: () => void) => {
      toastError(title, message, duration, onPress)
    },
    [],
  )

  const showSuccess = useCallback(
    (title: string, message?: string, duration?: number, onPress?: () => void) => {
      toastSuccess(title, message, duration, onPress)
    },
    [],
  )

  const handleError = useCallback((message: string) => {
    toastError(message)
  }, [])

  const handleSuccess = useCallback((message: string) => {
    toastSuccess(message)
  }, [])

  const handleAsyncOperation = useCallback(
    async <T>(
      operation: () => Promise<T>,
      options?: {
        successMessage?: string
        errorMessage?: string
        onSuccess?: (result: T) => void
        onError?: (error: Error) => void
      },
    ): Promise<T | null> => {
      try {
        const result = await operation()

        if (options?.successMessage) {
          handleSuccess(options.successMessage)
        }

        if (options?.onSuccess) {
          options.onSuccess(result)
        }

        return result
      } catch (error) {
        const errorMessage =
          options?.errorMessage || (error instanceof Error ? error.message : '操作失败')

        handleError(errorMessage)

        if (options?.onError && error instanceof Error) {
          options.onError(error)
        }

        return null
      }
    },
    [handleError, handleSuccess],
  )

  return {
    showError,
    showSuccess,
    handleError,
    handleSuccess,
    handleAsyncOperation,
  }
}
