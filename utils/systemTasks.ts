// 静态导入所有语言的任务文件
import normalZh from '@/assets/tasks/zh/normal.json'
import coupleZh from '@/assets/tasks/zh/couple.json'
import sweetZh from '@/assets/tasks/zh/sweet.json'
import advancedZh from '@/assets/tasks/zh/advanced.json'
import loveZh from '@/assets/tasks/zh/love.json'
import mixedZh from '@/assets/tasks/zh/mixed.json'
import intimateZh from '@/assets/tasks/zh/intimate.json'

import normalEn from '@/assets/tasks/en/normal.json'
import coupleEn from '@/assets/tasks/en/couple.json'
import sweetEn from '@/assets/tasks/en/sweet.json'
import advancedEn from '@/assets/tasks/en/advanced.json'
import loveEn from '@/assets/tasks/en/love.json'
import mixedEn from '@/assets/tasks/en/mixed.json'
import intimateEn from '@/assets/tasks/en/intimate.json'

import normalJa from '@/assets/tasks/ja/normal.json'
import coupleJa from '@/assets/tasks/ja/couple.json'
import sweetJa from '@/assets/tasks/ja/sweet.json'
import advancedJa from '@/assets/tasks/ja/advanced.json'
import loveJa from '@/assets/tasks/ja/love.json'
import mixedJa from '@/assets/tasks/ja/mixed.json'
import intimateJa from '@/assets/tasks/ja/intimate.json'
import i18n from '@/i18n'

export interface SystemTaskConfig {
  name: string
  description: string
  categoryId: string
  fileName: string // 对应的文件名
}

export type Language = 'zh' | 'en' | 'ja'

// 获取国际化的系统任务配置
export const getSystemTaskConfigs = (): SystemTaskConfig[] => [
  {
    name: i18n.t('systemTasks.normal.name', '经典模式'),
    description: i18n.t('systemTasks.normal.description', '适合情侣日常互动的经典任务'),
    categoryId: '1',
    fileName: 'normal',
  },
  {
    name: i18n.t('systemTasks.couple.name', '情侣专享'),
    description: i18n.t('systemTasks.couple.description', '增进感情的甜蜜任务'),
    categoryId: '2',
    fileName: 'couple',
  },
  {
    name: i18n.t('systemTasks.sweet.name', '甜蜜时光'),
    description: i18n.t('systemTasks.sweet.description', '温馨浪漫的甜蜜任务'),
    categoryId: '2',
    fileName: 'sweet',
  },
  {
    name: i18n.t('systemTasks.advanced.name', '恋爱进阶'),
    description: i18n.t('systemTasks.advanced.description', '深度互动的高级任务'),
    categoryId: '3',
    fileName: 'advanced',
  },
  {
    name: i18n.t('systemTasks.love.name', '浪漫氛围'),
    description: i18n.t('systemTasks.love.description', '营造浪漫氛围的任务'),
    categoryId: '2',
    fileName: 'love',
  },
  {
    name: i18n.t('systemTasks.mixed.name', '混合模式'),
    description: i18n.t('systemTasks.mixed.description', '多样化的混合任务'),
    categoryId: '3',
    fileName: 'mixed',
  },
  {
    name: i18n.t('systemTasks.intimate.name', '亲密互动'),
    description: i18n.t('systemTasks.intimate.description', '增进亲密关系的任务'),
    categoryId: '2',
    fileName: 'intimate',
  },
]

// 为了向后兼容，提供一个不依赖i18n的静态配置
const staticSystemTaskConfigs: SystemTaskConfig[] = [
  {
    name: '经典模式',
    description: '适合情侣日常互动的经典任务',
    categoryId: '1',
    fileName: 'normal',
  },
  {
    name: '情侣专享',
    description: '增进感情的甜蜜任务',
    categoryId: '2',
    fileName: 'couple',
  },
  {
    name: '甜蜜时光',
    description: '温馨浪漫的甜蜜任务',
    categoryId: '2',
    fileName: 'sweet',
  },
  {
    name: '恋爱进阶',
    description: '深度互动的高级任务',
    categoryId: '3',
    fileName: 'advanced',
  },
  {
    name: '浪漫氛围',
    description: '营造浪漫氛围的任务',
    categoryId: '2',
    fileName: 'love',
  },
  {
    name: '混合模式',
    description: '多样化的混合任务',
    categoryId: '3',
    fileName: 'mixed',
  },
  {
    name: '亲密互动',
    description: '增进亲密关系的任务',
    categoryId: '2',
    fileName: 'intimate',
  },
]

// 为了向后兼容，保留原有的导出（使用静态版本）
export const systemTaskConfigs = staticSystemTaskConfigs

// 任务文件映射
const taskFilesMap: Record<Language, Record<string, string[]>> = {
  zh: {
    normal: normalZh,
    couple: coupleZh,
    sweet: sweetZh,
    advanced: advancedZh,
    love: loveZh,
    mixed: mixedZh,
    intimate: intimateZh,
  },
  en: {
    normal: normalEn,
    couple: coupleEn,
    sweet: sweetEn,
    advanced: advancedEn,
    love: loveEn,
    mixed: mixedEn,
    intimate: intimateEn,
  },
  ja: {
    normal: normalJa,
    couple: coupleJa,
    sweet: sweetJa,
    advanced: advancedJa,
    love: loveJa,
    mixed: mixedJa,
    intimate: intimateJa,
  },
}

// 根据语言获取任务文件
export const loadTasksByLanguage = (language: Language): { [fileName: string]: string[] } => {
  return taskFilesMap[language] || taskFilesMap.zh
}

// 获取系统任务配置（带实际任务内容和动态国际化）
export const getSystemTasksForLanguage = (language: Language) => {
  const taskFiles = loadTasksByLanguage(language)

  // 获取动态国际化配置
  const dynamicConfigs = getSystemTaskConfigs()

  return dynamicConfigs
    .map((config) => ({
      ...config,
      tasks: taskFiles[config.fileName] || [],
    }))
    .filter((config) => config.tasks.length > 0) // 只返回有任务的配置
}
