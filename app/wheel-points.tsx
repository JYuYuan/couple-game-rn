import React, {useEffect, useRef, useState} from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Stack, useLocalSearchParams, useRouter} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import {Ionicons} from '@expo/vector-icons';
import {useColorScheme} from '@/hooks/use-color-scheme';
import {Colors} from '@/constants/theme';
import WheelOfFortune, {WheelOfFortuneRef} from '@/components/WheelOfFortune';
import SimpleTaskModal, {SimpleTaskData} from '@/components/SimpleTaskModal';
import VictoryModal from '@/components/VictoryModal';
import {CustomAlert} from '@/components/CustomAlert';
import {PlayerAvatar} from '@/components/PlayerAvatar';
import {useGameTasks} from '@/hooks/use-game-tasks';
import {useWheelGame, WheelPlayer, WheelResult} from '@/hooks/use-wheel-game';
import {useTranslation} from 'react-i18next';

export default function WheelPointsGame() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useLocalSearchParams();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme] as any;
    const wheelRef = useRef<WheelOfFortuneRef>(null);

    // 获取传入的参数
    const taskSetId = params.taskSetId as string;

    // 使用hooks
    const gameTasks = useGameTasks(taskSetId);
    const wheelGame = useWheelGame();
    const {
        players,
        currentPlayerIndex,
        currentPlayer,
        gameStatus,
        rounds,
        winningScore,
        startGame,
        resetGame,
        nextPlayer,
        updatePlayerScore,
        completeTask,
        checkWinCondition,
        applyWheelResult,
        generateRandomScore,
        isGameActive
    } = wheelGame;

    // 游戏状态
    const [isSpinning, setIsSpinning] = useState(false);
    const [pendingWheelResult, setPendingWheelResult] = useState<WheelResult | null>(null);

    // 简单任务弹窗状态
    const [showSimpleTaskModal, setShowSimpleTaskModal] = useState(false);
    const [simpleTaskData, setSimpleTaskData] = useState<SimpleTaskData | null>(null);

    // 胜利弹窗状态
    const [showVictoryModal, setShowVictoryModal] = useState(false);
    const [winner, setWinner] = useState<WheelPlayer | null>(null);

    // 自定义弹窗状态
    const [showAlert, setShowAlert] = useState(false);
    const [alertData, setAlertData] = useState<{
        title: string;
        message: string;
        buttons: { text: string; onPress: () => void; style?: 'default' | 'cancel' | 'destructive' }[];
    }>({ title: '', message: '', buttons: [] });

    // 进入页面时自动开始游戏
    useEffect(() => {
        if (gameStatus === 'waiting' && gameTasks.selectedTaskSet) {
            startGame();
        }
    }, [gameStatus, gameTasks.selectedTaskSet, startGame]);

    // 处理胜利
    const handleVictory = (victoryPlayer: WheelPlayer) => {
        console.log('游戏胜利！获胜者:', victoryPlayer.name, '分数:', victoryPlayer.score);
        setWinner(victoryPlayer);
        setShowVictoryModal(true);
    };


    // 重置游戏
    const handleResetGame = () => {
        resetGame();
        setIsSpinning(false);
        setShowSimpleTaskModal(false);
        setSimpleTaskData(null);
        setPendingWheelResult(null);
    };

    // 转盘旋转
    const handleSpin = () => {
        if (isSpinning || !isGameActive) return;

        setIsSpinning(true);
        wheelRef.current?.spin();
    };

    // 转盘结果处理
    const handleSpinComplete = (result: WheelResult) => {
        console.log('转盘结果:', result);
        setIsSpinning(false);

        // 显示结果提示
        setAlertData({
            title: t('wheelPoints.wheelResult', '转盘结果'),
            message: t('wheelPoints.resultMessage', '{{playerName}} 转到了: {{result}}', { playerName: currentPlayer.name, result: result.label }),
            buttons: [{ text: t('customAlert.confirm', '确定'), onPress: () => processWheelResult(result) }]
        });
        setShowAlert(true);
    };

    // 处理转盘结果 - 所有区域都触发任务
    const processWheelResult = (result: WheelResult) => {
        const needsTask = applyWheelResult(result, currentPlayer.id);

        if (needsTask) {
            // 需要执行任务
            triggerTask(currentPlayer.id, result);
            setPendingWheelResult(result);
        } else {
            // 额外转盘机会，不切换玩家
            setTimeout(() => {
                checkWinCondition((winner) => {
                    handleVictory(winner);
                });
            }, 1000);
        }
    };

    // 触发任务弹窗
    const triggerTask = (triggerPlayerId: number, wheelResult: WheelResult) => {
        console.log(`触发任务：触发者ID=${triggerPlayerId}, 转盘结果:`, wheelResult);

        const task = gameTasks.getRandomTask();
        console.log('获取到的任务：', task);

        if (!task) {
            console.log('任务获取失败');
            return;
        }

        // 生成随机积分 (1-10分)
        const randomScore = generateRandomScore();

        const simpleTask: SimpleTaskData = {
            id: task.id,
            title: task.title,
            description: task.description,
            points: randomScore
        };

        setSimpleTaskData(simpleTask);
        setShowSimpleTaskModal(true);
    };

    // 处理任务完成结果
    const handleTaskComplete = (completed: boolean) => {
        if (!simpleTaskData || !pendingWheelResult) return;

        const executorPlayerId = currentPlayer?.id;
        if (!executorPlayerId) return;

        console.log(`任务完成: 执行者=${executorPlayerId}, 完成=${completed}, 积分=${simpleTaskData.points}`);

        // 应用任务奖惩：完成获得积分，失败扣减一半
        completeTask(executorPlayerId, simpleTaskData.id, simpleTaskData.points, completed);

        // 关闭弹窗并重置状态
        setShowSimpleTaskModal(false);
        setSimpleTaskData(null);
        setPendingWheelResult(null);

        // 任务完成后检查胜利条件并切换玩家
        setTimeout(() => {
            checkWinCondition((winner) => {
                handleVictory(winner);
            });

            // 如果游戏仍在进行中，切换到下一个玩家
            if (gameStatus === 'playing') {
                setTimeout(() => {
                    nextPlayer();
                    console.log('任务完成，切换到下一个玩家');
                }, 500);
            }
        }, 1000);
    };

    return (
        <>
            <Stack.Screen
                options={{
                    title: `${gameTasks.selectedTaskSet?.name || ""}-${t('wheelPoints.title', '转盘积分')}`,
                    headerShown: true,
                    headerStyle: {
                        backgroundColor: colors.homeBackground,
                    },
                    headerTintColor: colors.homeTitle,
                    headerTitleStyle: {
                        fontWeight: '600',
                        fontSize: 18,
                    },
                    headerBackTitle: t('wheelPoints.headerBackTitle', '返回'),
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

                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                >
                    {/* 游戏状态栏 */}
                    <View style={[styles.statusBar, { backgroundColor: colors.homeCardBackground }]}>
                        <View style={styles.statusLeft}>
                            <Text style={[styles.statusTitle, { color: colors.homeCardTitle }]}>
                                {gameStatus === 'waiting' ? t('wheelPoints.gameStatus.waiting', '准备开始') :
                                    gameStatus === 'playing' ? t('wheelPoints.gameStatus.playing', '游戏进行中') : t('wheelPoints.gameStatus.finished', '游戏结束')}
                            </Text>
                            {gameStatus === 'playing' && (
                                <View>
                                    <Text style={[styles.currentPlayerText, { color: currentPlayer.color }]}>
                                        {t('wheelPoints.currentPlayer', '轮到 {{playerName}}', { playerName: currentPlayer.name })}
                                    </Text>
                                    <Text style={[styles.roundText, { color: colors.homeCardDescription }]}>
                                        {t('wheelPoints.round', '第 {{round}} 轮', { round: rounds + 1 })}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {gameStatus === 'playing' && (
                            <View style={styles.spinContainer}>
                                <TouchableOpacity
                                    style={[styles.spinButton, {
                                        backgroundColor: isSpinning ? '#FF6B6B' : colors.settingsAccent,
                                        opacity: isSpinning ? 0.6 : 1
                                    }]}
                                    onPress={handleSpin}
                                    disabled={isSpinning}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={isSpinning ? ['#FF6B6B', '#FF8A80'] : ['#4CAF50', '#66BB6A']}
                                        style={styles.spinButtonGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <Ionicons
                                            name={isSpinning ? "hourglass" : "play"}
                                            size={20}
                                            color="white"
                                        />
                                        <Text style={styles.spinButtonText}>
                                            {isSpinning ? t('wheelPoints.spin.spinning', '旋转中...') : t('wheelPoints.spin.start', '开始转盘')}
                                        </Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* 玩家积分信息 */}
                    <View style={[styles.playersInfo, { backgroundColor: colors.homeCardBackground }]}>
                        <Text style={[styles.sectionTitle, { color: colors.homeCardTitle }]}>{t('wheelPoints.scoreRanking', '积分排行')}</Text>
                        <Text style={[styles.winCondition, { color: colors.homeCardDescription }]}>
                            {t('wheelPoints.winCondition', '胜利条件: 率先达到 {{score}} 分', { score: winningScore })}
                        </Text>
                        <View style={styles.playersGrid}>
                            {players.map((player, index) => {
                                const progress = (player.score / winningScore) * 100;
                                const isCurrentPlayer = currentPlayerIndex === index;
                                return (
                                    <View
                                        key={player.id}
                                        style={[
                                            styles.playerCard,
                                            {
                                                backgroundColor: player.color + '15',
                                                borderColor: isCurrentPlayer ? player.color : 'transparent',
                                                borderWidth: isCurrentPlayer ? 2 : 0
                                            }
                                        ]}
                                    >
                                        <PlayerAvatar
                                            iconType={player.iconType}
                                            color={player.color}
                                            size={40}
                                        />
                                        <View style={styles.playerInfo}>
                                            <Text style={[styles.playerName, { color: colors.homeCardTitle }]}>
                                                {player.name}
                                            </Text>
                                            <Text style={[styles.playerScore, { color: player.color }]}>
                                                {player.score} {t('simpleTaskModal.points', '积分')}
                                            </Text>
                                            <View style={styles.progressBarContainer}>
                                                <View style={[styles.progressBar, { backgroundColor: colors.homeCardDescription + '20' }]}>
                                                    <View
                                                        style={[
                                                            styles.progressFill,
                                                            {
                                                                width: `${Math.min(progress, 100)}%`,
                                                                backgroundColor: player.color
                                                            }
                                                        ]}
                                                    />
                                                </View>
                                                <Text style={[styles.progressText, { color: colors.homeCardDescription }]}>
                                                    {Math.round(progress)}%
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {/* 转盘区域 */}
                    <View style={[styles.wheelSection, { backgroundColor: colors.homeCardBackground }]}>
                        <Text style={[styles.sectionTitle, { color: colors.homeCardTitle }]}>{t('wheelPoints.luckyWheel', '幸运转盘')}</Text>
                        <View style={styles.wheelContainer}>
                            <WheelOfFortune
                                ref={wheelRef}
                                onSpinComplete={handleSpinComplete}
                                disabled={!isGameActive || isSpinning}
                            />
                        </View>
                    </View>
                </ScrollView>
            </View>

            {/* 简单任务弹窗 */}
            <SimpleTaskModal
                visible={showSimpleTaskModal}
                task={simpleTaskData}
                onComplete={handleTaskComplete}
                onClose={() => setShowSimpleTaskModal(false)}
            />

            {/* 胜利弹窗 */}
            <VictoryModal
                visible={showVictoryModal}
                winner={winner ? {
                    ...winner,
                    position: 0 // 转盘游戏不需要位置，设为默认值
                } : null}
                availableTasks={gameTasks.currentTasks}
                onTasksSelected={() => {}}
                onRestart={() => setShowVictoryModal(false)}
                onExit={() => {
                    setShowVictoryModal(false);
                    router.back();
                }}
                onClose={() => setShowVictoryModal(false)}
            />

            {/* 自定义弹窗 */}
            <CustomAlert
                visible={showAlert}
                title={alertData.title}
                message={alertData.message}
                buttons={alertData.buttons}
                onClose={() => setShowAlert(false)}
            />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 100,
    },
    statusBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    statusLeft: {
        flex: 1,
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    currentPlayerText: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    roundText: {
        fontSize: 12,
        fontWeight: '500',
    },
    spinContainer: {
        alignItems: 'center',
        gap: 12,
    },
    spinButton: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    spinButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 8,
    },
    spinButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    playersInfo: {
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
    },
    winCondition: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
        textAlign: 'center',
    },
    playersGrid: {
        gap: 8,
    },
    playerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
        gap: 10,
    },
    playerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playerAvatarText: {
        fontSize: 18,
    },
    playerInfo: {
        flex: 1,
    },
    playerName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    playerScore: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    progressBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    progressBar: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 12,
        fontWeight: '500',
        minWidth: 35,
        textAlign: 'right',
    },
    wheelSection: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        alignItems: 'center',
    },
    wheelContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
});