import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Stack, useLocalSearchParams, useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {LinearGradient} from 'expo-linear-gradient';
import {useColorScheme} from '@/hooks/use-color-scheme';
import {Colors} from '@/constants/theme';
import GameBoard from '@/components/GameBoard';
import TaskModal, {TaskModalData} from '@/components/TaskModal';
import VictoryModal from '@/components/VictoryModal';
import {PlayerAvatar} from '@/components/PlayerAvatar';
import {RoomWaiting} from '@/components/RoomWaiting';
import {useGameTasks} from '@/hooks/use-game-tasks';
import {GamePlayer, useGamePlayers} from '@/hooks/use-game-players';
import {useAudioManager} from '@/hooks/use-audio-manager';
import {useOnlineGame} from '@/hooks/use-online-game';
import {createBoardPath} from '@/utils/board';
import {PathCell} from '@/types/game';
import {useTranslation} from 'react-i18next';

export default function FlyingChessGame() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme] as any;
    const {t} = useTranslation();

    // 获取传入的参数
    const taskSetId = params.taskSetId as string;
    const isOnlineMode = params.onlineMode === 'true';
    const roomId = params.roomId as string;

    // 使用hooks
    const gameTasks = useGameTasks(taskSetId);
    const gamePlayersHook = useGamePlayers(2, 49);
    const onlineGameHook = useOnlineGame({
        roomId: roomId || '',
        taskSetId,
        gameType: 'fly'
    });
    const audioManager = useAudioManager();

    // 从 gamePlayersHook 解构变量
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
        calculateTaskReward,
        endGame,
        getOpponentPlayer
    } = gamePlayersHook;

    // 根据模式选择数据源
    const gameData = isOnlineMode ? {
        players: onlineGameHook.players.map((p, index) => ({
            id: parseInt(p.id) || index + 1,
            name: p.name,
            color: p.color,
            position: p.position,
            score: p.score,
            iconType: p.iconType,
            completedTasks: p.completedTasks,
            achievements: p.achievements
        })),
        currentPlayerIndex: onlineGameHook.currentPlayerIndex,
        currentPlayer: onlineGameHook.currentPlayer ? {
            id: parseInt(onlineGameHook.currentPlayer.id) || 1,
            name: onlineGameHook.currentPlayer.name,
            color: onlineGameHook.currentPlayer.color,
            position: onlineGameHook.currentPlayer.position,
            score: onlineGameHook.currentPlayer.score,
            iconType: onlineGameHook.currentPlayer.iconType,
            completedTasks: onlineGameHook.currentPlayer.completedTasks,
            achievements: onlineGameHook.currentPlayer.achievements
        } : null,
        gameStatus: onlineGameHook.gameStatus as 'waiting' | 'playing' | 'paused' | 'ended',
        isCurrentPlayerTurn: onlineGameHook.isCurrentPlayerTurn,
        isGameReady: onlineGameHook.isGameReady
    } : {
        players,
        currentPlayerIndex,
        currentPlayer,
        gameStatus,
        isCurrentPlayerTurn: true,
        isGameReady: gameStatus === 'playing'
    };

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
                // console.log(`Position ${index}: ${cell.type}`);
            }
        });
    }, []);

    // 动画值
    const diceRotation = useSharedValue(0);

    // 处理胜利
    const handleVictory = async (victoryPlayer: GamePlayer) => {
        console.log('Game victory! Winner:', victoryPlayer.name);

        // 立即设置游戏状态为结束，防止继续游戏
        if (gameStatus === 'playing') {
            console.log('Setting game status to ended');
            endGame();
        }

        // 播放胜利音效
        try {
            await audioManager.playSoundEffect('victory');
        } catch (error) {
            console.warn('Failed to play victory sound:', error);
        }

        setWinner(victoryPlayer);
        setShowVictoryModal(true);
    };


    // 检查格子类型并触发任务
    const checkCellAndTriggerTask = (playerId: number, position: number) => {
        console.log(`Checking special cell at position ${position}, player ID: ${playerId}`);

        // 检查 players 数组是否存在
        if (!players || players.length === 0) {
            console.log('Players array is empty or undefined');
            return false;
        }

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
        const playersAtPosition = players.filter(p => p && p.position === position && p.id !== playerId);
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

        // 检查玩家是否存在
        if (!players || players.length === 0) {
            console.log('Players array is empty or undefined');
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
            if (!opponentPlayer) {
                console.log('Failed to get opponent player');
                return;
            }
            executorPlayerId = opponentPlayer.id;
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

        // 计算任务奖惩信息
        const rewardInfo = calculateTaskReward(executorPlayerId, pendingTaskType, completed);

        // 关闭弹窗并重置状态
        setShowTaskModal(false);
        setTaskModalData(null);
        setPendingTaskType(null);

        if (rewardInfo && rewardInfo.actualSteps > 0) {
            console.log(`Task reward: Player ${executorPlayerId} will move ${rewardInfo.actualSteps} steps ${rewardInfo.isForward ? 'forward' : 'backward'}`);

            // 设置移动状态
            setIsMoving(true);

            // 使用逐步移动
            if (pendingTaskType === 'collision' && !completed) {
                // 特殊处理：碰撞任务失败直接回到起点
                movePlayer(executorPlayerId, 0);
                setTimeout(() => {
                    setIsMoving(false);
                    handleTaskCompleteCallback(executorPlayerId, 0);
                }, 500);
            } else {
                // 正常的逐步移动
                movePlayerByTaskReward(executorPlayerId, rewardInfo.actualSteps, rewardInfo.isForward, (playerId, finalPosition) => {
                    setIsMoving(false);
                    handleTaskCompleteCallback(playerId, finalPosition);
                });
            }
        } else {
            // 没有移动或移动步数为0，直接处理后续逻辑
            setTimeout(() => {
                handleTaskCompleteCallback(executorPlayerId, players.find(p => p.id === executorPlayerId)?.position || 0);
            }, 300);
        }
    };

    // 任务完成后的回调处理
    const handleTaskCompleteCallback = (playerId: number, finalPosition: number) => {
        console.log(`Task movement completed: Player ${playerId} at position ${finalPosition}`);

        const finishPosition = boardPath.length - 1; // 终点位置
        console.log(`Board length: ${boardPath.length}, Finish position: ${finishPosition}`);

        // 立即检查胜利条件，不使用setTimeout
        const updatedPlayer = players.find(p => p.id === playerId);
        console.log(`Player ${playerId} current position in state: ${updatedPlayer?.position}, final position from callback: ${finalPosition}`);

        if (updatedPlayer && updatedPlayer.position === finishPosition) {
            console.log(`Direct victory check: Player reached position ${finishPosition}!`);
            handleVictory(updatedPlayer);
            return; // 立即返回，不再执行后续逻辑
        }

        // 使用hook的胜利检查作为备选，传入具体的玩家和位置信息
        const winResult = checkWinCondition(playerId, finalPosition);
        if (winResult.hasWinner && winResult.winner) {
            console.log('Victory detected after task completion!', winResult.winner);
            handleVictory(winResult.winner);
        }

        // 延迟检查游戏状态，确保胜利检查完成
        setTimeout(() => {
            // 只有当游戏仍在进行中时，才切换到下一个玩家
            if (gameStatus === 'playing') {
                setDiceValue(0);
                nextPlayer();
                console.log('Task completed, switching to next player');
            } else {
                console.log('Game ended, not switching player');
            }
        }, 100);
    };


    const rollDice = async () => {
        if (isRolling || isMoving) return;

        setIsRolling(true);

        // 播放骰子音效
        try {
            await audioManager.playSoundEffect('dice');
        } catch (error) {
            console.warn('Failed to play dice sound:', error);
        }

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

                    // 先检查胜利条件，传入具体的玩家和位置信息
                    const winResult = checkWinCondition(playerId, finalPosition);
                    if (winResult.hasWinner && winResult.winner) {
                        handleVictory(winResult.winner);
                        return; // 如果有人获胜，直接返回
                    }

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

    // 任务奖惩逐步移动
    const movePlayerByTaskReward = (playerId: number, steps: number, isForward: boolean, onComplete?: (playerId: number, finalPosition: number) => void) => {
        const player = players.find(p => p.id === playerId);
        if (!player) return;

        const startPosition = player.position;
        const finishLine = boardPath.length - 1; // 终点位置
        let stepCount = 0;
        let targetPosition;

        if (isForward) {
            // 前进逻辑（和投掷骰子相同）
            if (startPosition + steps > finishLine) {
                const excess = (startPosition + steps) - finishLine;
                targetPosition = finishLine - excess;
            } else {
                targetPosition = startPosition + steps;
            }
            targetPosition = Math.max(0, targetPosition);
        } else {
            // 后退逻辑
            targetPosition = Math.max(startPosition - steps, 0);
        }

        console.log(`Task reward movement: Player ${playerId} from position ${startPosition}, ${isForward ? 'forward' : 'backward'} ${steps} steps, target: ${targetPosition}`);

        const moveOneStep = async () => {
            if (stepCount < steps && gameStatus === 'playing') {
                stepCount++;
                let currentMovePosition;

                if (isForward) {
                    // 前进移动
                    const currentStep = startPosition + stepCount;
                    if (currentStep <= finishLine) {
                        currentMovePosition = currentStep;
                    } else {
                        const stepsFromFinish = currentStep - finishLine;
                        currentMovePosition = finishLine - stepsFromFinish;
                    }
                    currentMovePosition = Math.max(0, Math.min(finishLine, currentMovePosition));
                } else {
                    // 后退移动
                    currentMovePosition = Math.max(startPosition - stepCount, 0);
                }

                movePlayer(playerId, currentMovePosition);

                // 播放移动音效
                try {
                    audioManager.playSoundEffect('step');
                } catch (error) {
                    console.warn('Failed to play step sound:', error);
                }

                if (stepCount < steps) {
                    setTimeout(moveOneStep, 400);
                } else {
                    // 移动完成
                    console.log(`Task reward movement completed! Player ${playerId} moved from position ${startPosition} to position ${targetPosition}`);

                    if (onComplete) {
                        setTimeout(() => {
                            onComplete(playerId, targetPosition);
                        }, 500);
                    }
                }
            }
        };

        moveOneStep();
    };

    const movePlayerStepByStep = (playerIndex: number, steps: number, onComplete?: (playerId: number, finalPosition: number) => void) => {
        const startPlayer = players[playerIndex];
        if (!startPlayer) return;

        const startPosition = startPlayer.position;
        const finishLine = boardPath.length - 1; // 终点位置
        let stepCount = 0;
        let targetPosition;

        // 计算最终位置，考虑倒着走的机制
        if (startPosition + steps > finishLine) {
            // 如果超过终点，需要倒着走
            const excess = (startPosition + steps) - finishLine;
            targetPosition = finishLine - excess;
        } else {
            targetPosition = startPosition + steps;
        }

        // 确保位置不小于0（防止倒着走到负数位置）
        targetPosition = Math.max(0, targetPosition);

        console.log(`Player ${startPlayer.id} from position ${startPosition} rolled ${steps} steps, target position: ${targetPosition}`);

        const moveOneStep = async () => {
            if (stepCount < steps && gameStatus === 'playing') {
                stepCount++;
                let currentMovePosition;

                // 计算当前步的位置
                const currentStep = startPosition + stepCount;

                if (currentStep <= finishLine) {
                    // 向前移动阶段：还未到达终点
                    currentMovePosition = currentStep;
                } else {
                    // 已经越过终点，开始倒着走
                    const stepsFromFinish = currentStep - finishLine;
                    currentMovePosition = finishLine - stepsFromFinish;
                }

                // 确保位置在有效范围内
                currentMovePosition = Math.max(0, Math.min(finishLine, currentMovePosition));
                movePlayer(startPlayer.id, currentMovePosition);

                // 播放移动音效
                try {
                    await audioManager.playSoundEffect('step');
                } catch (error) {
                    console.warn('Failed to play step sound:', error);
                }

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
                    title: `${gameTasks.selectedTaskSet?.name || ""}-${t('flyingChess.title', '飞行棋')}${isOnlineMode ? ` (${t('online.mode', '在线模式')})` : ''}`,
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

            {/* 根据模式渲染不同内容 */}
            {isOnlineMode ? (
                // 在线模式
                onlineGameHook.isWaitingForPlayers ? (
                    <RoomWaiting
                        roomId={onlineGameHook.roomInfo.id || roomId || 'UNKNOWN'}
                        players={onlineGameHook.players}
                        maxPlayers={onlineGameHook.roomInfo.maxPlayers || 2}
                        isHost={onlineGameHook.isHost}
                        onStartGame={onlineGameHook.startOnlineGame}
                        onLeaveRoom={() => {
                            onlineGameHook.leaveRoom();
                            router.back();
                        }}
                    />
                ) : (
                    // 在线游戏界面
                    <OnlineGameContent/>
                )
            ) : (
                // 单机模式（原有逻辑）
                <SinglePlayerGameContent/>
            )}
        </>
    );

    // 单机游戏内容组件
    function SinglePlayerGameContent() {
        return (
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
                                {gameData.gameStatus === 'waiting' ? t('flyingChess.gameStatus.waiting', '准备开始') :
                                    gameData.gameStatus === 'playing' ? t('flyingChess.gameStatus.playing', '游戏进行中') :
                                        t('flyingChess.gameStatus.finished', '游戏结束')}
                            </Text>
                            {gameData.gameStatus === 'playing' && gameData.currentPlayer && (
                                <Text style={[styles.currentPlayerText, {color: gameData.currentPlayer.color}]}>
                                    {t('flyingChess.currentPlayer', '轮到 {{playerName}}', {playerName: gameData.currentPlayer.name})}
                                </Text>
                            )}
                        </View>

                        {gameData.gameStatus === 'playing' && (
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
                        <Text
                            style={[styles.sectionTitle, {color: colors.homeCardTitle}]}>{t('flyingChess.playersStatus', '玩家状态')}</Text>
                        <View style={styles.playersGrid}>
                            {gameData.players.map((player, index) => (
                                <View
                                    key={player.id}
                                    style={[
                                        styles.playerCard,
                                        {
                                            backgroundColor: player.color + '15',
                                            borderColor: gameData.currentPlayerIndex === index ? player.color : 'transparent',
                                            borderWidth: gameData.currentPlayerIndex === index ? 2 : 0
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
                                            {t('flyingChess.position', '位置: {{position}}', {position: player.position + 1})}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* 游戏棋盘 */}
                    <View style={[styles.boardSection, {backgroundColor: colors.homeCardBackground}]}>
                        <GameBoard
                            players={gameData.players}
                            currentPlayer={gameData.currentPlayerIndex}
                            boardData={boardPath}
                            onCellPress={(cell) => {
                                console.log('Cell pressed:', cell);
                            }}
                        />
                    </View>
                </ScrollView>

                {/* 任务弹窗 */}
                <TaskModal
                    visible={showTaskModal}
                    task={taskModalData}
                    currentPlayer={gameData.currentPlayer}
                    opponentPlayer={gameData.currentPlayer ? getOpponentPlayer(gameData.currentPlayer.id) : null}
                    onComplete={handleTaskComplete}
                    onClose={() => setShowTaskModal(false)}
                />

                {/* 胜利弹窗 */}
                <VictoryModal
                    visible={showVictoryModal}
                    winner={winner}
                    availableTasks={gameTasks.currentTasks}
                    onTasksSelected={() => {
                    }}
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
            </View>
        );
    }

    // 在线游戏内容组件
    function OnlineGameContent() {
        return (
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
                    {/* 在线游戏状态栏 */}
                    <View style={[styles.statusBar, {backgroundColor: colors.homeCardBackground}]}>
                        <View style={styles.statusLeft}>
                            <Text style={[styles.statusTitle, {color: colors.homeCardTitle}]}>
                                {onlineGameHook.gameStatus === 'waiting' ? t('flyingChess.gameStatus.waiting', '准备开始') :
                                    onlineGameHook.gameStatus === 'playing' ? t('flyingChess.gameStatus.playing', '游戏进行中') :
                                        t('flyingChess.gameStatus.finished', '游戏结束')}
                            </Text>
                            {onlineGameHook.gameStatus === 'playing' && onlineGameHook.currentPlayer && (
                                <Text style={[styles.currentPlayerText, {color: onlineGameHook.currentPlayer.color}]}>
                                    {onlineGameHook.isCurrentPlayerTurn ?
                                        t('flyingChess.yourTurn', '轮到你了') :
                                        t('flyingChess.currentPlayer', '轮到 {{playerName}}', {playerName: onlineGameHook.currentPlayer.name})
                                    }
                                </Text>
                            )}
                        </View>

                        {onlineGameHook.gameStatus === 'playing' && (
                            <View style={styles.diceContainer}>
                                <View style={styles.diceWrapper}>
                                    <TouchableOpacity
                                        style={[styles.diceButton, {
                                            backgroundColor: (isRolling || isMoving || !onlineGameHook.isCurrentPlayerTurn) ? '#FF6B6B' : colors.settingsAccent,
                                            borderWidth: 3,
                                            borderColor: 'white',
                                            opacity: (isRolling || isMoving || !onlineGameHook.isCurrentPlayerTurn) ? 0.6 : 1
                                        }]}
                                        onPress={() => handleOnlineRollDice()}
                                        disabled={isRolling || isMoving || !onlineGameHook.isCurrentPlayerTurn}
                                        activeOpacity={0.8}
                                    >
                                        {isRolling ? (
                                            <Animated.View style={diceAnimatedStyle}>
                                                <Text style={styles.diceEmoji}>🎲</Text>
                                            </Animated.View>
                                        ) : (
                                            <Text style={[styles.diceResultText, {color: 'white'}]}>
                                                {onlineGameHook.syncedDiceValue || '🎲'}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>

                                <Text style={[styles.diceText, {color: colors.homeCardDescription, fontWeight: '600'}]}>
                                    {!onlineGameHook.isCurrentPlayerTurn ? t('flyingChess.dice.waitingTurn', '等待其他玩家') :
                                        isRolling ? t('flyingChess.dice.rolling', '投掷中...') :
                                            isMoving ? t('flyingChess.dice.moving', '棋子移动中...') :
                                                t('flyingChess.dice.clickToRoll', '点击投掷骰子')}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* 在线玩家信息 */}
                    <View style={[styles.playersInfo, {backgroundColor: colors.homeCardBackground}]}>
                        <Text
                            style={[styles.sectionTitle, {color: colors.homeCardTitle}]}>{t('flyingChess.playersStatus', '玩家状态')}</Text>
                        <View style={styles.playersGrid}>
                            {onlineGameHook.players.map((player, index) => (
                                <View
                                    key={player.id}
                                    style={[
                                        styles.playerCard,
                                        {
                                            backgroundColor: player.color + '15',
                                            borderColor: onlineGameHook.currentPlayerIndex === index ? player.color : 'transparent',
                                            borderWidth: onlineGameHook.currentPlayerIndex === index ? 2 : 0
                                        }
                                    ]}
                                >
                                    <PlayerAvatar
                                        iconType={player.iconType}
                                        color={player.color}
                                        size={32}
                                    />
                                    <View style={styles.playerInfo}>
                                        <View style={styles.playerNameRow}>
                                            <Text style={[styles.playerName, {color: colors.homeCardTitle}]}>
                                                {player.name}
                                            </Text>
                                            {player.isHost && (
                                                <Ionicons name="star" size={14} color="#FFD700"/>
                                            )}
                                        </View>
                                        <Text style={[styles.playerPosition, {color: colors.homeCardDescription}]}>
                                            {t('flyingChess.position', '位置: {{position}}', {position: player.position + 1})}
                                        </Text>
                                        <View style={styles.connectionStatus}>
                                            <View style={[
                                                styles.connectionDot,
                                                {backgroundColor: player.isConnected ? '#4CAF50' : '#FF6B6B'}
                                            ]}/>
                                            <Text style={[styles.connectionText, {color: colors.homeCardDescription}]}>
                                                {player.isConnected ? t('online.connected', '在线') : t('online.disconnected', '离线')}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* 游戏棋盘 */}
                    <View style={[styles.boardSection, {backgroundColor: colors.homeCardBackground}]}>
                        <GameBoard
                            players={onlineGameHook.players.map(p => ({
                                id: parseInt(p.id) || 1,
                                name: p.name,
                                color: p.color,
                                position: p.position,
                                score: p.score,
                                iconType: p.iconType,
                                completedTasks: p.completedTasks,
                                achievements: p.achievements
                            }))}
                            currentPlayer={onlineGameHook.currentPlayerIndex}
                            boardData={boardPath}
                            onCellPress={(cell) => {
                                console.log('Cell pressed:', cell);
                            }}
                        />
                    </View>
                </ScrollView>

                {/* 在线任务弹窗 */}
                <TaskModal
                    visible={showTaskModal}
                    task={taskModalData}
                    currentPlayer={gameData.currentPlayer}
                    opponentPlayer={gameData.currentPlayer ? getOpponentPlayer(gameData.currentPlayer.id) : null}
                    onComplete={handleOnlineTaskComplete}
                    onClose={() => setShowTaskModal(false)}
                />

                {/* 胜利弹窗 */}
                <VictoryModal
                    visible={showVictoryModal}
                    winner={winner}
                    availableTasks={gameTasks.currentTasks}
                    onTasksSelected={() => {
                    }}
                    onRestart={() => {
                        handleResetGame();
                        setShowVictoryModal(false);
                    }}
                    onExit={() => {
                        onlineGameHook.leaveRoom();
                        setShowVictoryModal(false);
                        router.back();
                    }}
                    onClose={() => setShowVictoryModal(false)}
                />
            </View>
        );
    }

    // 在线模式的骰子投掷
    async function handleOnlineRollDice() {
        if (isRolling || isMoving || !onlineGameHook.isCurrentPlayerTurn) return;

        setIsRolling(true);

        try {
            await audioManager.playSoundEffect('dice');
        } catch (error) {
            console.warn('Failed to play dice sound:', error);
        }

        diceRotation.value = withTiming(360 * 4, {duration: 1200});

        setTimeout(() => {
            const newDiceValue = Math.floor(Math.random() * 6) + 1;
            setDiceValue(newDiceValue);

            // 发送到服务器
            onlineGameHook.rollDiceOnline(newDiceValue);

            setTimeout(() => {
                setIsRolling(false);
                setIsMoving(true);
                diceRotation.value = 0;

                // 在线模式下的移动逻辑
                handleOnlinePlayerMove(newDiceValue);
            }, 1000);
        }, 1200);
    }

    // 在线模式的玩家移动
    function handleOnlinePlayerMove(steps: number) {
        if (!onlineGameHook.currentPlayer) return;

        const currentPlayer = onlineGameHook.currentPlayer;
        const startPosition = currentPlayer.position;
        const finishLine = boardPath.length - 1;

        // 计算目标位置
        let targetPosition;
        if (startPosition + steps > finishLine) {
            const excess = (startPosition + steps) - finishLine;
            targetPosition = finishLine - excess;
        } else {
            targetPosition = startPosition + steps;
        }
        targetPosition = Math.max(0, targetPosition);

        // 发送移动数据到服务器
        onlineGameHook.movePlayerOnline(
            currentPlayer.id,
            startPosition,
            targetPosition,
            steps
        );

        // 本地执行移动动画
        movePlayerStepByStep(onlineGameHook.currentPlayerIndex, steps, (playerId, finalPosition) => {
            setIsMoving(false);

            // 检查胜利条件
            const winResult = checkWinCondition(playerId, finalPosition);
            if (winResult.hasWinner && winResult.winner) {
                handleVictory(winResult.winner);
                return;
            }

            // 检查任务触发
            const hasTask = checkCellAndTriggerTask(playerId, finalPosition);
            if (!hasTask) {
                // 没有任务，游戏会自动切换到下一个玩家（通过服务器同步）
                console.log('No task triggered in online mode');
            }
        });
    }

    // 在线模式的任务完成处理
    function handleOnlineTaskComplete(completed: boolean) {
        if (!taskModalData || !pendingTaskType || !onlineGameHook.currentPlayer) return;

        const taskId = taskModalData.id;
        const playerId = taskModalData.executorPlayerId!;

        // 发送任务完成数据到服务器
        onlineGameHook.completeTaskOnline(taskId, playerId.toString(), completed);

        // 本地处理
        handleTaskComplete(completed);
    }
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
    playerNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    connectionStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    connectionDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    connectionText: {
        fontSize: 10,
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