import React from 'react'
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg'

// 颜色配置
const skinColors = ['#FFD4C4', '#FFE0BD', '#FFCC99', '#F1C27D', '#E0C8B0', '#D2B48C']
const hairColors = ['#FF8C69', '#8B4513', '#2F4F4F', '#FFD700', '#FF69B4', '#654321', '#A52A2A']
const eyeColors = ['#4169E1', '#228B22', '#8A2BE2', '#A52A2A', '#00CED1', '#FF6347']
const blushColors = ['#FF91A4', '#FFB6C1', '#FFA07A', '#FFDAB9']

// 基于seed的伪随机数生成器
function rng(seed: any, n: any) {
  return Math.abs(Math.sin(seed * (n + 12345))) % 1
}

const Avatar: React.FC<{ seed: number; style?: 'random' | 'cute' | 'male' | 'female' }> = ({
  seed,
  style = 'random',
}) => {
  // 确定最终风格（如果是random则随机选择）
  const finalStyle =
    style === 'random' ? ['cute', 'male', 'female'][Math.floor(rng(seed, 10) * 3)] : style

  // 基于风格和seed选择特征
  const skin = skinColors[Math.floor(rng(seed, 1) * skinColors.length)]
  const hairColor = hairColors[Math.floor(rng(seed, 2) * hairColors.length)]
  const eyeColor = eyeColors[Math.floor(rng(seed, 3) * eyeColors.length)]
  const blush = blushColors[Math.floor(rng(seed, 4) * blushColors.length)]

  // 根据风格调整面部特征
  const isCute = finalStyle === 'cute'
  const isMale = finalStyle === 'male'
  const isFemale = finalStyle === 'female'

  // 眼睛大小和位置调整
  const eyeSize = isCute ? 2.8 : isMale ? 2.2 : 2.5
  const eyeY = isCute ? 10.5 : 11

  // 腮红大小调整
  const blushSize = isCute ? 1.8 : isMale ? 1.2 : 1.5
  const blushOpacity = isCute ? 0.9 : isMale ? 0.5 : 0.7

  // 发型路径 - 根据不同风格生成不同发型
  const getHairPath = () => {
    if (isMale) {
      // 男士短发
      return (
        <>
          <Path
            d="M12 2.5C17 2.5 21.5 6.5 21.5 11C21.5 8.5 19 4 12 4C5 4 2.5 8.5 2.5 11C2.5 6.5 7 2.5 12 2.5Z"
            fill={hairColor}
          />
          <Path d="M5 10C5 8 7 6 12 6C17 6 19 8 19 10" fill={hairColor} />
        </>
      )
    } else if (isFemale) {
      // 女士长发
      return (
        <>
          <Path
            d="M12 2C18 2 22 6 22 11C22 18 20 20 18 20H6C4 20 2 18 2 11C2 6 6 2 12 2Z"
            fill={hairColor}
          />
          <Path d="M6 10C5 10 4 11 4 12C4 14 5 16 6 16" fill={hairColor} />
          <Path d="M18 10C19 10 20 11 20 12C20 14 19 16 18 16" fill={hairColor} />
        </>
      )
    } else {
      // 可爱风格发型
      return (
        <>
          <Circle cx="12" cy="5" r="6" fill={hairColor} />
          <Path
            d="M6 10C3 10 2 13 2 15C2 18 4 20 6 20H18C20 20 22 18 22 15C22 13 21 10 18 10"
            fill={hairColor}
          />
        </>
      )
    }
  }

  // 嘴巴形状 - 根据风格不同
  const getMouthPath = () => {
    if (isCute) {
      // 可爱风格 - 更大的微笑或小嘴巴
      return rng(seed, 20) > 0.5 ? (
        <Path
          d="M9 17C10 18.5 14 18.5 15 17"
          stroke="#FF69B4"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <Circle cx="12" cy="17" r="1" fill="#FF69B4" />
      )
    } else if (isMale) {
      // 男士 - 更内敛的嘴型
      return (
        <Path d="M10 17H14" stroke="#D2691E" strokeWidth="1" fill="none" strokeLinecap="round" />
      )
    } else {
      // 女士 - 优雅的微笑
      return (
        <Path
          d="M9.5 17C11 18 13 18 14.5 17"
          stroke="#FF69B4"
          strokeWidth="1"
          fill="none"
          strokeLinecap="round"
        />
      )
    }
  }

  // 装饰 - 根据风格添加小装饰
  const getAccessories = () => {
    if (isCute) {
      // 可爱风格装饰 - 小蝴蝶结或星星
      return rng(seed, 30) > 0.5 ? (
        <Path d="M7 5C7 3 9 2 12 2C15 2 17 3 17 5" stroke="#FF69B4" strokeWidth="0.8" fill="none" />
      ) : (
        <Circle cx={rng(seed, 31) > 0.5 ? 6 : 18} cy={6} r="1" fill="#FFD700" />
      )
    } else if (isMale) {
      // 男士装饰 - 可能是小胡子或发带
      return rng(seed, 30) > 0.7 ? (
        <Path
          d="M10 15.5C10.5 15 13.5 15 14 15.5"
          stroke="#8B4513"
          strokeWidth="0.6"
          fill="none"
          strokeLinecap="round"
        />
      ) : null
    } else {
      // 女士装饰 - 发夹或小花朵
      return rng(seed, 30) > 0.5 ? (
        <Path
          d="M4 8C5 6 7 5 8 7"
          stroke="#FF69B4"
          strokeWidth="0.8"
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <Ellipse cx={18} cy={7} rx="1.5" ry="1" fill="#FF69B4" />
      )
    }
  }

  return (
    <Svg width={60} height={60} viewBox="0 0 24 24" fill="none">
      <G>
        {/* 脸部 */}
        <Circle
          cx="12"
          cy="13"
          r={isCute ? 10.5 : 10}
          fill={skin}
          stroke="#FFC4B4"
          strokeWidth="0.8"
        />

        {/* 头发 */}
        {getHairPath()}

        {/* 眼睛 */}
        <Circle cx="9" cy={eyeY} r={eyeSize} fill="white" stroke="#E0E0E0" strokeWidth="0.3" />
        <Circle cx="9" cy={eyeY} r={eyeSize * 0.7} fill={eyeColor} />
        <Circle cx={9 - eyeSize * 0.2} cy={eyeY - eyeSize * 0.2} r={eyeSize * 0.3} fill="#000" />

        <Circle cx="15" cy={eyeY} r={eyeSize} fill="white" stroke="#E0E0E0" strokeWidth="0.3" />
        <Circle cx="15" cy={eyeY} r={eyeSize * 0.7} fill={eyeColor} />
        <Circle cx={15 - eyeSize * 0.2} cy={eyeY - eyeSize * 0.2} r={eyeSize * 0.3} fill="#000" />

        {/* 鼻子 */}
        <Circle cx="12" cy={isCute ? 14.5 : 14} r={isCute ? 0.7 : 0.6} fill="#FFB6C1" />

        {/* 嘴巴 */}
        {getMouthPath()}

        {/* 腮红 */}
        {!isMale && (
          <>
            <Circle cx="6.5" cy="14.5" r={blushSize} fill={blush} opacity={blushOpacity} />
            <Circle cx="17.5" cy="14.5" r={blushSize} fill={blush} opacity={blushOpacity} />
          </>
        )}

        {/* 装饰 */}
        {getAccessories()}
      </G>
    </Svg>
  )
}

export default Avatar
