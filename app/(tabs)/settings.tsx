import React, {useState} from 'react';
import {Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSettingsStore} from "@/store";
import {useTranslation} from 'react-i18next';
import {LanguageMode, ThemeMode} from '@/types/settings';
import {useColorScheme} from '@/hooks/use-color-scheme';
import {Colors} from '@/constants/theme';
import {useAudioManager} from '@/hooks/use-audio-manager';

const Settings: React.FC = () => {
    const insets = useSafeAreaInsets();
    const {themeMode, languageMode, soundSettings, setThemeMode, setLanguageMode, setSoundSettings} = useSettingsStore();
    const audioManager = useAudioManager();
    const {t, i18n} = useTranslation();
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [showThemeModal, setShowThemeModal] = useState(false);

    // 主题颜色
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme] as any;

    const backgroundColor = colors.settingsBackground;
    const cardBackground = colors.settingsCardBackground;
    const cardBorder = colors.settingsCardBorder;
    const textColor = colors.settingsText;
    const secondaryText = colors.settingsSecondaryText;
    const accentColor = colors.settingsAccent;
    const modalOverlay = colors.modalOverlay;
    const modalBg = colors.modalBackground;
    const modalSelected = colors.modalSelected;

    const getLanguageDisplay = (lang: LanguageMode) => {
        return t(`settings.language.config.${lang}`)
    };

    const getThemeDisplay = (theme: ThemeMode) => {
        return t(`settings.theme.config.${theme}`)
    };

    const handleLanguageChange = async (lang: LanguageMode) => {
        setLanguageMode(lang);
        await i18n.changeLanguage(lang);
        setShowLanguageModal(false);
    };

    const handleThemeChange = (theme: ThemeMode) => {
        setThemeMode(theme);
        setShowThemeModal(false);
        // 注意：在React Native中，Appearance.setColorScheme 主要用于监听系统主题变化
        // 实际的主题切换应该通过应用内的状态管理来实现
    };

    const handleAboutPress = (type: string) => {
        switch (type) {
            case 'version':
                const buildDate = `${new Date().getFullYear()}.${String(new Date().getMonth() + 1).padStart(2, '0')}.${String(new Date().getDate()).padStart(2, '0')}`;
                Alert.alert(
                    t('settings.version.alertTitle', '版本信息'),
                    t('settings.version.alertMessage', '版本：{{version}}\n构建：{{buildDate}}', {
                        version: '1.0.0',
                        buildDate
                    })
                );
                break;
            case 'privacy':
                Alert.alert(
                    t('settings.privacyPolicy.alertTitle', '隐私政策'),
                    t('settings.privacyPolicy.alertMessage', '我们重视您的隐私，所有数据均存储在本地，不会上传到服务器。')
                );
                break;
            case 'terms':
                Alert.alert(
                    t('settings.userAgreement.alertTitle', '用户协议'),
                    t('settings.userAgreement.alertMessage', '感谢使用我们的应用，请合理使用本应用的各项功能。')
                );
                break;
        }
    };


    const settingsSections = [
        {
            title: t('settings.sections.general', '通用'),
            items: [
                {
                    icon: 'language',
                    label: t("settings.language.label"),
                    value: getLanguageDisplay(languageMode),
                    onPress: () => setShowLanguageModal(true)
                },
                {
                    icon: 'moon',
                    label: t("settings.theme.label"),
                    value: getThemeDisplay(themeMode),
                    onPress: () => setShowThemeModal(true)
                },
            ]
        },
        {
            title: t('settings.sections.gameSettings', '游戏设置'),
            items: [
                {
                    icon: 'musical-notes',
                    label: t('settings.sound.label', '声音设置'),
                    value: soundSettings.globalMute ? t('settings.sound.disabled', '已关闭') : t('settings.sound.enabled', '已开启'),
                    onPress: () => {
                        setSoundSettings({ globalMute: !soundSettings.globalMute });
                    }
                },
                {
                    icon: 'volume-high',
                    label: t('settings.sound.bgm', '背景音乐'),
                    value: soundSettings.bgmEnabled ? t('settings.sound.enabled', '已开启') : t('settings.sound.disabled', '已关闭'),
                    onPress: () => {
                        setSoundSettings({ bgmEnabled: !soundSettings.bgmEnabled });
                    }
                },
            ]
        },
        {
            title: t('settings.sections.about', '关于'),
            items: [
                {
                    icon: 'information-circle',
                    label: t('settings.version.label', '版本信息'),
                    value: '1.0.0',
                    onPress: () => handleAboutPress('version')
                },
                {
                    icon: 'document-text',
                    label: t('settings.userAgreement.label', '用户协议'),
                    value: '',
                    onPress: () => handleAboutPress('terms')
                },
                {
                    icon: 'shield-checkmark',
                    label: t('settings.privacyPolicy.label', '隐私政策'),
                    value: '',
                    onPress: () => handleAboutPress('privacy')
                },
            ]
        }
    ];

    return (
        <View style={[styles.container, {backgroundColor}]}>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{paddingTop: insets.top + 20, paddingBottom: 100}}
                showsVerticalScrollIndicator={false}
            >
                <Text style={[styles.pageTitle, {color: textColor}]}>{t('settings.title')}</Text>
                {settingsSections.map((section, sectionIndex) => (
                    <View key={sectionIndex} style={styles.section}>
                        <Text style={[styles.sectionTitle, {color: secondaryText}]}>{section.title}</Text>
                        <View style={styles.sectionContent}>
                            <View style={[styles.blurCard, {backgroundColor: cardBackground, borderColor: cardBorder}]}>
                                {section.items.map((item, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.settingItem,
                                            index < section.items.length - 1 && styles.settingItemBorder
                                        ]}
                                        onPress={item.onPress}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.settingItemLeft}>
                                            <View style={[styles.iconContainer, {backgroundColor: `${accentColor}20`}]}>
                                                <Ionicons name={item.icon as any} size={22} color={accentColor}/>
                                            </View>
                                            <Text style={[styles.settingLabel, {color: textColor}]}>{item.label}</Text>
                                        </View>
                                        <View style={styles.settingItemRight}>
                                            <Text
                                                style={[styles.settingValue, {color: secondaryText}]}>{item.value}</Text>
                                            <Ionicons name="chevron-forward" size={20} color={secondaryText}/>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                ))}
            </ScrollView>

            {/* 语言选择模态框 */}
            <Modal
                visible={showLanguageModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowLanguageModal(false)}
            >
                <TouchableOpacity
                    style={[styles.modalOverlay, {backgroundColor: modalOverlay}]}
                    activeOpacity={1}
                    onPress={() => setShowLanguageModal(false)}
                >
                    <View style={[styles.modalContent, {backgroundColor: modalBg}]}>
                        <View style={styles.modalHeader}>
                            <Text
                                style={[styles.modalTitle, {color: textColor}]}>{t('settings.language.modalTitle', '选择语言')}</Text>
                            <TouchableOpacity
                                onPress={() => setShowLanguageModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <Ionicons name="close" size={24} color={secondaryText}/>
                            </TouchableOpacity>
                        </View>
                        {(['zh', 'en', 'ja'] as LanguageMode[]).map((lang) => (
                            <TouchableOpacity
                                key={lang}
                                style={[
                                    styles.modalOption,
                                    languageMode === lang && {backgroundColor: modalSelected}
                                ]}
                                onPress={() => handleLanguageChange(lang)}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.modalOptionText,
                                    {color: textColor},
                                    languageMode === lang && {color: accentColor, fontWeight: '600'}
                                ]}>
                                    {getLanguageDisplay(lang)}
                                </Text>
                                {languageMode === lang && (
                                    <Ionicons name="checkmark" size={20} color={accentColor}/>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* 主题选择模态框 */}
            <Modal
                visible={showThemeModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowThemeModal(false)}
            >
                <TouchableOpacity
                    style={[styles.modalOverlay, {backgroundColor: modalOverlay}]}
                    activeOpacity={1}
                    onPress={() => setShowThemeModal(false)}
                >
                    <View style={[styles.modalContent, {backgroundColor: modalBg}]}>
                        <View style={styles.modalHeader}>
                            <Text
                                style={[styles.modalTitle, {color: textColor}]}>{t('settings.theme.modalTitle', '选择主题')}</Text>
                            <TouchableOpacity
                                onPress={() => setShowThemeModal(false)}
                                style={styles.modalCloseButton}
                            >
                                <Ionicons name="close" size={24} color={secondaryText}/>
                            </TouchableOpacity>
                        </View>
                        {(['system', 'light', 'dark'] as ThemeMode[]).map((theme) => (
                            <TouchableOpacity
                                key={theme}
                                style={[
                                    styles.modalOption,
                                    themeMode === theme && {backgroundColor: modalSelected}
                                ]}
                                onPress={() => handleThemeChange(theme)}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.modalOptionText,
                                    {color: textColor},
                                    themeMode === theme && {color: accentColor, fontWeight: '600'}
                                ]}>
                                    {getThemeDisplay(theme)}
                                </Text>
                                {themeMode === theme && (
                                    <Ionicons name="checkmark" size={20} color={accentColor}/>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}
export default Settings;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 20,
    },
    pageTitle: {
        fontSize: 34,
        fontWeight: '700',
        marginBottom: 30,
        letterSpacing: -0.5,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 10,
        marginLeft: 16,
    },
    sectionContent: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    blurCard: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    settingItemBorder: {
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(60, 60, 67, 0.12)',
    },
    settingItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '400',
    },
    settingItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingValue: {
        fontSize: 15,
        marginRight: 8,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalContent: {
        borderRadius: 16,
        width: '100%',
        maxWidth: 320,
        paddingBottom: 20,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 10},
        shadowOpacity: 0.25,
        shadowRadius: 25,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    modalCloseButton: {
        padding: 4,
    },
    modalOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E5E5',
    },
    modalOptionText: {
        fontSize: 16,
    },
});