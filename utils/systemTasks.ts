export interface SystemTaskConfig {
  name: string;
  description: string;
  categoryId: string;
  fileName: string; // 对应的文件名
}

export type Language = 'zh' | 'en' | 'ja';

// 任务配置定义（不包含具体任务内容）
export const systemTaskConfigs: SystemTaskConfig[] = [
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
];

// 静态导入所有语言的任务文件
import normalZh from '@/assets/tasks/zh/normal.json';
import coupleZh from '@/assets/tasks/zh/couple.json';
import sweetZh from '@/assets/tasks/zh/sweet.json';
import advancedZh from '@/assets/tasks/zh/advanced.json';
import loveZh from '@/assets/tasks/zh/love.json';
import mixedZh from '@/assets/tasks/zh/mixed.json';
import intimateZh from '@/assets/tasks/zh/intimate.json';

import normalEn from '@/assets/tasks/en/normal.json';
import coupleEn from '@/assets/tasks/en/couple.json';
import sweetEn from '@/assets/tasks/en/sweet.json';
import advancedEn from '@/assets/tasks/en/advanced.json';
import loveEn from '@/assets/tasks/en/love.json';
import mixedEn from '@/assets/tasks/en/mixed.json';
import intimateEn from '@/assets/tasks/en/intimate.json';

import normalJa from '@/assets/tasks/ja/normal.json';
import coupleJa from '@/assets/tasks/ja/couple.json';
import sweetJa from '@/assets/tasks/ja/sweet.json';
import advancedJa from '@/assets/tasks/ja/advanced.json';
import loveJa from '@/assets/tasks/ja/love.json';
import mixedJa from '@/assets/tasks/ja/mixed.json';
import intimateJa from '@/assets/tasks/ja/intimate.json';

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
};

// 根据语言获取任务文件
export const loadTasksByLanguage = (language: Language): {[fileName: string]: string[]} => {
  return taskFilesMap[language] || taskFilesMap.zh;
};

// 获取系统任务配置（带实际任务内容）
export const getSystemTasksForLanguage = (language: Language) => {
  const taskFiles = loadTasksByLanguage(language);

  return systemTaskConfigs.map(config => ({
    ...config,
    tasks: taskFiles[config.fileName] || [],
  })).filter(config => config.tasks.length > 0); // 只返回有任务的配置
};