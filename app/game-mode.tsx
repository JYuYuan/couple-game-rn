import React, { useEffect, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Colors, CommonStyles, Layout } from '@/constants/theme'
import { useTasksStore } from '@/store/tasksStore'
import { TaskSet } from '@/types/tasks'
import { TaskSetDetailModal } from '@/components/TaskSetDetailModal'
import { useSocket } from '@/hooks/use-socket'
import { useSettingsStore } from '@/store'
import toast from '@/utils/toast'

const routeConfig: Record<string, string> = {
  fly: '/flying-chess',
  wheel: '/wheel-points',
  minesweeper: '/minesweeper-battle',
}

export default function GameMode() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { t } = useTranslation()
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme] as any
  const { networkSettings } = useSettingsStore()
  const socket = useSocket()

  // 获取传入的游戏类型参数
  const gameType = (params.type as string) || 'all'

  // 从store获取数据
  const { categories, taskSets } = useTasksStore()

  // 游戏类型配置 - 包含在线模式支持状态
  const gameTypeConfig = {
    fly: { hasOnline: true },
    wheel: { hasOnline: false },
    minesweeper: { hasOnline: false },
  }

  // 检查当前游戏类型是否支持在线模式
  // 需要同时满足：游戏本身支持在线 && (网络模式开启 || 局域网模式开启)
  const isNetworkEnabled = networkSettings.enabled || networkSettings.lanMode
  const gameSupportsOnline =
    gameTypeConfig[gameType as keyof typeof gameTypeConfig]?.hasOnline || false
  const supportsOnlineMode = gameSupportsOnline && isNetworkEnabled

  // 状态管理
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedTaskSet, setSelectedTaskSet] = useState<TaskSet | null>(null)
  const hasInitialAnimated = useRef(false)

  // 动画值
  const floatAnimation = useSharedValue(0)
  const fadeAnimation = useSharedValue(0)

  useEffect(() => {
    floatAnimation.value = withRepeat(
      withSequence(withTiming(1, { duration: 3000 }), withTiming(0, { duration: 3000 })),
      -1,
    )
    fadeAnimation.value = withTiming(1, { duration: 800 })
  }, [])

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(floatAnimation.value, [0, 1], [0, -10]) }],
  }))

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeAnimation.value,
    transform: [{ translateY: interpolate(fadeAnimation.value, [0, 1], [30, 0]) }],
  }))

  // 根据游戏类型获取标题
  const getPageTitle = () => {
    switch (gameType) {
      case 'fly':
        return t('gameMode.flyingChess', '飞行棋')
      case 'wheel':
        return t('gameMode.wheel', '大转盘')
      case 'minesweeper':
        return t('gameMode.minesweeper', '扫雷对战')
      default:
        return t('gameMode.default', '任务选择')
    }
  }

  // 根据选中分类过滤任务集
  const filteredTaskSets =
    selectedCategory === 'all'
      ? taskSets.filter((set) => set.isActive)
      : taskSets.filter((set) => set.categoryId === selectedCategory && set.isActive)

  // 分类选择组件
  const CategorySelector = () => {
    return (
      <Animated.View
        style={[
          styles.categoryContainer,
          { backgroundColor: colors.homeBackground },
          fadeStyle,
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
          bounces={false}
          decelerationRate="fast"
          nestedScrollEnabled={true}
        >
          <TouchableOpacity
            style={[
              styles.categoryButton,
              selectedCategory === 'all' && styles.categoryButtonActive,
              {
                backgroundColor:
                  selectedCategory === 'all'
                    ? colors.settingsAccent + '20'
                    : colors.homeCardBackground,
                borderColor:
                  selectedCategory === 'all' ? colors.settingsAccent : colors.homeCardBorder,
              },
            ]}
            onPress={() => setSelectedCategory('all')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={
                selectedCategory === 'all'
                  ? ['#5E5CE6', '#BF5AF2']
                  : [colors.homeCardBackground, colors.homeCardBackground]
              }
              style={styles.categoryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons
                name="apps"
                size={18}
                color={selectedCategory === 'all' ? 'white' : colors.homeCardDescription}
              />
              <Text
                style={[
                  styles.categoryButtonText,
                  {
                    color: selectedCategory === 'all' ? 'white' : colors.homeCardDescription,
                  },
                ]}
              >
                {t('gameMode.all', '全部')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                selectedCategory === category.id && styles.categoryButtonActive,
                {
                  backgroundColor:
                    selectedCategory === category.id
                      ? category.color + '20'
                      : colors.homeCardBackground,
                  borderColor:
                    selectedCategory === category.id ? category.color : colors.homeCardBorder,
                },
              ]}
              onPress={() => setSelectedCategory(category.id)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={
                  selectedCategory === category.id
                    ? [category.color, category.color + 'CC']
                    : [colors.homeCardBackground, colors.homeCardBackground]
                }
                style={styles.categoryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons
                  name={category.icon as any}
                  size={18}
                  color={selectedCategory === category.id ? 'white' : colors.homeCardDescription}
                />
                <Text
                  style={[
                    styles.categoryButtonText,
                    {
                      color:
                        selectedCategory === category.id ? 'white' : colors.homeCardDescription,
                    },
                  ]}
                >
                  {category.name}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    )
  }

  // 任务集卡片组件
  const TaskSetCard = ({ taskSet, index }: { taskSet: TaskSet; index: number }) => {
    const category = categories.find((cat) => cat.id === taskSet.categoryId)
    const scale = useSharedValue(1)
    const cardAnimation = useSharedValue(hasInitialAnimated.current ? 1 : 0)

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }))

    const cardFadeStyle = useAnimatedStyle(() => ({
      opacity: cardAnimation.value,
      transform: [{ translateY: interpolate(cardAnimation.value, [0, 1], [50, 0]) }],
    }))

    useEffect(() => {
      if (!hasInitialAnimated.current) {
        cardAnimation.value = withTiming(1, { duration: 600 })
        if (index === filteredTaskSets.length - 1) {
          hasInitialAnimated.current = true
        }
      }
    }, [])

    const handlePressIn = () => {
      scale.value = withSpring(0.95)
    }

    const handlePressOut = () => {
      scale.value = withSpring(1)
    }

    const handleCardPress = () => {
      setSelectedTaskSet(taskSet)
      setModalVisible(true)
    }

    const handleStartGame = () => {
      if (!routeConfig[gameType]) return
      router.push({
        pathname: routeConfig[gameType] as any,
        params: { taskSetId: taskSet.id },
      })
    }

    const handleCreateRoom = () => {
      // 检查当前游戏类型是否支持在线模式
      if (!supportsOnlineMode) {
        toast.info(t('gameMode.onlineNotSupported', '该游戏类型暂不支持在线模式'))
        return
      }

      // 直接跳转到创建房间页面
      router.push({
        pathname: '/create-room',
        params: {
          gameType: gameType,
          taskSetId: taskSet.id,
        },
      })
    }

    const handleJoinRoom = () => {
      // 检查当前游戏类型是否支持在线模式
      if (!supportsOnlineMode) {
        toast.info(t('gameMode.onlineNotSupported', '该游戏类型暂不支持在线模式'))
        return
      }

      // 跳转到加入房间页面
      router.push({
        pathname: '/join-room',
        params: {
          gameType: gameType,
          taskSetId: taskSet.id,
        },
      })
    }

    return (
      <Animated.View style={[animatedStyle, cardFadeStyle, styles.taskSetCard]}>
        <TouchableOpacity
          onPress={handleCardPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.cardContainer,
            {
              backgroundColor: colors.homeCardBackground,
              borderColor: colors.homeCardBorder,
              shadowColor: colorScheme === 'dark' ? '#000' : '#000',
            },
          ]}
        >
          {/* 头部信息 */}
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <View
                style={[
                  styles.difficultyBadge,
                  { backgroundColor: getDifficultyColor(taskSet.difficulty) + '15' },
                ]}
              >
                <Text
                  style={[styles.difficultyText, { color: getDifficultyColor(taskSet.difficulty) }]}
                >
                  {getDifficultyText(taskSet.difficulty)}
                </Text>
              </View>
              {category && (
                <View style={[styles.categoryBadge, { backgroundColor: category.color + '15' }]}>
                  <Ionicons name={category.icon as any} size={12} color={category.color} />
                  <Text style={[styles.categoryText, { color: category.color }]}>
                    {category.name}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.cardTitle, { color: colors.homeCardTitle }]}>{taskSet.name}</Text>
            {taskSet.description && (
              <Text style={[styles.cardDescription, { color: colors.homeCardDescription }]}>
                {taskSet.description}
              </Text>
            )}
          </View>

          {/* 任务统计 */}
          <View style={styles.cardStats}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: colors.settingsAccent + '15' }]}>
                <Ionicons name="list" size={14} color={colors.settingsAccent} />
              </View>
              <Text style={[styles.statText, { color: colors.homeCardDescription }]}>
                {t('gameMode.taskCount', '{{count}} 个任务', { count: taskSet.tasks.length })}
              </Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#FF9500' + '15' }]}>
                <Ionicons name="time" size={14} color="#FF9500" />
              </View>
              <Text style={[styles.statText, { color: colors.homeCardDescription }]}>
                {getEstimatedTime(taskSet.tasks.length)}
              </Text>
            </View>
          </View>

          {/* 游戏模式按钮 */}
          <View style={styles.gameButtons}>
            {/* 单机模式 */}
            <TouchableOpacity
              style={[styles.gameModeButton, !isNetworkEnabled && styles.fullWidthButton]}
              onPress={handleStartGame}
            >
              <LinearGradient
                colors={['#5E5CE6', '#BF5AF2']}
                style={styles.gameModeButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="person" size={16} color="white" />
                <Text style={styles.gameModeButtonText}>
                  {t('gameMode.singlePlayer', '单机模式')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* 创建房间 - 仅在网络模式或局域网模式启用时显示 */}
            {isNetworkEnabled && (
              <TouchableOpacity
                style={[styles.gameModeButton, !supportsOnlineMode && styles.disabledButton]}
                onPress={handleCreateRoom}
                disabled={!supportsOnlineMode}
              >
                <LinearGradient
                  colors={supportsOnlineMode ? ['#4CAF50', '#66BB6A'] : ['#9E9E9E', '#BDBDBD']}
                  style={styles.gameModeButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons
                    name="add-circle"
                    size={16}
                    color={supportsOnlineMode ? 'white' : '#E0E0E0'}
                  />
                  <Text
                    style={[styles.gameModeButtonText, !supportsOnlineMode && { color: '#E0E0E0' }]}
                  >
                    {supportsOnlineMode
                      ? t('gameMode.createRoom', '创建房间')
                      : t('gameMode.onlineComingSoon', '在线模式 (敬请期待)')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  // 辅助函数
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '#4CAF50'
      case 'normal':
        return '#FF9500'
      case 'hard':
        return '#FF6B6B'
      case 'extreme':
        return '#9C27B0'
      default:
        return '#999999'
    }
  }

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return t('taskModal.difficulty.easy', '简单')
      case 'normal':
        return t('taskModal.difficulty.normal', '普通')
      case 'hard':
        return t('taskModal.difficulty.hard', '困难')
      case 'extreme':
        return t('taskModal.difficulty.extreme', '极限')
      default:
        return t('taskModal.difficulty.unknown', '未知')
    }
  }

  const getEstimatedTime = (taskCount: number) => {
    const minutes = taskCount * 2 // 假设每个任务2分钟
    if (minutes < 60) {
      return t('gameMode.estimatedTime.minutes', '约 {{minutes}} 分钟', { minutes })
    } else {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      if (remainingMinutes > 0) {
        return t('gameMode.estimatedTime.hours', '约 {{hours}}小时{{minutes}}分钟', {
          hours,
          minutes: remainingMinutes,
        })
      } else {
        return t('gameMode.estimatedTime.hoursOnly', '约 {{hours}}小时', { hours })
      }
    }
  }

  // 加入房间处理函数
  const handleJoinRoomFromHeader = () => {
    // 检查是否支持在线模式
    if (!supportsOnlineMode) {
      toast.info(t('gameMode.onlineNotSupported', '该游戏类型暂不支持在线模式'))
      return
    }

    // 跳转到加入房间页面
    router.push({
      pathname: '/join-room',
      params: {
        gameType: gameType,
        taskSetId: '', // 从标题栏进入，不指定任务集
      },
    })
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: getPageTitle(),
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.homeBackground,
          },
          headerTintColor: colors.homeTitle,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
          headerBackTitle: t('common.back', '返回'),
          headerRight: () =>
            isNetworkEnabled && supportsOnlineMode ? (
              <TouchableOpacity
                onPress={handleJoinRoomFromHeader}
                style={{
                  marginRight: 16,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor: colors.settingsAccent + '20',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Ionicons name="enter" size={18} color={colors.settingsAccent} />
                <Text
                  style={{
                    color: colors.settingsAccent,
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                >
                  {t('gameMode.joinRoom', '加入房间')}
                </Text>
              </TouchableOpacity>
            ) : null,
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.homeBackground }]}>
        {/* 背景渐变 */}
        <LinearGradient
          colors={[colors.homeGradientStart, colors.homeGradientMiddle, colors.homeGradientEnd]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* 装饰性背景元素 */}
        <View style={styles.decorativeContainer}>
          <Animated.View style={[styles.decorativeCircle1, floatingStyle]}>
            <LinearGradient
              colors={['#5E5CE6', '#BF5AF2']}
              style={styles.gradientCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>

          <Animated.View style={[styles.decorativeCircle2, floatingStyle]}>
            <LinearGradient
              colors={['#FF6482', '#FF9F40']}
              style={styles.gradientCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>
        </View>

        {/* 任务集列表 */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
          bounces={true}
          alwaysBounceVertical={true}
          keyboardShouldPersistTaps="handled"
          stickyHeaderIndices={[0]}
        >
          {/* 分类选择器 - 作为粘性头部 */}
          <CategorySelector />
          {filteredTaskSets.length > 0 ? (
            filteredTaskSets.map((taskSet, index) => (
              <TaskSetCard key={taskSet.id} taskSet={taskSet} index={index} />
            ))
          ) : (
            <Animated.View style={[styles.emptyState, fadeStyle]}>
              <View style={styles.emptyIconContainer}>
                <LinearGradient
                  colors={['#5E5CE6', '#BF5AF2']}
                  style={styles.emptyIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="game-controller-outline" size={48} color="white" />
                </LinearGradient>
              </View>
              <Text style={[styles.emptyText, { color: colors.homeCardTitle }]}>
                {t('gameMode.empty.title', '暂无可用的游戏模式')}
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.homeCardDescription }]}>
                {t('gameMode.empty.subtitle', '去任务管理页面添加一些任务集吧')}
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/(tabs)/tasks')}
              >
                <LinearGradient
                  colors={['#5E5CE6', '#BF5AF2']}
                  style={styles.emptyButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.emptyButtonText}>
                    {t('gameMode.empty.button', '去添加任务')}
                  </Text>
                  <Ionicons name="add" size={16} color="white" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>

        {/* TaskSet详情Modal */}
        <TaskSetDetailModal
          isEdit={false}
          visible={modalVisible}
          taskSet={selectedTaskSet}
          category={
            selectedTaskSet
              ? categories.find((cat) => cat.id === selectedTaskSet.categoryId) || null
              : null
          }
          onClose={() => setModalVisible(false)}
        />
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    ...CommonStyles.container, // 使用通用容器样式
  },
  decorativeContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: 100,
    left: -50,
    width: 150,
    height: 150,
  },
  gradientCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    opacity: 0.1,
  },
  headerContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  categoryContainer: {
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  categoryScrollContent: {
    paddingRight: 20,
  },
  categoryButton: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    height: 40,
    marginRight: 12,
  },
  categoryButtonActive: {
    borderWidth: 2,
  },
  categoryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: '100%',
    gap: 6,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    width: '100%',
  },
  contentContainer: {
    padding: Layout.padding.md,
    paddingBottom: 20,
  },
  taskSetCard: {
    marginBottom: 16,
  },
  cardContainer: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.8,
  },
  cardStats: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statText: {
    fontSize: 14,
    fontWeight: '500',
  },
  gameButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  gameModeButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  fullWidthButton: {
    flex: undefined,
    width: '100%',
  },
  disabledButton: {
    opacity: 0.6,
  },
  gameModeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  gameModeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 20,
  },
  emptyIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 6,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
})
