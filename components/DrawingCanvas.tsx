import React, { useRef, useState } from 'react'
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native'
import { Svg, Path, G } from 'react-native-svg'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/theme'

export interface DrawingCanvasProps {
  width: number
  height: number
  colors?: typeof Colors.light | typeof Colors.dark
  onClear?: () => void
  disabled?: boolean
}

interface PathData {
  path: string
  color: string
  strokeWidth: number
}

const DRAWING_COLORS = [
  '#000000', // 黑色
  '#FF0000', // 红色
  '#00FF00', // 绿色
  '#0000FF', // 蓝色
  '#FFFF00', // 黄色
  '#FF00FF', // 紫色
  '#00FFFF', // 青色
  '#FFA500', // 橙色
]

const STROKE_WIDTHS = [2, 4, 8, 12]

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  width,
  height,
  colors = Colors.light,
  onClear,
  disabled = false,
}) => {
  const [paths, setPaths] = useState<PathData[]>([])
  const [currentPath, setCurrentPath] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState(DRAWING_COLORS[0])
  const [selectedStrokeWidth, setSelectedStrokeWidth] = useState(STROKE_WIDTHS[1])

  const currentPoints = useRef<{ x: number; y: number }[]>([])

  // 绘画手势
  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .onStart((event) => {
      currentPoints.current = [{ x: event.x, y: event.y }]
      setCurrentPath(`M ${event.x} ${event.y}`)
    })
    .onUpdate((event) => {
      currentPoints.current.push({ x: event.x, y: event.y })
      const path = currentPoints.current
        .map((point, index) => {
          if (index === 0) {
            return `M ${point.x} ${point.y}`
          }
          return `L ${point.x} ${point.y}`
        })
        .join(' ')
      setCurrentPath(path)
    })
    .onEnd(() => {
      if (currentPath) {
        setPaths((prev) => [
          ...prev,
          {
            path: currentPath,
            color: selectedColor,
            strokeWidth: selectedStrokeWidth,
          },
        ])
        setCurrentPath('')
        currentPoints.current = []
      }
    })

  // 清空画布
  const handleClear = () => {
    setPaths([])
    setCurrentPath('')
    currentPoints.current = []
    onClear?.()
  }

  // 撤销上一笔
  const handleUndo = () => {
    if (paths.length > 0) {
      setPaths((prev) => prev.slice(0, -1))
    }
  }

  return (
    <View style={styles.container}>
      {/* 画布区域 */}
      <View
        style={[
          styles.canvasContainer,
          {
            width,
            height,
            backgroundColor: '#FFFFFF',
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        <GestureDetector gesture={panGesture}>
          <View style={{ width, height }}>
            <Svg width={width} height={height}>
              <G>
                {/* 绘制已完成的路径 */}
                {paths.map((pathData, index) => (
                  <Path
                    key={`path-${index}`}
                    d={pathData.path}
                    stroke={pathData.color}
                    strokeWidth={pathData.strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}

                {/* 绘制当前正在画的路径 */}
                {currentPath && (
                  <Path
                    d={currentPath}
                    stroke={selectedColor}
                    strokeWidth={selectedStrokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </G>
            </Svg>
          </View>
        </GestureDetector>
      </View>

      {/* 工具栏 */}
      {!disabled && (
        <View style={styles.toolbar}>
          {/* 颜色选择器 */}
          <View style={styles.colorPicker}>
            {DRAWING_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorButton,
                  {
                    backgroundColor: color,
                    borderColor: selectedColor === color ? '#F59E0B' : '#CCCCCC',
                    borderWidth: selectedColor === color ? 3 : 1,
                  },
                ]}
                onPress={() => setSelectedColor(color)}
                activeOpacity={0.7}
              />
            ))}
          </View>

          {/* 笔刷大小选择器 */}
          <View style={styles.strokePicker}>
            {STROKE_WIDTHS.map((strokeWidth) => (
              <TouchableOpacity
                key={strokeWidth}
                style={[
                  styles.strokeButton,
                  {
                    backgroundColor:
                      selectedStrokeWidth === strokeWidth
                        ? '#F59E0B' + '30'
                        : colors.background || '#F5F5F5',
                    borderColor:
                      selectedStrokeWidth === strokeWidth ? '#F59E0B' : '#CCCCCC',
                  },
                ]}
                onPress={() => setSelectedStrokeWidth(strokeWidth)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.strokeIndicator,
                    {
                      width: strokeWidth * 2,
                      height: strokeWidth * 2,
                      backgroundColor:
                        selectedStrokeWidth === strokeWidth ? '#F59E0B' : '#000000',
                    },
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* 功能按钮 */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.warning || '#F59E0B' }]}
              onPress={handleUndo}
              activeOpacity={0.7}
              disabled={paths.length === 0}
            >
              <Ionicons name="arrow-undo" size={24} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>撤销</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.error || '#EF4444' }]}
              onPress={handleClear}
              activeOpacity={0.7}
              disabled={paths.length === 0 && !currentPath}
            >
              <Ionicons name="trash" size={24} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>清空</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
  },
  canvasContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#CCCCCC',
  },
  toolbar: {
    width: '100%',
    gap: 12,
  },
  colorPicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  colorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  strokePicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  strokeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  strokeIndicator: {
    borderRadius: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})
