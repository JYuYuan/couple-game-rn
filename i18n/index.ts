import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';

const resources = {
    en: {translation: en},
    zh: {translation: zh},
    ja: {translation: ja},
};

i18n
    .use(initReactI18next)
    .init({
        compatibilityJSON: 'v4',
        resources,
        lng: Localization.getLocales()[0]?.languageCode || 'zh',
        fallbackLng: 'zh',
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false,
        },
    });

export default i18n;