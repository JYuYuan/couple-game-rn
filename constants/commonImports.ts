/**
 * 通用导入文件
 * 统一管理常用的 React Native 组件和第三方库导入
 */

// React Native 核心组件
export {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';

// React 相关
export { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// Expo 相关
export { LinearGradient } from 'expo-linear-gradient';
export { useRouter } from 'expo-router';

// 第三方库
export { useTranslation } from 'react-i18next';

// 项目内部导入
export { usePageBase } from '@/hooks/usePageBase';
export { useErrorHandler } from '@/hooks/useErrorHandler';
export { commonStyles, commonSizes, spacing } from '@/constants/commonStyles';
export { Colors } from '@/constants/theme';