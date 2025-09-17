import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface MineTaskData {
    id: string;
    title: string;
    description?: string;
    playerName: string;
    playerColor: string;
    minePosition: { row: number; col: number };
}

interface MineTaskModalProps {
    visible: boolean;
    task: MineTaskData | null;
    onComplete: (completed: boolean) => void;
    onClose: () => void;
}

export default function MineTaskModal({
    visible,
    task,
    onComplete,
    onClose
}: MineTaskModalProps) {
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
            backdropOpacity.value = withTiming(1, { duration: 300 });
            modalScale.value = withSpring(1, {
                damping: 15,
                stiffness: 150
            });
            contentOpacity.value = withTiming(1, { duration: 400 });
        } else {
            // 关闭动画
            backdropOpacity.value = withTiming(0, { duration: 200 });
            modalScale.value = withTiming(0, { duration: 200 });
            contentOpacity.value = withTiming(0, { duration: 200 });
        }
    }, [visible]);

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value,
    }));

    const modalStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: modalScale.value },
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

        return {
            success: isCompleted,
            icon: isCompleted ? 'shield-checkmark' : 'close-circle',
            color: isCompleted ? '#4CAF50' : '#F44336',
            title: isCompleted ? '任务完成！' : '任务失败！',
            description: isCompleted
                ? '顺利完成挑战！'
                : '挑战失败了'
        };
    };

    if (!visible || !task) return null;

    const resultInfo = getResultInfo();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <Animated.View style={[styles.backdrop, backdropStyle]}>
                <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
            </Animated.View>

            <View style={styles.container}>
                <Animated.View style={[styles.modal, modalStyle]}>
                    <LinearGradient
                        colors={[colors.homeCardBackground, colors.homeCardBackground + 'F0']}
                        style={styles.modalContent}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        {!showResult ? (
                            // 任务展示界面
                            <>
                                {/* 踩雷提示头部 */}
                                <View style={styles.header}>
                                    <View style={[styles.mineIcon, { backgroundColor: '#F44336' + '20' }]}>
                                        <Text style={styles.mineEmoji}>💣</Text>
                                    </View>
                                    <Text style={[styles.headerTitle, { color: colors.homeCardTitle }]}>
                                        踩到地雷了！
                                    </Text>
                                    <Text style={[styles.headerSubtitle, { color: '#F44336' }]}>
                                        位置: ({task.minePosition.row + 1}, {task.minePosition.col + 1})
                                    </Text>
                                </View>

                                {/* 玩家信息 */}
                                <View style={styles.playerSection}>
                                    <Text style={[styles.sectionTitle, { color: colors.homeCardTitle }]}>
                                        挑战者
                                    </Text>
                                    <View style={[styles.playerCard, { backgroundColor: task.playerColor + '15' }]}>
                                        <View style={[styles.playerAvatar, { backgroundColor: task.playerColor }]}>
                                            <Text style={styles.playerAvatarText}>
                                                {task.playerName.charAt(0)}
                                            </Text>
                                        </View>
                                        <Text style={[styles.playerName, { color: colors.homeCardTitle }]}>
                                            {task.playerName}
                                        </Text>
                                    </View>
                                </View>

                                {/* 任务内容 */}
                                <View style={styles.taskSection}>
                                    <Text style={[styles.sectionTitle, { color: colors.homeCardTitle }]}>
                                        挑战任务
                                    </Text>
                                    <Text style={[styles.taskTitle, { color: colors.homeCardTitle }]}>
                                        {task.title}
                                    </Text>
                                    {task.description && (
                                        <Text style={[styles.taskDescription, { color: colors.homeCardDescription }]}>
                                            {task.description}
                                        </Text>
                                    )}
                                </View>

                                {/* 惩罚说明 */}
                                <View style={styles.penaltySection}>
                                    <View style={styles.penaltyCard}>
                                        <Text style={[styles.penaltyTitle, { color: '#F44336' }]}>
                                            ⚠️ 挑战说明
                                        </Text>
                                        <Text style={[styles.penaltyDescription, { color: colors.homeCardDescription }]}>
                                            • 踩雷后需要完成任务挑战{'\n'}
                                            • 任务完成与否不影响积分{'\n'}
                                            • 积分取决于获得的格子数量
                                        </Text>
                                    </View>
                                </View>

                                {/* 选择按钮 */}
                                <View style={styles.actionSection}>
                                    <Text style={[styles.actionPrompt, { color: colors.homeCardTitle }]}>
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
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                            >
                                                <Ionicons name="checkmark" size={20} color="white" />
                                                <Text style={styles.actionButtonText}>完成</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.actionButton}
                                            onPress={() => handleTaskChoice(false)}
                                            activeOpacity={0.8}
                                        >
                                            <LinearGradient
                                                colors={['#F44336', '#FF6B6B']}
                                                style={styles.actionButtonGradient}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                            >
                                                <Ionicons name="close" size={20} color="white" />
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
                                    <View style={[styles.resultIcon, { backgroundColor: resultInfo.color + '20' }]}>
                                        <Ionicons
                                            name={resultInfo.icon as any}
                                            size={48}
                                            color={resultInfo.color}
                                        />
                                    </View>

                                    <Text style={[styles.resultTitle, { color: colors.homeCardTitle }]}>
                                        {resultInfo.title}
                                    </Text>

                                    <Text style={[styles.resultDescription, { color: colors.homeCardDescription }]}>
                                        {resultInfo.description}
                                    </Text>

                                    <View style={styles.resultFooter}>
                                        <Text style={[styles.resultFooterText, { color: colors.homeCardDescription }]}>
                                            继续游戏...
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
        shadowOffset: { width: 0, height: 10 },
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
    mineIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    mineEmoji: {
        fontSize: 40,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
    playerSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    playerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 12,
    },
    playerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playerAvatarText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    playerName: {
        fontSize: 16,
        fontWeight: '600',
    },
    taskSection: {
        marginBottom: 20,
    },
    taskTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        lineHeight: 24,
        textAlign: 'center',
    },
    taskDescription: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        opacity: 0.8,
    },
    penaltySection: {
        marginBottom: 20,
    },
    penaltyCard: {
        backgroundColor: '#F44336' + '10',
        padding: 12,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#F44336',
    },
    penaltyTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    penaltyDescription: {
        fontSize: 12,
        lineHeight: 18,
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