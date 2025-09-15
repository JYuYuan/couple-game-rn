import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

const languages = [
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
];

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const changeLanguage = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    setIsOpen(false);
  };

  return (
    <View className="relative z-50">
      <TouchableOpacity
        className="flex-row items-center px-3 py-2 bg-white/90 rounded-xl border border-black/10 shadow-sm"
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.7}
      >
        <Text className="text-base mr-1.5">{currentLanguage.flag}</Text>
        <Text className="text-sm font-medium text-gray-700 mr-1">{currentLanguage.name}</Text>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={16}
          color="#64748B"
        />
      </TouchableOpacity>

      {isOpen && (
        <View className="absolute top-full left-0 right-0 mt-1 bg-white/95 rounded-xl border border-black/10 shadow-lg overflow-hidden">
          {languages.map((language) => (
            <TouchableOpacity
              key={language.code}
              className={`flex-row items-center px-3 py-2.5 border-b border-black/5 ${
                language.code === i18n.language ? 'bg-blue-50' : ''
              }`}
              onPress={() => changeLanguage(language.code)}
              activeOpacity={0.7}
            >
              <Text className="text-base mr-1.5">{language.flag}</Text>
              <Text className={`text-sm font-medium ${
                language.code === i18n.language ? 'text-blue-600 font-semibold' : 'text-gray-700'
              }`}>
                {language.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}