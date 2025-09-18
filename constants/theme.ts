/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,

    // 设置页面颜色
    settingsBackground: '#F2F2F7',
    settingsCardBackground: 'rgba(255, 255, 255, 0.6)',
    settingsCardBorder: 'rgba(255, 255, 255, 0.3)',
    settingsText: '#1C1C1E',
    settingsSecondaryText: '#8E8E93',
    settingsBorder: 'rgba(60, 60, 67, 0.12)',
    settingsAccent: '#5E5CE6',
    modalOverlay: 'rgba(0, 0, 0, 0.5)',
    modalBackground: '#FFF',
    modalSelected: '#F5F5FF',

    // 标签栏颜色
    tabBarBackground: 'rgba(255, 255, 255, 0.85)',
    tabBarBorder: 'rgba(255, 255, 255, 0.8)',
    tabBarTint: 'light',
    tabBarIconActive: '#007AFF',
    tabBarIconInactive: '#8E8E93',
    tabBarIndicatorBackground: 'rgba(255, 255, 255, 0.6)',
    tabBarIndicatorBorder: 'rgba(255, 255, 255, 0.8)',

    // 首页颜色
    homeBackground: '#F2F2F7',
    homeGradientStart: '#F2F2F7',
    homeGradientMiddle: '#E5E5EA',
    homeGradientEnd: '#F2F2F7',
    homeTitle: '#1C1C1E',
    homeSubtitle: '#8E8E93',
    homeCardBackground: 'rgba(255, 255, 255, 0.95)',
    homeCardBorder:  '#8E8E93',
    homeCardTitle: '#1C1C1E',
    homeCardDescription: '#8E8E93',
    homeCardArrowBg: 'rgba(142, 142, 147, 0.1)',
    homeCardArrow: '#8E8E93',
    homeFooterText: '#8E8E93',
    homeBlurTint: 'light',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,

    // 设置页面深色模式颜色
    settingsBackground: '#000',
    settingsCardBackground: 'rgba(28, 28, 30, 0.8)',
    settingsCardBorder: 'rgba(84, 84, 88, 0.3)',
    settingsText: '#FFFFFF',
    settingsSecondaryText: '#8E8E93',
    settingsBorder: 'rgba(84, 84, 88, 0.3)',
    settingsAccent: '#5E5CE6',
    modalOverlay: 'rgba(0, 0, 0, 0.7)',
    modalBackground: '#1C1C1E',
    modalSelected: 'rgba(94, 92, 230, 0.2)',

    // 标签栏深色模式颜色
    tabBarBackground: 'rgba(28, 28, 30, 0.95)',
    tabBarBorder: 'rgba(84, 84, 88, 0.5)',
    tabBarTint: 'dark',
    tabBarIconActive: '#007AFF',
    tabBarIconInactive: '#8E8E93',
    tabBarIndicatorBackground: 'rgba(84, 84, 88, 0.6)',
    tabBarIndicatorBorder: 'rgba(84, 84, 88, 0.8)',

    // 首页深色模式颜色
    homeBackground: '#000000',
    homeGradientStart: '#000000',
    homeGradientMiddle: '#1A1A1A',
    homeGradientEnd: '#000000',
    homeTitle: '#FFFFFF',
    homeSubtitle: '#8E8E93',
    homeCardBackground: 'rgba(28, 28, 30, 0.8)',
    homeCardBorder: '#8E8E93',
    homeCardTitle: '#FFFFFF',
    homeCardDescription: '#8E8E93',
    homeCardArrowBg: 'rgba(84, 84, 88, 0.2)',
    homeCardArrow: '#8E8E93',
    homeFooterText: '#8E8E93',
    homeBlurTint: 'dark',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
