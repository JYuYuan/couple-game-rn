import React, {useEffect, useState} from 'react';
import {Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import {LinearGradient} from 'expo-linear-gradient';
import {Ionicons} from '@expo/vector-icons';
import {BlurView} from 'expo-blur';
import {useColorScheme} from '@/hooks/use-color-scheme';
import {Colors} from '@/constants/theme';
import {GamePlayer} from '@/hooks/use-game-players';
import {useTranslation} from 'react-i18next';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface GameTask {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    reward?: number;
}

interface VictoryModalProps {
    visible: boolean;
    winner: GamePlayer | null;
    availableTasks: GameTask[];
    onTasksSelected: (selectedTasks: GameTask[]) => void;
    onRestart: () => void;
    onExit: () => void;
    onClose: () => void;
}

export default function VictoryModal({
    visible,
    winner,
    availableTasks,
    onTasksSelected,
    onRestart,
    onExit,
    onClose
}: VictoryModalProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme] as any;
    const { t } = useTranslation();

    const [selectedTasks, setSelectedTasks] = useState<GameTask[]>([]);
    const [showTaskSelection, setShowTaskSelection] = useState(false);
    const [tasksCompleted, setTasksCompleted] = useState(false);

    // 动画值
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);
    const confettiScale = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            // 重置状态
            setSelectedTasks([]);
            setShowTaskSelection(false);
            setTasksCompleted(false);

            // 直接设置为显示状态，不使用动画
            opacity.value = 1;
            scale.value = 1;
            confettiScale.value = 1;
        } else {
            // 直接设置为隐藏状态，不使用动画
            opacity.value = 0;
            scale.value = 1;
            confettiScale.value = 1;
        }
    }, [visible]);

    const modalStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }]
    }));

    const confettiStyle = useAnimatedStyle(() => ({
        transform: [{ scale: confettiScale.value }]
    }));

    const toggleTaskSelection = (task: GameTask) => {
        setSelectedTasks(prev => {
            const isSelected = prev.some(t => t.id === task.id);
            if (isSelected) {
                return prev.filter(t => t.id !== task.id);
            } else if (prev.length < 3) {
                return [...prev, task];
            }
            return prev;
        });
    };

    const handleConfirm = () => {
        onTasksSelected(selectedTasks);
        setTasksCompleted(true);
    };

    const handleStartTaskSelection = () => {
        setShowTaskSelection(true);
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return '#4CAF50';
            case 'normal': return '#FF9500';
            case 'hard': return '#FF6B6B';
            case 'extreme': return '#9C27B0';
            default: return '#999999';
        }
    };

    const getDifficultyText = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return t('taskModal.difficulty.easy', '简单');
            case 'normal': return t('taskModal.difficulty.normal', '普通');
            case 'hard': return t('taskModal.difficulty.hard', '困难');
            case 'extreme': return t('taskModal.difficulty.extreme', '极限');
            default: return t('taskModal.difficulty.unknown', '未知');
        }
    };

    if (!winner) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
        >
            <BlurView intensity={20} style={StyleSheet.absoluteFillObject}>
                <View style={styles.overlay}>
                    <Animated.View style={[styles.modalContainer, modalStyle]}>
                        {/* 庆祝背景 */}
                        <Animated.View style={[styles.confettiContainer, confettiStyle]}>
                            <View style={[styles.confetti, { backgroundColor: '#FFD700', top: 20, left: 30 }]} />
                            <View style={[styles.confetti, { backgroundColor: '#FF6B6B', top: 40, right: 40 }]} />
                            <View style={[styles.confetti, { backgroundColor: '#4ECDC4', top: 60, left: 60 }]} />
                            <View style={[styles.confetti, { backgroundColor: '#45B7D1', top: 80, right: 80 }]} />
                            <View style={[styles.confetti, { backgroundColor: '#96CEB4', bottom: 60, left: 40 }]} />
                            <View style={[styles.confetti, { backgroundColor: '#FFEAA7', bottom: 80, right: 60 }]} />
                        </Animated.View>

                        <LinearGradient
                            colors={[colors.homeCardBackground, colors.homeCardBackground + 'F0']}
                            style={[styles.modal, { borderColor: colors.homeCardBorder }]}
                        >
                            {!showTaskSelection ? (
                                // 胜利庆祝界面
                                <View style={styles.victoryContent}>
                                    {/* 胜利标题 */}
                                    <View style={styles.victoryHeader}>
                                        <View style={styles.crownContainer}>
                                            <LinearGradient
                                                colors={['#FFD700', '#FFA500']}
                                                style={styles.crownGradient}
                                            >
                                                <Text style={styles.crownEmoji}>👑</Text>
                                            </LinearGradient>
                                        </View>

                                        <Text style={[styles.victoryTitle, { color: colors.homeCardTitle }]}>
                                            {t('victoryModal.gameWin', '🎉 游戏胜利！🎉')}
                                        </Text>

                                        <View style={[styles.winnerCard, { backgroundColor: winner.color + '15' }]}>
                                            <View style={[styles.winnerAvatar, { backgroundColor: winner.color }]}>
                                                <Text style={styles.winnerAvatarText}>{winner.name.charAt(0)}</Text>
                                            </View>
                                            <View style={styles.winnerInfo}>
                                                <Text style={[styles.winnerName, { color: colors.homeCardTitle }]}>
                                                    {winner.name}
                                                </Text>
                                                <Text style={[styles.winnerSubtext, { color: colors.homeCardDescription }]}>
                                                    {t('victoryModal.congratulations', '恭喜获得胜利！')}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* 奖励说明 */}
                                    <View style={styles.rewardSection}>
                                        <Text style={[styles.rewardTitle, { color: colors.homeCardTitle }]}>
                                            {t('victoryModal.victoryReward', '🎁 胜利者奖励')}
                                        </Text>
                                        <Text style={[styles.rewardDescription, { color: colors.homeCardDescription }]}>
                                            {t('victoryModal.rewardDescription', '作为胜利者，你可以从以下任务中选择3个作为奖励！')}
                                        </Text>
                                    </View>

                                    {/* 按钮区域 */}
                                    <View style={styles.buttonContainer}>
                                        <TouchableOpacity
                                            style={styles.primaryButton}
                                            onPress={handleStartTaskSelection}
                                        >
                                            <LinearGradient
                                                colors={['#4CAF50', '#66BB6A']}
                                                style={styles.primaryButtonGradient}
                                            >
                                                <Ionicons name="gift" size={20} color="white" />
                                                <Text style={styles.primaryButtonText}>{t('victoryModal.selectRewardTasks', '选择奖励任务')}</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.secondaryButton, { borderColor: colors.homeCardBorder }]}
                                            onPress={onClose}
                                        >
                                            <Text style={[styles.secondaryButtonText, { color: colors.homeCardDescription }]}>
                                                {t('victoryModal.selectLater', '稍后选择')}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : !tasksCompleted ? (
                                // 任务选择界面
                                <View style={styles.taskSelectionContent}>
                                    <View style={styles.selectionHeader}>
                                        <TouchableOpacity
                                            style={styles.backButton}
                                            onPress={() => setShowTaskSelection(false)}
                                        >
                                            <Ionicons name="arrow-back" size={24} color={colors.homeCardTitle} />
                                        </TouchableOpacity>

                                        <View style={styles.selectionTitleContainer}>
                                            <Text style={[styles.selectionTitle, { color: colors.homeCardTitle }]}>
                                                {t('victoryModal.selectRewardTasksTitle', '选择奖励任务')}
                                            </Text>
                                            <Text style={[styles.selectionSubtitle, { color: colors.homeCardDescription }]}>
                                                {t('victoryModal.selectedCount', '已选择 {{count}}/3 个任务', { count: selectedTasks.length })}
                                            </Text>
                                        </View>
                                    </View>

                                    <ScrollView
                                        style={styles.taskList}
                                        showsVerticalScrollIndicator={false}
                                    >
                                        {availableTasks.map((task) => {
                                            const isSelected = selectedTasks.some(t => t.id === task.id);
                                            return (
                                                <TouchableOpacity
                                                    key={task.id}
                                                    style={[
                                                        styles.taskItem,
                                                        {
                                                            backgroundColor: isSelected
                                                                ? colors.settingsAccent + '15'
                                                                : colors.homeBackground,
                                                            borderColor: isSelected
                                                                ? colors.settingsAccent
                                                                : colors.homeCardBorder
                                                        }
                                                    ]}
                                                    onPress={() => toggleTaskSelection(task)}
                                                    disabled={!isSelected && selectedTasks.length >= 3}
                                                >
                                                    <View style={styles.taskHeader}>
                                                        <View style={[
                                                            styles.difficultyBadge,
                                                            { backgroundColor: getDifficultyColor(task.difficulty) + '15' }
                                                        ]}>
                                                            <Text style={[
                                                                styles.difficultyText,
                                                                { color: getDifficultyColor(task.difficulty) }
                                                            ]}>
                                                                {getDifficultyText(task.difficulty)}
                                                            </Text>
                                                        </View>

                                                        <View style={[
                                                            styles.selectionIndicator,
                                                            {
                                                                backgroundColor: isSelected
                                                                    ? colors.settingsAccent
                                                                    : colors.homeCardBorder
                                                            }
                                                        ]}>
                                                            {isSelected && (
                                                                <Ionicons name="checkmark" size={16} color="white" />
                                                            )}
                                                        </View>
                                                    </View>

                                                    <Text style={[styles.taskTitle, { color: colors.homeCardTitle }]}>
                                                        {task.title}
                                                    </Text>

                                                    {task.description && (
                                                        <Text style={[styles.taskDescription, { color: colors.homeCardDescription }]}>
                                                            {task.description}
                                                        </Text>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>

                                    <View style={styles.selectionButtons}>
                                        <TouchableOpacity
                                            style={[
                                                styles.confirmButton,
                                                { opacity: selectedTasks.length > 0 ? 1 : 0.5 }
                                            ]}
                                            onPress={handleConfirm}
                                            disabled={selectedTasks.length === 0}
                                        >
                                            <LinearGradient
                                                colors={selectedTasks.length > 0
                                                    ? ['#4CAF50', '#66BB6A']
                                                    : ['#CCCCCC', '#AAAAAA']
                                                }
                                                style={styles.confirmButtonGradient}
                                            >
                                                <Ionicons name="checkmark-circle" size={20} color="white" />
                                                <Text style={styles.confirmButtonText}>
                                                    {t('victoryModal.confirmSelection', '确认选择 ({{count}})', { count: selectedTasks.length })}
                                                </Text>
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                // 游戏结束选项界面
                                <View style={styles.gameEndContent}>
                                    <View style={styles.gameEndHeader}>
                                        <Text style={[styles.gameEndTitle, { color: colors.homeCardTitle }]}>
                                            {t('victoryModal.rewardReceived', '🎊 任务奖励已获得！')}
                                        </Text>
                                        <Text style={[styles.gameEndSubtitle, { color: colors.homeCardDescription }]}>
                                            {t('victoryModal.selectedTasksCount', '你已成功选择了 {{count}} 个奖励任务', { count: selectedTasks.length })}
                                        </Text>
                                    </View>

                                    {/* 选中的任务列表 */}
                                    <View style={styles.selectedTasksList}>
                                        <Text style={[styles.selectedTasksTitle, { color: colors.homeCardTitle }]}>
                                            {t('victoryModal.rewardTasks', '获得的奖励任务：')}
                                        </Text>
                                        {selectedTasks.map((task, index) => (
                                            <View key={task.id} style={[styles.selectedTaskItem, { backgroundColor: colors.homeBackground }]}>
                                                <Text style={[styles.selectedTaskNumber, { color: colors.settingsAccent }]}>
                                                    {index + 1}.
                                                </Text>
                                                <Text style={[styles.selectedTaskTitle, { color: colors.homeCardTitle }]}>
                                                    {task.title}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>

                                    {/* 游戏结束按钮 */}
                                    <View style={styles.gameEndButtons}>
                                        <TouchableOpacity
                                            style={styles.gameEndButton}
                                            onPress={onRestart}
                                        >
                                            <LinearGradient
                                                colors={['#4CAF50', '#66BB6A']}
                                                style={styles.gameEndButtonGradient}
                                            >
                                                <Ionicons name="refresh" size={20} color="white" />
                                                <Text style={styles.gameEndButtonText}>{t('victoryModal.restart', '重新开始')}</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.gameEndButton}
                                            onPress={onExit}
                                        >
                                            <LinearGradient
                                                colors={['#FF6B6B', '#FF8A80']}
                                                style={styles.gameEndButtonGradient}
                                            >
                                                <Ionicons name="exit" size={20} color="white" />
                                                <Text style={styles.gameEndButtonText}>{t('victoryModal.exitGame', '退出游戏')}</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </LinearGradient>
                    </Animated.View>
                </View>
            </BlurView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        width: '100%',
        maxWidth: 400,
        maxHeight: SCREEN_HEIGHT * 0.85,
    },
    confettiContainer: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        zIndex: -1,
    },
    confetti: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    modal: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    victoryContent: {
        padding: 24,
    },
    victoryHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    crownContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        overflow: 'hidden',
        marginBottom: 16,
    },
    crownGradient: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    crownEmoji: {
        fontSize: 36,
    },
    victoryTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    winnerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    winnerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    winnerAvatarText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    winnerInfo: {
        flex: 1,
    },
    winnerName: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    winnerSubtext: {
        fontSize: 14,
        opacity: 0.8,
    },
    rewardSection: {
        marginBottom: 24,
    },
    rewardTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    rewardDescription: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        opacity: 0.8,
    },
    buttonContainer: {
        gap: 12,
    },
    primaryButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    primaryButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        borderRadius: 12,
        borderWidth: 1,
        paddingVertical: 16,
        alignItems: 'center',
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },
    taskSelectionContent: {
        height: SCREEN_HEIGHT * 0.8,
    },
    selectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    backButton: {
        padding: 8,
        marginRight: 12,
    },
    selectionTitleContainer: {
        flex: 1,
    },
    selectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    selectionSubtitle: {
        fontSize: 14,
        opacity: 0.7,
    },
    taskList: {
        flex: 1,
        padding: 20,
    },
    taskItem: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    taskHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
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
    selectionIndicator: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 6,
    },
    taskDescription: {
        fontSize: 14,
        lineHeight: 18,
        opacity: 0.8,
    },
    selectionButtons: {
        padding: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
    confirmButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    confirmButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    confirmButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    gameEndContent: {
        padding: 24,
    },
    gameEndHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    gameEndTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    gameEndSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        opacity: 0.8,
    },
    selectedTasksList: {
        marginBottom: 24,
    },
    selectedTasksTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
    },
    selectedTaskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        gap: 8,
    },
    selectedTaskNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        minWidth: 20,
    },
    selectedTaskTitle: {
        fontSize: 14,
        flex: 1,
    },
    gameEndButtons: {
        gap: 12,
    },
    gameEndButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    gameEndButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    gameEndButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});