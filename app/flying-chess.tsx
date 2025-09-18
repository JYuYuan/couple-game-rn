import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Stack, useLocalSearchParams, useRouter} from 'expo-router';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {LinearGradient} from 'expo-linear-gradient';
import {useColorScheme} from '@/hooks/use-color-scheme';
import {Colors} from '@/constants/theme';
import GameBoard from '@/components/GameBoard';
import TaskModal, {TaskModalData} from '@/components/TaskModal';
import VictoryModal from '@/components/VictoryModal';
import {PlayerAvatar} from '@/components/PlayerAvatar';
import {useGameTasks} from '@/hooks/use-game-tasks';
import {GamePlayer, useGamePlayers} from '@/hooks/use-game-players';
import {useAudioManager} from '@/hooks/use-audio-manager';
import {createBoardPath} from '@/utils/board';
import {PathCell} from '@/types/game';
import {useTranslation} from 'react-i18next';

export default function FlyingChessGame() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme] as any;
    const { t } = useTranslation();

    // 获取传入的参数
    const taskSetId = params.taskSetId as string;

    // 使用hooks，传入分类参数
    const gameTasks = useGameTasks(taskSetId);
    const gamePlayersHook = useGamePlayers(2);
    const audioManager = useAudioManager();
    const {
        players,
        currentPlayerIndex,
        currentPlayer,
        gameStatus,
        startGame,
        resetGame,
        nextPlayer,
        movePlayer,
        checkWinCondition,
        applyTaskReward,
        getOpponentPlayer
    } = gamePlayersHook;

    // 游戏状态
    const [diceValue, setDiceValue] = useState(0);
    const [isRolling, setIsRolling] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskModalData, setTaskModalData] = useState<TaskModalData | null>(null);
    const [pendingTaskType, setPendingTaskType] = useState<'trap' | 'star' | 'collision' | null>(null);

    // 胜利弹窗状态
    const [showVictoryModal, setShowVictoryModal] = useState(false);
    const [winner, setWinner] = useState<GamePlayer | null>(null);

    // 棋盘数据
    const [boardPath, setBoardPath] = useState<PathCell[]>([]);

    // 进入页面时自动开始游戏
    useEffect(() => {
        if (gameStatus === 'waiting' && gameTasks.selectedTaskSet && boardPath.length > 0) {
            startGame();
        }
    }, [gameStatus, gameTasks.selectedTaskSet, boardPath.length, startGame]);

    // 初始化棋盘
    useEffect(() => {
        const newBoard = createBoardPath();
        setBoardPath(newBoard);
        console.log('Board generated, special cell positions:');
        newBoard.forEach((cell, index) => {
            if (cell.type !== 'path') {
                console.log(`Position ${index}: ${cell.type}`);
            }
        });
    }, []);

    // 动画值
    const diceRotation = useSharedValue(0);

    // 处理胜利
    const handleVictory = (victoryPlayer: GamePlayer) => {
        console.log('Game victory! Winner:', victoryPlayer.name);

        // 播放胜利音效
        audioManager.playSoundEffect('victory').catch(console.error);

        setWinner(victoryPlayer);
        setShowVictoryModal(true);
    };


    // 检查格子类型并触发任务
    const checkCellAndTriggerTask = (playerId: number, position: number) => {
        console.log(`Checking special cell at position ${position}, player ID: ${playerId}`);

        // 检查位置是否有效
        if (position < 0 || position >= boardPath.length) {
            console.log(`Position ${position} out of board range`);
            return false; // 返回false表示没有任务触发
        }

        const currentCell = boardPath[position];
        if (!currentCell) {
            console.log(`Cell data at position ${position} does not exist`);
            return false;
        }

        console.log(`Cell type at position ${position}: ${currentCell.type}`);

        // 检查是否有其他玩家在相同位置（碰撞）
        const playersAtPosition = players.filter(p => p.position === position && p.id !== playerId);
        if (playersAtPosition.length > 0) {
            console.log(`Collision detected at position ${position}`);
            triggerTask('collision', playerId);
            return true; // 返回true表示有任务触发
        }

        // 检查特殊格子
        if (currentCell.type === 'trap') {
            console.log(`Triggered trap task at position ${position}`);
            triggerTask('trap', playerId);
            return true;
        } else if (currentCell.type === 'star') {
            console.log(`Triggered star task at position ${position}`);
            triggerTask('star', playerId);
            return true;
        } else {
            console.log(`Position ${position} is a normal cell (${currentCell.type})`);
            return false;
        }
    };

    // 触发任务弹窗
    const triggerTask = (taskType: 'trap' | 'star' | 'collision', triggerPlayerId: number) => {
        console.log(`Triggered task: type=${taskType}, trigger player ID=${triggerPlayerId}`);

        const task = gameTasks.getRandomTask();
        console.log('Retrieved task:', task);

        if (!task) {
            console.log('Failed to retrieve task');
            return;
        }

        // 根据任务类型确定执行者
        let executorPlayerId: number;
        let executorType: 'self' | 'opponent';

        if (taskType === 'trap') {
            // 陷阱任务：触发者自己执行
            executorPlayerId = triggerPlayerId;
            executorType = 'self';
        } else {
            // 星星任务和碰撞任务：对手执行
            const opponentPlayer = getOpponentPlayer(triggerPlayerId);
            executorPlayerId = opponentPlayer?.id || triggerPlayerId;
            executorType = 'opponent';
        }

        console.log(`Executor ID: ${executorPlayerId}, type: ${executorType}`);

        const taskData: TaskModalData = {
            id: task.id,
            title: task.title,
            description: task.description || '',
            type: taskType,
            executor: executorType === 'self' ? 'current' : 'opponent',
            category: task.category,
            difficulty: task.difficulty,
            triggerPlayerId: triggerPlayerId,
            executorPlayerId: executorPlayerId
        };

        setTaskModalData(taskData);
        setPendingTaskType(taskType);
        setShowTaskModal(true);
    };

    // 处理任务完成结果
    const handleTaskComplete = (completed: boolean) => {
        if (!taskModalData || !pendingTaskType) return;

        const triggerPlayerId = taskModalData.triggerPlayerId!;
        const executorPlayerId = taskModalData.executorPlayerId!;

        console.log(`Task completed: type=${pendingTaskType}, trigger=${triggerPlayerId}, executor=${executorPlayerId}, completed=${completed}`);

        // 应用任务奖惩，移动执行者
        const moveResult = applyTaskReward(executorPlayerId, pendingTaskType, completed);

        if (moveResult) {
            console.log(`Executor ${executorPlayerId} moved from position ${moveResult.oldPosition} to ${moveResult.newPosition}`);

            // 如果执行者位置发生了变化，立即检查胜利条件
            if (moveResult.newPosition !== moveResult.oldPosition) {
                setTimeout(() => {
                    checkWinCondition((winner) => {
                        handleVictory(winner);
                    });
                }, 100);
            }
        }

        // 关闭弹窗并重置状态
        setShowTaskModal(false);
        setTaskModalData(null);
        setPendingTaskType(null);

        // 任务完成后检查是否需要切换玩家
        setTimeout(() => {
            // 再次检查胜利条件
            checkWinCondition((winner) => {
                handleVictory(winner);
            });

            // 如果游戏仍在进行中，切换到下一个玩家
            if (gameStatus === 'playing') {
                setDiceValue(0);
                nextPlayer();
                console.log('Task completed, switching to next player');
            }
        }, 500);
    };



    const rollDice = () => {
        if (isRolling || isMoving) return;

        setIsRolling(true);

        // 播放骰子音效
        audioManager.playSoundEffect('dice').catch(console.error);

        // 骰子旋转动画
        diceRotation.value = withTiming(360 * 4, {duration: 1200});

        // 生成随机数
        setTimeout(() => {
            const newDiceValue = Math.floor(Math.random() * 6) + 1;
            setDiceValue(newDiceValue);

            // 投掷完成，直接开始移动（不重置isRolling状态）
            setTimeout(() => {
                setIsRolling(false);
                setIsMoving(true);
                diceRotation.value = 0;

                // 移动当前玩家
                movePlayerStepByStep(currentPlayerIndex, newDiceValue, (playerId: number, finalPosition: number) => {
                    // 移动完成的回调函数
                    setIsMoving(false);

                    // 先检查胜利条件
                    checkWinCondition((winner) => {
                        handleVictory(winner);
                        return; // 如果有人获胜，直接返回
                    });

                    // 检查是否触发了任务
                    const hasTask = checkCellAndTriggerTask(playerId, finalPosition);

                    // 如果没有任务触发且游戏仍在进行，切换玩家
                    if (!hasTask && gameStatus === 'playing') {
                        setTimeout(() => {
                            setDiceValue(0);
                            nextPlayer();
                            console.log('No task triggered, switching to next player');
                        }, 500);
                    } else if (hasTask) {
                        console.log('Task triggered, waiting for task completion before switching players');
                    }
                });
            }, 1000);
        }, 1200);
    };

    const handleResetGame = () => {
        resetGame();
        setDiceValue(0);
        setIsMoving(false);
    };

    const movePlayerStepByStep = (playerIndex: number, steps: number, onComplete?: (playerId: number, finalPosition: number) => void) => {
        const startPlayer = players[playerIndex];
        if (!startPlayer) return;

        const startPosition = startPlayer.position;
        const boardSize = 48; // 棋盘总格数（终点位置为47，索引从0开始）
        let stepCount = 0;
        let targetPosition;

        // 计算最终位置，考虑终点反弹机制
        if (startPosition + steps > boardSize) {
            // 如果超过终点，需要反弹
            const excess = (startPosition + steps) - boardSize;
            targetPosition = boardSize - excess;
        } else {
            targetPosition = startPosition + steps;
        }

        // 确保位置不小于起始位置（防止反弹到起点之前）
        targetPosition = Math.max(0, targetPosition);

        console.log(`Player ${startPlayer.id} from position ${startPosition} rolled ${steps} steps, target position: ${targetPosition}`);

        const moveOneStep = () => {
            if (stepCount < steps && gameStatus === 'playing') {
                stepCount++;
                let currentMovePosition;

                if (stepCount <= boardSize - startPosition) {
                    // 向前移动阶段
                    currentMovePosition = startPosition + stepCount;
                } else {
                    // 反弹阶段
                    const bounceSteps = stepCount - (boardSize - startPosition);
                    currentMovePosition = boardSize - bounceSteps;
                }

                // 确保位置在有效范围内
                currentMovePosition = Math.max(0, Math.min(boardSize, currentMovePosition));
                movePlayer(startPlayer.id, currentMovePosition);

                // 播放移动音效
                audioManager.playSoundEffect('step').catch(console.error);

                if (stepCount < steps) {
                    setTimeout(moveOneStep, 400);
                } else {
                    // 移动完成
                    console.log(`Movement completed! Player ${startPlayer.id} moved from position ${startPosition} to position ${targetPosition}`);

                    // 调用完成回调
                    if (onComplete) {
                        setTimeout(() => {
                            onComplete(startPlayer.id, targetPosition);
                        }, 500);
                    }
                }
            }
        };

        moveOneStep();
    };


    const diceAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            {rotate: `${diceRotation.value}deg`}
        ],
    }));


    return (
        <>
            <Stack.Screen
                options={{
                    title: `${gameTasks.selectedTaskSet?.name || ""}-${t('flyingChess.title', '飞行棋')}`,
                    headerShown: true,
                    headerStyle: {
                        backgroundColor: colors.homeBackground,
                    },
                    headerTintColor: colors.homeTitle,
                    headerTitleStyle: {
                        fontWeight: '600',
                        fontSize: 18,
                    },
                    headerBackTitle: t('flyingChess.headerBackTitle', '返回'),
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

                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                >
                    {/* 游戏状态栏 */}
                    <View style={[styles.statusBar, {backgroundColor: colors.homeCardBackground}]}>
                        <View style={styles.statusLeft}>
                            <Text style={[styles.statusTitle, {color: colors.homeCardTitle}]}>
                                {gameStatus === 'waiting' ? t('flyingChess.gameStatus.waiting', '准备开始') :
                                    gameStatus === 'playing' ? t('flyingChess.gameStatus.playing', '游戏进行中') :
                                    t('flyingChess.gameStatus.finished', '游戏结束')}
                            </Text>
                            {gameStatus === 'playing' && (
                                <Text style={[styles.currentPlayerText, {color: currentPlayer.color}]}>
                                    {t('flyingChess.currentPlayer', '轮到 {{playerName}}', { playerName: currentPlayer.name })}
                                </Text>
                            )}
                        </View>

                        {gameStatus === 'playing' && (
                            <View style={styles.diceContainer}>
                                <View style={styles.diceWrapper}>
                                    <TouchableOpacity
                                        style={[styles.diceButton, {
                                            backgroundColor: (isRolling || isMoving) ? '#FF6B6B' : colors.settingsAccent,
                                            borderWidth: 3,
                                            borderColor: 'white',
                                            opacity: (isRolling || isMoving) ? 0.6 : 1
                                        }]}
                                        onPress={rollDice}
                                        disabled={isRolling || isMoving}
                                        activeOpacity={0.8}
                                    >
                                        {isRolling ? (
                                            <Animated.View style={diceAnimatedStyle}>
                                                <Text style={styles.diceEmoji}>🎲</Text>
                                            </Animated.View>
                                        ) : (
                                            <Text style={[styles.diceResultText, {color: 'white'}]}>
                                                {diceValue || '🎲'}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>

                                <Text style={[styles.diceText, {color: colors.homeCardDescription, fontWeight: '600'}]}>
                                    {isRolling ? t('flyingChess.dice.rolling', '投掷中...') :
                                     isMoving ? t('flyingChess.dice.moving', '棋子移动中...') :
                                     t('flyingChess.dice.clickToRoll', '点击投掷骰子')}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* 玩家信息 */}
                    <View style={[styles.playersInfo, {backgroundColor: colors.homeCardBackground}]}>
                        <Text style={[styles.sectionTitle, {color: colors.homeCardTitle}]}>{t('flyingChess.playersStatus', '玩家状态')}</Text>
                        <View style={styles.playersGrid}>
                            {players.map((player, index) => (
                                <View
                                    key={player.id}
                                    style={[
                                        styles.playerCard,
                                        {
                                            backgroundColor: player.color + '15',
                                            borderColor: currentPlayerIndex === index ? player.color : 'transparent',
                                            borderWidth: currentPlayerIndex === index ? 2 : 0
                                        }
                                    ]}
                                >
                                    <PlayerAvatar
                                        iconType={player.iconType}
                                        color={player.color}
                                        size={32}
                                    />
                                    <View style={styles.playerInfo}>
                                        <Text style={[styles.playerName, {color: colors.homeCardTitle}]}>
                                            {player.name}
                                        </Text>
                                        <Text style={[styles.playerPosition, {color: colors.homeCardDescription}]}>
                                            {t('flyingChess.position', '位置: {{position}}', { position: player.position + 1 })}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* 游戏棋盘 */}
                    <View style={[styles.boardSection, {backgroundColor: colors.homeCardBackground}]}>
                        <GameBoard
                            players={players}
                            currentPlayer={currentPlayerIndex}
                            boardData={boardPath}
                            onCellPress={(cell) => {
                                console.log('Cell pressed:', cell);
                            }}
                        />
                    </View>
                </ScrollView>
            </View>

            {/* 任务弹窗 */}
            <TaskModal
                visible={showTaskModal}
                task={taskModalData}
                currentPlayer={currentPlayer}
                opponentPlayer={currentPlayer ? getOpponentPlayer(currentPlayer.id) : null}
                onComplete={handleTaskComplete}
                onClose={() => setShowTaskModal(false)}
            />

            {/* 胜利弹窗 */}
            <VictoryModal
                visible={showVictoryModal}
                winner={winner}
                availableTasks={gameTasks.currentTasks}
                onTasksSelected={() => {}}
                onRestart={() => {
                    handleResetGame();
                    setShowVictoryModal(false);
                }}
                onExit={() => {
                    setShowVictoryModal(false);
                    router.back();
                }}
                onClose={() => setShowVictoryModal(false)}
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
        padding: 16,
        paddingBottom: 80,
    },
    statusBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
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
    },
    diceContainer: {
        alignItems: 'center',
        gap: 12,
    },
    diceWrapper: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    diceGlow: {
        position: 'absolute',
        width: 90,
        height: 90,
        borderRadius: 45,
        zIndex: 0,
    },
    diceGlowGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 45,
    },
    diceButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 1,
    },
    diceEmoji: {
        fontSize: 32,
    },
    diceResultText: {
        fontSize: 24,
        fontWeight: '700',
    },
    diceText: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
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
    playersGrid: {
        flexDirection: 'row',
        gap: 8,
    },
    playerCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
        gap: 8,
    },
    playerInfo: {
        flex: 1,
    },
    playerName: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    playerPosition: {
        fontSize: 12,
    },
    boardSection: {
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
    },
});