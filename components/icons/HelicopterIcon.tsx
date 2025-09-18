import React from 'react';
import Svg, {Circle, Ellipse, G, Path} from 'react-native-svg';

interface HelicopterIconProps {
  size?: number;
  color?: string;
}

export const HelicopterIcon: React.FC<HelicopterIconProps> = ({
  size = 24,
  color = '#FF6482'
}) => {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
      <G>
        {/* 清新女性脸部轮廓 */}
        <Circle
          cx="12"
          cy="12.5"
          r="8.5"
          fill="#FFEEE6"
          stroke="#FFDDDD"
          strokeWidth="0.8"
        />

        {/* 优雅长发 */}
        <Path
          d="M12 3.5C17.5 3.5 21 7 21 11.5C21 8.5 19 4.5 12 4.5C5 4.5 3 8.5 3 11.5C3 7 6.5 3.5 12 3.5Z"
          fill="#8B4513"
        />

        {/* 侧边发丝 */}
        <Path
          d="M3.5 10C2.5 11 2 13 2.5 15C3 17 4 18.5 5.5 19"
          stroke="#A0522D"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d="M20.5 10C21.5 11 22 13 21.5 15C21 17 20 18.5 18.5 19"
          stroke="#A0522D"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />

        {/* 自然刘海 */}
        <Path
          d="M7.5 6.5C9 5.5 10.5 5 12 5C13.5 5 15 5.5 16.5 6.5C15.5 6 14 5.5 12 5.5C10 5.5 8.5 6 7.5 6.5Z"
          fill="#654321"
        />

        {/* 温柔的眼睛 */}
        <Ellipse
          cx="9.5"
          cy="10.5"
          rx="2"
          ry="2.5"
          fill="white"
        />
        <Ellipse
          cx="9.5"
          cy="10.5"
          rx="1.5"
          ry="2"
          fill="#8B7355"
        />
        <Ellipse
          cx="9.5"
          cy="10.5"
          rx="1"
          ry="1.3"
          fill="#5D4E37"
        />
        <Circle
          cx="10"
          cy="9.8"
          r="0.5"
          fill="white"
        />

        <Ellipse
          cx="14.5"
          cy="10.5"
          rx="2"
          ry="2.5"
          fill="white"
        />
        <Ellipse
          cx="14.5"
          cy="10.5"
          rx="1.5"
          ry="2"
          fill="#8B7355"
        />
        <Ellipse
          cx="14.5"
          cy="10.5"
          rx="1"
          ry="1.3"
          fill="#5D4E37"
        />
        <Circle
          cx="15"
          cy="9.8"
          r="0.5"
          fill="white"
        />

        {/* 细致睫毛 */}
        <Path
          d="M7.5 9.5C7.8 9.2 8.2 9.1 8.5 9.2"
          stroke="#654321"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
        <Path
          d="M8.5 9.8C8.8 9.5 9.2 9.4 9.5 9.5"
          stroke="#654321"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
        <Path
          d="M16.5 9.5C16.2 9.2 15.8 9.1 15.5 9.2"
          stroke="#654321"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
        <Path
          d="M15.5 9.8C15.2 9.5 14.8 9.4 14.5 9.5"
          stroke="#654321"
          strokeWidth="0.8"
          strokeLinecap="round"
        />

        {/* 精致小鼻 */}
        <Ellipse
          cx="12"
          cy="12.8"
          rx="0.5"
          ry="0.8"
          fill="#FFCCCC"
        />

        {/* 自然微笑 */}
        <Path
          d="M10.5 15C11 15.5 11.5 15.8 12 15.8C12.5 15.8 13 15.5 13.5 15"
          stroke="#CC6699"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />

        {/* 淡淡腮红 */}
        <Ellipse
          cx="7.5"
          cy="13.5"
          rx="1.2"
          ry="0.8"
          fill="#FFB6C1"
          opacity="0.6"
        />
        <Ellipse
          cx="16.5"
          cy="13.5"
          rx="1.2"
          ry="0.8"
          fill="#FFB6C1"
          opacity="0.6"
        />

        {/* 柔和眉毛 */}
        <Path
          d="M8 8.5C8.5 8.2 9.5 8.1 10.5 8.3"
          stroke="#8B4513"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <Path
          d="M13.5 8.3C14.5 8.1 15.5 8.2 16 8.5"
          stroke="#8B4513"
          strokeWidth="1"
          strokeLinecap="round"
        />

        {/* 简单耳环装饰 */}
        <Circle
          cx="5.5"
          cy="11.5"
          r="0.6"
          fill="#FFD700"
        />
        <Circle
          cx="18.5"
          cy="11.5"
          r="0.6"
          fill="#FFD700"
        />
      </G>
    </Svg>
  );
};