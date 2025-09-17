import React from 'react';
import Svg, { Path, Circle, G, Ellipse } from 'react-native-svg';

interface AirplaneIconProps {
  size?: number;
  color?: string;
}

export const AirplaneIcon: React.FC<AirplaneIconProps> = ({
  size = 24,
  color = '#5E5CE6'
}) => {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
      <G>
        {/* 脸部轮廓 - 更圆润 */}
        <Circle
          cx="12"
          cy="13"
          r="10"
          fill="#FFD4C4"
          stroke="#FFC4B4"
          strokeWidth="0.8"
        />

        {/* 头发 - 更蓬松可爱 */}
        <Path
          d="M12 2.5C17 2.5 21.5 6.5 21.5 11.5C21.5 8 19 3.5 12 3.5C5 3.5 2.5 8 2.5 11.5C2.5 6.5 7 2.5 12 2.5Z"
          fill="#FF8C69"
        />

        {/* 可爱的呆毛 */}
        <Circle
          cx="12"
          cy="3"
          r="1.5"
          fill="#FF7F50"
        />
        <Circle
          cx="10"
          cy="4"
          r="1"
          fill="#FF7F50"
        />
        <Circle
          cx="14"
          cy="4"
          r="1"
          fill="#FF7F50"
        />

        {/* 超大眼睛 - 更可爱 */}
        <Circle
          cx="9"
          cy="11"
          r="2.5"
          fill="white"
          stroke="#E0E0E0"
          strokeWidth="0.3"
        />
        <Circle
          cx="9"
          cy="11"
          r="1.8"
          fill="#4169E1"
        />
        <Circle
          cx="9"
          cy="11"
          r="1.2"
          fill="#000080"
        />
        <Circle
          cx="9.5"
          cy="10.2"
          r="0.6"
          fill="white"
        />
        <Circle
          cx="8.5"
          cy="10.8"
          r="0.3"
          fill="white"
        />

        <Circle
          cx="15"
          cy="11"
          r="2.5"
          fill="white"
          stroke="#E0E0E0"
          strokeWidth="0.3"
        />
        <Circle
          cx="15"
          cy="11"
          r="1.8"
          fill="#4169E1"
        />
        <Circle
          cx="15"
          cy="11"
          r="1.2"
          fill="#000080"
        />
        <Circle
          cx="15.5"
          cy="10.2"
          r="0.6"
          fill="white"
        />
        <Circle
          cx="14.5"
          cy="10.8"
          r="0.3"
          fill="white"
        />

        {/* 可爱小鼻子 */}
        <Circle
          cx="12"
          cy="14"
          r="0.8"
          fill="#FFB6C1"
        />

        {/* 超级可爱的笑脸 */}
        <Path
          d="M9.5 16.5C10.5 18 11.5 18.5 12 18.5C12.5 18.5 13.5 18 14.5 16.5"
          stroke="#FF69B4"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* 更大更粉的腮红 */}
        <Circle
          cx="6.5"
          cy="14.5"
          r="1.8"
          fill="#FF91A4"
          opacity="0.8"
        />
        <Circle
          cx="17.5"
          cy="14.5"
          r="1.8"
          fill="#FF91A4"
          opacity="0.8"
        />

        {/* 可爱的眉毛 */}
        <Path
          d="M7 8.5C7.5 8 8.5 7.8 9.5 8"
          stroke="#FF7F50"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <Path
          d="M14.5 8C15.5 7.8 16.5 8 17 8.5"
          stroke="#FF7F50"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* 可爱的星星装饰 */}
        <Path
          d="M5 7L5.5 7.5L6 7L5.5 6.5Z"
          fill="#FFD700"
        />
        <Path
          d="M19 7L19.5 7.5L20 7L19.5 6.5Z"
          fill="#FFD700"
        />
        <Path
          d="M6 19L6.5 19.5L7 19L6.5 18.5Z"
          fill="#FFD700"
        />
        <Path
          d="M18 19L18.5 19.5L19 19L18.5 18.5Z"
          fill="#FFD700"
        />
      </G>
    </Svg>
  );
};