import { StyleSheet, Platform } from 'react-native';

/**
 * 通用样式定义
 * 统一管理项目中重复使用的样式
 */
export const commonStyles = StyleSheet.create({
  // ========== 容器样式 ==========
  container: {
    flex: 1,
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ========== 按钮样式 ==========
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonLarge: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ========== 卡片样式 ==========
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },

  cardLarge: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },

  cardMedium: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },

  cardSmall: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },

  // ========== Modal样式 ==========
  modalContainer: {
    borderRadius: 20,
    padding: 24,
    overflow: 'hidden',
  },

  modalContent: {
    borderRadius: 20,
    borderWidth: 1,
  },

  // ========== 输入框样式 ==========
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },

  inputLarge: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
  },

  // ========== 阴影样式 ==========
  shadowSmall: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  shadowMedium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  shadowLarge: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },

  shadowXLarge: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },

  // ========== 平台特定阴影 ==========
  shadowCard: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 5,
      },
    }),
  },

  shadowButton: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  // ========== 间距样式 ==========
  marginBottom8: {
    marginBottom: 8,
  },

  marginBottom12: {
    marginBottom: 12,
  },

  marginBottom16: {
    marginBottom: 16,
  },

  marginBottom20: {
    marginBottom: 20,
  },

  marginBottom24: {
    marginBottom: 24,
  },

  padding8: {
    padding: 8,
  },

  padding12: {
    padding: 12,
  },

  padding16: {
    padding: 16,
  },

  padding20: {
    padding: 20,
  },

  padding24: {
    padding: 24,
  },

  // ========== 文本样式 ==========
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },

  titleLarge: {
    fontSize: 28,
    fontWeight: 'bold',
  },

  subtitle: {
    fontSize: 18,
    fontWeight: '600',
  },

  body: {
    fontSize: 16,
  },

  bodyLarge: {
    fontSize: 18,
  },

  caption: {
    fontSize: 14,
  },

  captionSmall: {
    fontSize: 12,
  },

  textBold: {
    fontWeight: 'bold',
  },

  textSemiBold: {
    fontWeight: '600',
  },

  textMedium: {
    fontWeight: '500',
  },

  textCenter: {
    textAlign: 'center',
  },

  // ========== 布局样式 ==========
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  rowSpaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  spaceBetween: {
    justifyContent: 'space-between',
  },

  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  alignCenter: {
    alignItems: 'center',
  },

  justifyCenter: {
    justifyContent: 'center',
  },

  // ========== Flex样式 ==========
  flex1: {
    flex: 1,
  },

  flex2: {
    flex: 2,
  },

  flex3: {
    flex: 3,
  },

  // ========== 位置样式 ==========
  absolute: {
    position: 'absolute',
  },

  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
  },

  // ========== 边框样式 ==========
  border: {
    borderWidth: 1,
  },

  borderTop: {
    borderTopWidth: 1,
  },

  borderBottom: {
    borderBottomWidth: 1,
  },

  borderLeft: {
    borderLeftWidth: 1,
  },

  borderRight: {
    borderRightWidth: 1,
  },
});

/**
 * 通用尺寸常量
 */
export const commonSizes = {
  buttonHeight: 48,
  buttonHeightLarge: 56,
  buttonHeightSmall: 40,
  inputHeight: 48,
  inputHeightLarge: 56,
  inputHeightSmall: 40,
} as const;

/**
 * 圆角半径常量
 */
export const borderRadius = {
  small: 8,
  medium: 12,
  large: 16,
  xlarge: 20,
  xxlarge: 24,
  full: 9999,
} as const;

/**
 * 间距常量
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/**
 * 字体大小常量
 */
export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  display: 32,
} as const;

/**
 * 字体粗细常量
 */
export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;
