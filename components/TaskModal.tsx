import React, {useState, useEffect} from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Alert
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    interpolate,
    runOnJS
} from 'react-native-reanimated';
import {LinearGradient} from 'expo-linear-gradient';
import {BlurView} from 'expo-blur';
import {Ionicons} from '@expo/vector-icons';
import {useColorScheme} from '@/hooks/use-color-scheme';
import {Colors} from '@/constants/theme';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

export interface TaskModalData {
    id: string;
    title: string;
    description: string;
    type: 'trap' | 'star' | 'collision';
    executor: 'current' | 'opponent';
    category: string;
    difficulty: string;
    triggerPlayerId: number;
    executorPlayerId: number;
}

interface TaskModalProps {
    visible: boolean;
    task: TaskModalData | null;
    currentPlayer: {
        id: number;
        name: string;
        color: string;
    } | null;
    opponentPlayer: {
        id: number;
        name: string;
        color: string;
    } | null;
    onComplete: (completed: boolean) => void;
    onClose: () => void;
}

export default function TaskModal({
                                      visible,
                                      task,
                                      currentPlayer,
                                      opponentPlayer,
                                      onComplete,
                                      onClose
                                  }: TaskModalProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme] as any;

    const [isCompleted, setIsCompleted] = useState<boolean | null>(null);
    const [showResult, setShowResult] = useState(false);

    // 动画值
    const modalScale = useSharedValue(0);
    const backdropOpacity = useSharedValue(0);
    const contentOpacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            // 重置状态
            setIsCompleted(null);
            setShowResult(false);

            // 开始动画
            backdropOpacity.value = withTiming(1, {duration: 300});
            modalScale.value = withSpring(1, {
                damping: 15,
                stiffness: 150
            });
            contentOpacity.value = withTiming(1, {duration: 400});
        } else {
            // 关闭动画
            backdropOpacity.value = withTiming(0, {duration: 200});
            modalScale.value = withTiming(0, {duration: 200});
            contentOpacity.value = withTiming(0, {duration: 200});
        }
    }, [visible]);

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value,
    }));

    const modalStyle = useAnimatedStyle(() => ({
        transform: [
            {scale: modalScale.value},
            {
                translateY: interpolate(
                    modalScale.value,
                    [0, 1],
                    [50, 0]
                )
            }
        ],
        opacity: contentOpacity.value,
    }));

    // 获取任务类型信息
    const getTaskTypeInfo = () => {
        if (!task) return {icon: 'help', color: '#999', title: '未知任务'};

        switch (task.type) {
            case 'trap':
                return {
                    icon: 'nuclear',
                    color: '#FF6B6B',
                    title: '陷阱挑战',
                    description: '踩到陷阱！需要完成任务才能继续前进'
                };
            case 'star':
                return {
                    icon: 'star',
                    color: '#FFD700',
                    title: '幸运任务',
                    description: '获得幸运机会！完成任务获得额外奖励'
                };
            case 'collision':
                return {
                    icon: 'flash',
                    color: '#9C27B0',
                    title: '碰撞挑战',
                    description: '发生碰撞！需要通过挑战来决定去留'
                };
            default:
                return {
                    icon: 'help',
                    color: '#999',
                    title: '普通任务'
                };
        }
    };

    // 获取执行者信息
    const getExecutor = () => {
        if (!task || !currentPlayer) return null;

        return task.executor === 'current' ? currentPlayer : opponentPlayer;
    };

    // 获取难度颜色
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

    // 获取难度文本
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

    // 处理任务完成选择
    const handleTaskChoice = (completed: boolean) => {
        setIsCompleted(completed);
        setShowResult(true);

        // 延迟执行回调
        setTimeout(() => {
            onComplete(completed);
        }, 1500);
    };

    // 获取结果信息
    const getResultInfo = () => {
        if (!task || isCompleted === null) return null;

        const taskTypeInfo = getTaskTypeInfo();

        if (task.type === 'trap') {
            // 陷阱任务：完成前进3-6格，未完成后退3-6格
            return {
                success: isCompleted,
                icon: isCompleted ? 'checkmark-circle' : 'close-circle',
                color: isCompleted ? '#4CAF50' : '#FF6B6B',
                title: isCompleted ? '任务完成！' : '任务失败！',
                description: isCompleted
                    ? '获得奖励：前进 3-6 格'
                    : '受到惩罚：后退 3-6 格'
            };
        } else if (task.type === 'star') {
            // 幸运任务：完成前进3-6格，未完成后退3-6格
            return {
                success: isCompleted,
                icon: isCompleted ? 'trophy' : 'sad',
                color: isCompleted ? '#FFD700' : '#FF6B6B',
                title: isCompleted ? '幸运加成！' : '错失机会！',
                description: isCompleted
                    ? '幸运奖励：前进 3-6 格'
                    : '遗憾惩罚：后退 3-6 格'
            };
        } else if (task.type === 'collision') {
            // 碰撞任务：完成停留原地，未完成回到起点
            return {
                success: isCompleted,
                icon: isCompleted ? 'shield-checkmark' : 'arrow-back',
                color: isCompleted ? '#4CAF50' : '#FF6B6B',
                title: isCompleted ? '成功防御！' : '碰撞失败！',
                description: isCompleted
                    ? '保持位置不变'
                    : '回到起点重新开始'
            };
        }

        return null;
    };

    if (!visible || !task) return null;

    const taskTypeInfo = getTaskTypeInfo();
    const executor = getExecutor();
    const resultInfo = getResultInfo();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <Animated.View style={[styles.backdrop, backdropStyle]}>
                <BlurView intensity={20} style={StyleSheet.absoluteFillObject}/>
            </Animated.View>

            <View style={styles.container}>
                <Animated.View style={[styles.modal, modalStyle]}>
                    <LinearGradient
                        colors={[colors.homeCardBackground, colors.homeCardBackground + 'F0']}
                        style={styles.modalContent}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 1}}
                    >
                        {!showResult ? (
                            // 任务展示界面
                            <>
                                {/* 任务类型头部 */}
                                <View style={styles.header}>
                                    <View style={[styles.typeIcon, {backgroundColor: taskTypeInfo.color + '20'}]}>
                                        <Ionicons
                                            name={taskTypeInfo.icon as any}
                                            size={32}
                                            color={taskTypeInfo.color}
                                        />
                                    </View>
                                    <Text style={[styles.typeTitle, {color: colors.homeCardTitle}]}>
                                        {taskTypeInfo.title}
                                    </Text>
                                    <Text style={[styles.typeDescription, {color: colors.homeCardDescription}]}>
                                        {taskTypeInfo.description}
                                    </Text>
                                </View>

                                {/* 执行者信息 */}
                                {executor && (
                                    <View style={styles.executorSection}>
                                        <Text style={[styles.sectionTitle, {color: colors.homeCardTitle}]}>
                                            执行者
                                        </Text>
                                        <View style={[styles.executorCard, {backgroundColor: executor.color + '15'}]}>
                                            <View style={[styles.executorAvatar, {backgroundColor: executor.color}]}>
                                                <Text style={styles.executorAvatarText}>
                                                    {executor.id === 1 ? '✈️' : '🚁'}
                                                </Text>
                                            </View>
                                            <Text style={[styles.executorName, {color: colors.homeCardTitle}]}>
                                                {executor.name}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* 任务内容 */}
                                <View style={styles.taskSection}>
                                    <View style={styles.taskHeader}>
                                        <Text style={[styles.sectionTitle, {color: colors.homeCardTitle}]}>
                                            任务内容
                                        </Text>
                                        <View
                                            style={[styles.difficultyBadge, {backgroundColor: getDifficultyColor(task.difficulty) + '15'}]}>
                                            <Text
                                                style={[styles.difficultyText, {color: getDifficultyColor(task.difficulty)}]}>
                                                {getDifficultyText(task.difficulty)}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={[styles.taskTitle, {color: colors.homeCardTitle}]}>
                                        {task.title}
                                    </Text>

                                    {task.description && (
                                        <Text style={[styles.taskDescription, {color: colors.homeCardDescription}]}>
                                            {task.description}
                                        </Text>
                                    )}
                                </View>

                                {/* 选择按钮 */}
                                <View style={styles.actionSection}>
                                    <Text style={[styles.actionPrompt, {color: colors.homeCardTitle}]}>
                                        请选择任务完成情况：
                                    </Text>

                                    <View style={styles.actionButtons}>
                                        <TouchableOpacity
                                            style={styles.actionButton}
                                            onPress={() => handleTaskChoice(true)}
                                            activeOpacity={0.8}
                                        >
                                            <LinearGradient
                                                colors={['#4CAF50', '#66BB6A']}
                                                style={styles.actionButtonGradient}
                                                start={{x: 0, y: 0}}
                                                end={{x: 1, y: 1}}
                                            >
                                                <Ionicons name="checkmark" size={20} color="white"/>
                                                <Text style={styles.actionButtonText}>完成</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.actionButton}
                                            onPress={() => handleTaskChoice(false)}
                                            activeOpacity={0.8}
                                        >
                                            <LinearGradient
                                                colors={['#FF6B6B', '#FF8A80']}
                                                style={styles.actionButtonGradient}
                                                start={{x: 0, y: 0}}
                                                end={{x: 1, y: 1}}
                                            >
                                                <Ionicons name="close" size={20} color="white"/>
                                                <Text style={styles.actionButtonText}>未完成</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </>
                        ) : (
                            // 结果展示界面
                            resultInfo && (
                                <View style={styles.resultContainer}>
                                    <View style={[styles.resultIcon, {backgroundColor: resultInfo.color + '20'}]}>
                                        <Ionicons
                                            name={resultInfo.icon as any}
                                            size={48}
                                            color={resultInfo.color}
                                        />
                                    </View>

                                    <Text style={[styles.resultTitle, {color: colors.homeCardTitle}]}>
                                        {resultInfo.title}
                                    </Text>

                                    <Text style={[styles.resultDescription, {color: colors.homeCardDescription}]}>
                                        {resultInfo.description}
                                    </Text>

                                    <View style={styles.resultFooter}>
                                        <Text style={[styles.resultFooterText, {color: colors.homeCardDescription}]}>
                                            正在执行中...
                                        </Text>
                                    </View>
                                </View>
                            )
                        )}
                    </LinearGradient>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modal: {
        width: Math.min(screenWidth - 40, 400),
        maxHeight: screenHeight * 0.8,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 10},
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 20,
    },
    modalContent: {
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    typeIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    typeTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    typeDescription: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    executorSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    executorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 12,
    },
    executorAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    executorAvatarText: {
        fontSize: 18,
    },
    executorName: {
        fontSize: 16,
        fontWeight: '600',
    },
    taskSection: {
        marginBottom: 24,
    },
    taskHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    difficultyBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    difficultyText: {
        fontSize: 12,
        fontWeight: '600',
    },
    taskTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        lineHeight: 24,
    },
    taskDescription: {
        fontSize: 14,
        lineHeight: 20,
        opacity: 0.8,
    },
    actionSection: {
        alignItems: 'center',
    },
    actionPrompt: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'center',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    actionButton: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    actionButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
    },
    actionButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    resultContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    resultIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    resultTitle: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    resultDescription: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    resultFooter: {
        marginTop: 10,
    },
    resultFooterText: {
        fontSize: 14,
        fontStyle: 'italic',
    },
});