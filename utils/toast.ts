import { ToastData, ToastType } from '@/components/Toast'

let toastRef: {
  showToast: (toast: Omit<ToastData, 'id'>) => void
  hideToast: (id: string) => void
} | null = null

export const setToastRef = (ref: typeof toastRef) => {
  toastRef = ref
}

// 全局Toast调用函数
export const toast = {
  success: (title: string, message?: string, duration?: number, onPress?: () => void) => {
    if (toastRef) {
      toastRef.showToast({
        type: 'success',
        title,
        message,
        duration,
        onPress,
      })
    } else {
      console.warn('Toast not initialized. Make sure ToastProvider is wrapped around your app.')
    }
  },

  error: (title: string, message?: string, duration?: number, onPress?: () => void) => {
    if (toastRef) {
      toastRef.showToast({
        type: 'error',
        title,
        message,
        duration,
        onPress,
      })
    } else {
      console.warn('Toast not initialized. Make sure ToastProvider is wrapped around your app.')
    }
  },

  info: (title: string, message?: string, duration?: number, onPress?: () => void) => {
    if (toastRef) {
      toastRef.showToast({
        type: 'info',
        title,
        message,
        duration,
        onPress,
      })
    } else {
      console.warn('Toast not initialized. Make sure ToastProvider is wrapped around your app.')
    }
  },

  show: (type: ToastType, title: string, message?: string, duration?: number, onPress?: () => void) => {
    if (toastRef) {
      toastRef.showToast({
        type,
        title,
        message,
        duration,
        onPress,
      })
    } else {
      console.warn('Toast not initialized. Make sure ToastProvider is wrapped around your app.')
    }
  },
}

// 便捷的别名
export const showToast = toast.show
export const showSuccess = toast.success
export const showError = toast.error
export const showInfo = toast.info

export default toast