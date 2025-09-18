import React from 'react';
import Svg, {Circle, G, Path} from 'react-native-svg';

interface RocketIconProps {
  size?: number;
  color?: string;
}

export const RocketIcon: React.FC<RocketIconProps> = ({
  size = 24,
  color = '#45B7D1'
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G>
        {/* 火箭主体 */}
        <Path
          d="M12 2C13 2 14 3 14 4L14 16C14 17 13 18 12 18C11 18 10 17 10 16L10 4C10 3 11 2 12 2Z"
          fill={color}
        />
        {/* 火箭头部 */}
        <Path
          d="M12 2L10 4L14 4L12 2Z"
          fill={color}
        />
        {/* 火箭窗户 */}
        <Circle
          cx="12"
          cy="6"
          r="1.5"
          fill="white"
          opacity="0.8"
        />
        {/* 左侧翼 */}
        <Path
          d="M10 12L6 14L8 16L10 14Z"
          fill={color}
          opacity="0.8"
        />
        {/* 右侧翼 */}
        <Path
          d="M14 12L18 14L16 16L14 14Z"
          fill={color}
          opacity="0.8"
        />
        {/* 火焰效果 */}
        <Path
          d="M10 18L12 22L14 18L12 20Z"
          fill="#FF6B6B"
          opacity="0.9"
        />
        <Path
          d="M11 18L12 21L13 18L12 20Z"
          fill="#FFD700"
          opacity="0.8"
        />
        {/* 装饰条纹 */}
        <Path
          d="M10 8L14 8"
          stroke="white"
          strokeWidth="0.5"
          opacity="0.6"
        />
        <Path
          d="M10 10L14 10"
          stroke="white"
          strokeWidth="0.5"
          opacity="0.6"
        />
      </G>
    </Svg>
  );
};