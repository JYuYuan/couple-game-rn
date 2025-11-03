/**
 * 通用组件导出文件
 * 
 * 统一导出所有可复用的基础组件，方便在项目中使用
 */

export { default as BaseModal, type BaseModalProps } from './BaseModal'
export { default as BaseButton, type BaseButtonProps, type ButtonVariant, type ButtonSize } from './BaseButton'
export { default as BaseCard, type BaseCardProps } from './BaseCard'

// 便捷的导入别名
export {
  BaseModal as Modal,
  BaseButton as Button,
  BaseCard as Card,
} from './index'