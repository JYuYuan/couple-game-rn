import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import * as Localization from 'expo-localization';
import {getStorage} from '@/utils/storage';

import en from './locales/en.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';

const resources = {
    en: {translation: en},
    zh: {translation: zh},
    ja: {translation: ja},
};

// 异步获取保存的语言设置
const getInitialLanguage = async () => {
    try {
        const storage = getStorage();
        const settingsData = await storage.getItem('settings-storage');

        if (settingsData) {
            const settings = JSON.parse(settingsData);
            const savedLanguage = settings.state?.languageMode;

            if (savedLanguage && ['zh', 'en', 'ja'].includes(savedLanguage)) {
                return savedLanguage;
            }
        }
    } catch (error) {
        console.warn('Failed to load saved language setting:', error);
    }

    // 回退到设备语言或默认中文
    return Localization.getLocales()[0]?.languageCode || 'zh';
};

// 初始化 i18n
const initializeI18n = async () => {
    const initialLanguage = await getInitialLanguage();

    await i18n
        .use(initReactI18next)
        .init({
            compatibilityJSON: 'v4',
            resources,
            lng: initialLanguage,
            fallbackLng: 'zh',
            interpolation: {
                escapeValue: false,
            },
            react: {
                useSuspense: false,
            },
        });
};

// 变更语言的辅助函数
export const changeLanguage = (language: string) => {
    if (['zh', 'en', 'ja'].includes(language)) {
        i18n.changeLanguage(language);
    }
};

// 立即初始化
initializeI18n();

export default i18n;