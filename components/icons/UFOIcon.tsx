import React from 'react'
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg'

interface UFOIconProps {
  size?: number
  color?: string
}

export const UFOIcon: React.FC<UFOIconProps> = ({ size = 24, color = '#96CEB4' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G>
        {/* UFO主体（下半部分） */}
        <Ellipse cx="12" cy="14" rx="8" ry="3" fill={color} />
        {/* UFO驾驶舱（上半部分） */}
        <Ellipse cx="12" cy="11" rx="5" ry="4" fill={color} opacity="0.9" />
        {/* 驾驶舱窗户 */}
        <Ellipse cx="12" cy="10" rx="3" ry="2.5" fill="white" opacity="0.7" />
        {/* 底部灯光 */}
        <Circle cx="8" cy="16" r="1" fill="#FFD700" opacity="0.8" />
        <Circle cx="12" cy="17" r="1" fill="#FFD700" opacity="0.8" />
        <Circle cx="16" cy="16" r="1" fill="#FFD700" opacity="0.8" />
        {/* 顶部天线 */}
        <Path d="M12 7L12 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <Circle cx="12" cy="4" r="1" fill="#FF6B6B" />
        {/* 光束效果 */}
        <Path d="M10 17L8 21L16 21L14 17" fill="#87CEEB" opacity="0.3" />
        {/* 装饰细节 */}
        <Path d="M7 12L17 12" stroke="white" strokeWidth="0.5" opacity="0.5" />
      </G>
    </Svg>
  )
}
