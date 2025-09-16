import React, {useState, useEffect} from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useRouter, useLocalSearchParams, Stack} from 'expo-router';
import {useTranslation} from 'react-i18next';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
    interpolate,
    withRepeat,
    withSequence
} from 'react-native-reanimated';
import {LinearGradient} from 'expo-linear-gradient';
import {BlurView} from 'expo-blur';
import {Ionicons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useColorScheme} from '@/hooks/use-color-scheme';
import {Colors} from '@/constants/theme';
import {useTasksStore} from '@/store/tasksStore';
import {TaskCategory, TaskSet} from '@/types/tasks';

export default function GameMode() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const {t} = useTranslation();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme] as any;

    // 从store获取数据
    const {categories, taskSets} = useTasksStore();

    // 状态管理
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedTaskSet, setSelectedTaskSet] = useState<TaskSet | null>(null);

    // 动画值
    const floatAnimation = useSharedValue(0);
    const fadeAnimation = useSharedValue(0);

    useEffect(() => {
        floatAnimation.value = withRepeat(
            withSequence(
                withTiming(1, {duration: 3000}),
                withTiming(0, {duration: 3000})
            ),
            -1
        );
        fadeAnimation.value = withTiming(1, {duration: 800});
    }, []);

    const floatingStyle = useAnimatedStyle(() => ({
        transform: [
            {translateY: interpolate(floatAnimation.value, [0, 1], [0, -10])},
        ],
    }));

    const fadeStyle = useAnimatedStyle(() => ({
        opacity: fadeAnimation.value,
        transform: [
            {translateY: interpolate(fadeAnimation.value, [0, 1], [30, 0])},
        ],
    }));

    // 根据选中分类过滤任务集
    const filteredTaskSets = selectedCategory === 'all'
        ? taskSets.filter(set => set.isActive)
        : taskSets.filter(set => set.categoryId === selectedCategory && set.isActive);

    // 分类选择组件
    const CategorySelector = () => {
        return (
            <Animated.View style={[styles.categoryContainer, fadeStyle]}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryScrollContent}
                    style={styles.categoryScroll}
                    bounces={false}
                    decelerationRate="fast"
                    maintainVisibleContentPosition={{
                        minIndexForVisible: 0,
                        autoscrollToTopThreshold: 10,
                    }}
                >
                    <TouchableOpacity
                        style={[
                            styles.categoryButton,
                            selectedCategory === 'all' && styles.categoryButtonActive,
                            {
                                backgroundColor: selectedCategory === 'all'
                                    ? colors.settingsAccent + '20'
                                    : colors.homeCardBackground,
                                borderColor: selectedCategory === 'all'
                                    ? colors.settingsAccent
                                    : colors.homeCardBorder
                            }
                        ]}
                        onPress={() => setSelectedCategory('all')}
                        activeOpacity={0.7}
                    >
                        <LinearGradient
                            colors={selectedCategory === 'all' ? ['#5E5CE6', '#BF5AF2'] : [colors.homeCardBackground, colors.homeCardBackground]}
                            style={styles.categoryGradient}
                            start={{x: 0, y: 0}}
                            end={{x: 1, y: 1}}
                        >
                            <Ionicons
                                name="apps"
                                size={18}
                                color={selectedCategory === 'all' ? 'white' : colors.homeCardDescription}
                            />
                            <Text style={[
                                styles.categoryButtonText,
                                {
                                    color: selectedCategory === 'all'
                                        ? 'white'
                                        : colors.homeCardDescription
                                }
                            ]}>
                                全部
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
                                    backgroundColor: selectedCategory === category.id
                                        ? category.color + '20'
                                        : colors.homeCardBackground,
                                    borderColor: selectedCategory === category.id
                                        ? category.color
                                        : colors.homeCardBorder
                                }
                            ]}
                            onPress={() => setSelectedCategory(category.id)}
                            activeOpacity={0.7}
                        >
                            <LinearGradient
                                colors={selectedCategory === category.id ? [category.color, category.color + 'CC'] : [colors.homeCardBackground, colors.homeCardBackground]}
                                style={styles.categoryGradient}
                                start={{x: 0, y: 0}}
                                end={{x: 1, y: 1}}
                            >
                                <Ionicons
                                    name={category.icon as any}
                                    size={18}
                                    color={selectedCategory === category.id ? 'white' : colors.homeCardDescription}
                                />
                                <Text style={[
                                    styles.categoryButtonText,
                                    {
                                        color: selectedCategory === category.id
                                            ? 'white'
                                            : colors.homeCardDescription
                                    }
                                ]}>
                                    {category.name}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </Animated.View>
        );
    };

    // 任务集卡片组件
    const TaskSetCard = ({taskSet, index}: { taskSet: TaskSet, index: number }) => {
        const category = categories.find(cat => cat.id === taskSet.categoryId);
        const scale = useSharedValue(1);
        const cardAnimation = useSharedValue(0);

        const animatedStyle = useAnimatedStyle(() => ({
            transform: [{scale: scale.value}],
        }));

        const cardFadeStyle = useAnimatedStyle(() => ({
            opacity: cardAnimation.value,
            transform: [
                {translateY: interpolate(cardAnimation.value, [0, 1], [50, 0])},
            ],
        }));

        useEffect(() => {
            cardAnimation.value = withTiming(1, {duration: 600});
        }, []);

        const handlePressIn = () => {
            scale.value = withSpring(0.95);
        };

        const handlePressOut = () => {
            scale.value = withSpring(1);
        };

        const handlePress = () => {
            setSelectedTaskSet(taskSet);
            // TODO: 这里可以跳转到游戏界面或显示任务详情
            console.log('选择任务集:', taskSet.name);
        };

        return (
            <Animated.View style={[animatedStyle, cardFadeStyle, styles.taskSetCard]}>
                <TouchableOpacity
                    onPress={handlePress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    style={[styles.cardContainer, {
                        backgroundColor: colors.homeCardBackground,
                        borderColor: colors.homeCardBorder,
                        shadowColor: colorScheme === 'dark' ? '#000' : '#000',
                    }]}
                >
                    {/* 头部信息 */}
                    <View style={styles.cardHeader}>
                        <View style={styles.cardTitleRow}>
                            <View style={[
                                styles.difficultyBadge,
                                {backgroundColor: getDifficultyColor(taskSet.difficulty) + '15'}
                            ]}>
                                <Text style={[
                                    styles.difficultyText,
                                    {color: getDifficultyColor(taskSet.difficulty)}
                                ]}>
                                    {getDifficultyText(taskSet.difficulty)}
                                </Text>
                            </View>
                            {category && (
                                <View style={[styles.categoryBadge, {backgroundColor: category.color + '15'}]}>
                                    <Ionicons name={category.icon as any} size={12} color={category.color}/>
                                    <Text style={[styles.categoryText, {color: category.color}]}>
                                        {category.name}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.cardTitle, {color: colors.homeCardTitle}]}>
                            {taskSet.name}
                        </Text>
                        {taskSet.description && (
                            <Text style={[styles.cardDescription, {color: colors.homeCardDescription}]}>
                                {taskSet.description}
                            </Text>
                        )}
                    </View>

                    {/* 任务统计 */}
                    <View style={styles.cardStats}>
                        <View style={styles.statItem}>
                            <View style={[styles.statIcon, {backgroundColor: colors.settingsAccent + '15'}]}>
                                <Ionicons name="list" size={14} color={colors.settingsAccent}/>
                            </View>
                            <Text style={[styles.statText, {color: colors.homeCardDescription}]}>
                                {taskSet.tasks.length} 个任务
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <View style={[styles.statIcon, {backgroundColor: '#FF9500' + '15'}]}>
                                <Ionicons name="time" size={14} color="#FF9500"/>
                            </View>
                            <Text style={[styles.statText, {color: colors.homeCardDescription}]}>
                                {getEstimatedTime(taskSet.tasks.length)}
                            </Text>
                        </View>
                    </View>

                    {/* 开始按钮 */}
                    <TouchableOpacity
                        style={styles.startButton}
                        onPress={handlePress}
                    >
                        <LinearGradient
                            colors={['#5E5CE6', '#BF5AF2']}
                            style={styles.startButtonGradient}
                            start={{x: 0, y: 0}}
                            end={{x: 1, y: 1}}
                        >
                            <Text style={styles.startButtonText}>开始游戏</Text>
                            <Ionicons name="play" size={16} color="white"/>
                        </LinearGradient>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    // 辅助函数
    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy':
                return '#4CAF50';
            case 'normal':
                return '#FF9500';
            case 'hard':
                return '#FF6B6B';
            case 'extreme':
                return '#9C27B0';
            default:
                return '#999999';
        }
    };

    const getDifficultyText = (difficulty: string) => {
        switch (difficulty) {
            case 'easy':
                return '简单';
            case 'normal':
                return '普通';
            case 'hard':
                return '困难';
            case 'extreme':
                return '极限';
            default:
                return '未知';
        }
    };

    const getEstimatedTime = (taskCount: number) => {
        const minutes = taskCount * 2; // 假设每个任务2分钟
        if (minutes < 60) {
            return `约 ${minutes} 分钟`;
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return `约 ${hours}小时${remainingMinutes > 0 ? remainingMinutes + '分钟' : ''}`;
        }
    };

    return (
        <>
            <Stack.Screen
                options={{
                    title: '任务选择',
                    headerShown: true,
                    headerStyle: {
                        backgroundColor: colors.homeBackground,
                    },
                    headerTintColor: colors.homeTitle,
                    headerTitleStyle: {
                        fontWeight: '600',
                        fontSize: 18,
                    },
                    headerBackTitle: '返回',
                }}
            />
            <View style={[styles.container, {backgroundColor: colors.homeBackground}]}>
                {/* 背景渐变 */}
                <LinearGradient
                    colors={[colors.homeGradientStart, colors.homeGradientMiddle, colors.homeGradientEnd]}
                    style={StyleSheet.absoluteFillObject}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                />

                {/* 装饰性背景元素 */}
                <View style={styles.decorativeContainer}>
                    <Animated.View style={[styles.decorativeCircle1, floatingStyle]}>
                        <LinearGradient
                            colors={['#5E5CE6', '#BF5AF2']}
                            style={styles.gradientCircle}
                            start={{x: 0, y: 0}}
                            end={{x: 1, y: 1}}
                        />
                    </Animated.View>

                    <Animated.View style={[styles.decorativeCircle2, floatingStyle]}>
                        <LinearGradient
                            colors={['#FF6482', '#FF9F40']}
                            style={styles.gradientCircle}
                            start={{x: 0, y: 0}}
                            end={{x: 1, y: 1}}
                        />
                    </Animated.View>
                </View>

                {/* 分类选择器 */}
                <CategorySelector/>

                {/* 任务集列表 */}
                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.contentContainer}
                    bounces={true}
                    alwaysBounceVertical={true}
                    keyboardShouldPersistTaps="handled"
                >
                    {filteredTaskSets.length > 0 ? (
                        filteredTaskSets.map((taskSet, index) => (
                            <TaskSetCard key={taskSet.id} taskSet={taskSet} index={index}/>
                        ))
                    ) : (
                        <Animated.View style={[styles.emptyState, fadeStyle]}>
                            <View style={styles.emptyIconContainer}>
                                <LinearGradient
                                    colors={['#5E5CE6', '#BF5AF2']}
                                    style={styles.emptyIconGradient}
                                    start={{x: 0, y: 0}}
                                    end={{x: 1, y: 1}}
                                >
                                    <Ionicons name="game-controller-outline" size={48} color="white"/>
                                </LinearGradient>
                            </View>
                            <Text style={[styles.emptyText, {color: colors.homeCardTitle}]}>
                                暂无可用的游戏模式
                            </Text>
                            <Text style={[styles.emptySubtext, {color: colors.homeCardDescription}]}>
                                去任务管理页面添加一些任务集吧
                            </Text>
                            <TouchableOpacity
                                style={styles.emptyButton}
                                onPress={() => router.push('/(tabs)/tasks')}
                            >
                                <LinearGradient
                                    colors={['#5E5CE6', '#BF5AF2']}
                                    style={styles.emptyButtonGradient}
                                    start={{x: 0, y: 0}}
                                    end={{x: 1, y: 1}}
                                >
                                    <Text style={styles.emptyButtonText}>去添加任务</Text>
                                    <Ionicons name="add" size={16} color="white"/>
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                </ScrollView>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    decorativeContainer: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        left: 0,
        right: 0,
        overflow: "hidden"
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
        marginBottom: 20,
    },
    categoryScroll: {
        paddingHorizontal: 20,
    },
    categoryScrollContent: {
        paddingRight: 20,
    },
    categoryButton: {
        borderRadius: 20,
        marginRight: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    categoryButtonActive: {
        borderWidth: 2,
    },
    categoryGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 6,
    },
    categoryButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    taskSetCard: {
        marginBottom: 16,
    },
    cardContainer: {
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        shadowOffset: {width: 0, height: 8},
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
    startButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 4,
    },
    startButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
    },
    startButtonText: {
        color: 'white',
        fontSize: 16,
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
});