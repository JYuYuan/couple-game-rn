import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Dimensions,
    ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

const { width: screenWidth } = Dimensions.get('window');

// 扫雷游戏难度配置
const DIFFICULTY_CONFIGS = {
    easy: { rows: 9, cols: 9, mines: 10, name: '简单' },
    medium: { rows: 16, cols: 16, mines: 40, name: '中等' },
    hard: { rows: 16, cols: 30, mines: 99, name: '困难' },
};

// 格子状态
interface Cell {
    isMine: boolean;
    isRevealed: boolean;
    isFlagged: boolean;
    neighborMines: number;
}

type Difficulty = keyof typeof DIFFICULTY_CONFIGS;
type GameStatus = 'waiting' | 'playing' | 'won' | 'lost';

export default function Minesweeper() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme] as any;

    const [difficulty, setDifficulty] = useState<Difficulty>('easy');
    const [gameStatus, setGameStatus] = useState<GameStatus>('waiting');
    const [board, setBoard] = useState<Cell[][]>([]);
    const [flaggedCount, setFlaggedCount] = useState(0);
    const [timer, setTimer] = useState(0);
    const [firstClick, setFirstClick] = useState(true);

    const config = DIFFICULTY_CONFIGS[difficulty];
    const cellSize = Math.min((screenWidth - 40) / config.cols, 30);

    // 初始化游戏板
    const initializeBoard = useCallback(() => {
        const newBoard: Cell[][] = [];
        for (let row = 0; row < config.rows; row++) {
            newBoard[row] = [];
            for (let col = 0; col < config.cols; col++) {
                newBoard[row][col] = {
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    neighborMines: 0,
                };
            }
        }
        setBoard(newBoard);
        setGameStatus('waiting');
        setFlaggedCount(0);
        setTimer(0);
        setFirstClick(true);
    }, [config.rows, config.cols]);

    // 放置地雷
    const placeMines = useCallback((firstRow: number, firstCol: number) => {
        const newBoard = board.map(row => row.map(cell => ({ ...cell })));
        const mines = new Set<string>();

        while (mines.size < config.mines) {
            const row = Math.floor(Math.random() * config.rows);
            const col = Math.floor(Math.random() * config.cols);
            const key = `${row}-${col}`;

            // 避免在第一次点击的位置和周围放置地雷
            if (Math.abs(row - firstRow) <= 1 && Math.abs(col - firstCol) <= 1) {
                continue;
            }

            if (!mines.has(key)) {
                mines.add(key);
                newBoard[row][col].isMine = true;
            }
        }

        // 计算每个格子周围的地雷数量
        for (let row = 0; row < config.rows; row++) {
            for (let col = 0; col < config.cols; col++) {
                if (!newBoard[row][col].isMine) {
                    let count = 0;
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            const newRow = row + dr;
                            const newCol = col + dc;
                            if (
                                newRow >= 0 && newRow < config.rows &&
                                newCol >= 0 && newCol < config.cols &&
                                newBoard[newRow][newCol].isMine
                            ) {
                                count++;
                            }
                        }
                    }
                    newBoard[row][col].neighborMines = count;
                }
            }
        }

        setBoard(newBoard);
    }, [board, config.rows, config.cols, config.mines]);

    // 揭示格子
    const revealCell = useCallback((row: number, col: number) => {
        if (gameStatus !== 'playing' && gameStatus !== 'waiting') return;
        if (board[row][col].isRevealed || board[row][col].isFlagged) return;

        const newBoard = board.map(row => row.map(cell => ({ ...cell })));

        // 第一次点击时放置地雷
        if (firstClick) {
            setFirstClick(false);
            setGameStatus('playing');
            placeMines(row, col);
            return; // 等待下一次渲染后再揭示
        }

        // 揭示当前格子
        newBoard[row][col].isRevealed = true;

        // 如果是地雷，游戏结束
        if (newBoard[row][col].isMine) {
            // 揭示所有地雷
            for (let r = 0; r < config.rows; r++) {
                for (let c = 0; c < config.cols; c++) {
                    if (newBoard[r][c].isMine) {
                        newBoard[r][c].isRevealed = true;
                    }
                }
            }
            setGameStatus('lost');
            setBoard(newBoard);
            return;
        }

        // 如果周围没有地雷，自动揭示周围的格子
        if (newBoard[row][col].neighborMines === 0) {
            const queue = [[row, col]];
            const visited = new Set<string>();

            while (queue.length > 0) {
                const [currentRow, currentCol] = queue.shift()!;
                const key = `${currentRow}-${currentCol}`;

                if (visited.has(key)) continue;
                visited.add(key);

                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const newRow = currentRow + dr;
                        const newCol = currentCol + dc;

                        if (
                            newRow >= 0 && newRow < config.rows &&
                            newCol >= 0 && newCol < config.cols &&
                            !newBoard[newRow][newCol].isRevealed &&
                            !newBoard[newRow][newCol].isFlagged &&
                            !newBoard[newRow][newCol].isMine
                        ) {
                            newBoard[newRow][newCol].isRevealed = true;
                            if (newBoard[newRow][newCol].neighborMines === 0) {
                                queue.push([newRow, newCol]);
                            }
                        }
                    }
                }
            }
        }

        setBoard(newBoard);

        // 检查是否获胜
        let revealedCount = 0;
        for (let r = 0; r < config.rows; r++) {
            for (let c = 0; c < config.cols; c++) {
                if (newBoard[r][c].isRevealed && !newBoard[r][c].isMine) {
                    revealedCount++;
                }
            }
        }

        if (revealedCount === config.rows * config.cols - config.mines) {
            setGameStatus('won');
        }
    }, [board, gameStatus, firstClick, config.rows, config.cols, config.mines, placeMines]);

    // 标记/取消标记格子
    const toggleFlag = useCallback((row: number, col: number) => {
        if (gameStatus !== 'playing' && gameStatus !== 'waiting') return;
        if (board[row][col].isRevealed) return;

        const newBoard = board.map(row => row.map(cell => ({ ...cell })));
        newBoard[row][col].isFlagged = !newBoard[row][col].isFlagged;

        setBoard(newBoard);
        setFlaggedCount(prev => newBoard[row][col].isFlagged ? prev + 1 : prev - 1);
    }, [board, gameStatus]);

    // 计时器
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (gameStatus === 'playing') {
            interval = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [gameStatus]);

    // 初始化游戏
    useEffect(() => {
        initializeBoard();
    }, [initializeBoard]);

    // 重新开始游戏
    const restartGame = () => {
        initializeBoard();
    };

    // 获取格子显示内容
    const getCellContent = (cell: Cell) => {
        if (cell.isFlagged) return '🚩';
        if (!cell.isRevealed) return '';
        if (cell.isMine) return '💣';
        if (cell.neighborMines === 0) return '';
        return cell.neighborMines.toString();
    };

    // 获取格子颜色
    const getCellTextColor = (neighborMines: number) => {
        const colorMap = {
            1: '#1976D2',
            2: '#388E3C',
            3: '#D32F2F',
            4: '#7B1FA2',
            5: '#F57C00',
            6: '#C2185B',
            7: '#000000',
            8: '#424242',
        };
        return colorMap[neighborMines as keyof typeof colorMap] || '#000000';
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getStatusColor = () => {
        switch (gameStatus) {
            case 'won': return '#4CAF50';
            case 'lost': return '#F44336';
            case 'playing': return '#FF9500';
            default: return colors.homeCardDescription;
        }
    };

    const getStatusText = () => {
        switch (gameStatus) {
            case 'won': return '🎉 胜利！';
            case 'lost': return '💥 失败！';
            case 'playing': return '🎮 游戏中';
            default: return '⏸️ 准备开始';
        }
    };

    return (
        <>
            <Stack.Screen
                options={{
                    title: '扫雷',
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
            <View style={[styles.container, { backgroundColor: colors.homeBackground }]}>
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
                        <View style={styles.statusItem}>
                            <Text style={[styles.statusLabel, { color: colors.homeCardDescription }]}>
                                💣 剩余
                            </Text>
                            <Text style={[styles.statusValue, { color: colors.homeCardTitle }]}>
                                {config.mines - flaggedCount}
                            </Text>
                        </View>

                        <View style={styles.statusItem}>
                            <Text style={[styles.statusText, { color: getStatusColor() }]}>
                                {getStatusText()}
                            </Text>
                        </View>

                        <View style={styles.statusItem}>
                            <Text style={[styles.statusLabel, { color: colors.homeCardDescription }]}>
                                ⏱️ 时间
                            </Text>
                            <Text style={[styles.statusValue, { color: colors.homeCardTitle }]}>
                                {formatTime(timer)}
                            </Text>
                        </View>
                    </View>

                    {/* 难度选择 */}
                    <View style={[styles.difficultyContainer, { backgroundColor: colors.homeCardBackground }]}>
                        <Text style={[styles.sectionTitle, { color: colors.homeCardTitle }]}>
                            难度选择
                        </Text>
                        <View style={styles.difficultyButtons}>
                            {Object.entries(DIFFICULTY_CONFIGS).map(([key, config]) => (
                                <TouchableOpacity
                                    key={key}
                                    style={[
                                        styles.difficultyButton,
                                        {
                                            backgroundColor: difficulty === key ? '#10B981' : colors.homeCardBackground,
                                            borderColor: difficulty === key ? '#10B981' : colors.homeCardBorder,
                                        }
                                    ]}
                                    onPress={() => {
                                        setDifficulty(key as Difficulty);
                                        setGameStatus('waiting');
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[
                                        styles.difficultyButtonText,
                                        { color: difficulty === key ? 'white' : colors.homeCardTitle }
                                    ]}>
                                        {config.name}
                                    </Text>
                                    <Text style={[
                                        styles.difficultyInfo,
                                        { color: difficulty === key ? 'white' : colors.homeCardDescription }
                                    ]}>
                                        {config.rows}×{config.cols} · {config.mines}💣
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* 游戏板 */}
                    <View style={[styles.gameBoard, { backgroundColor: colors.homeCardBackground }]}>
                        <View style={[styles.boardContainer, { width: cellSize * config.cols }]}>
                            {board.map((row, rowIndex) => (
                                <View key={rowIndex} style={styles.boardRow}>
                                    {row.map((cell, colIndex) => (
                                        <TouchableOpacity
                                            key={`${rowIndex}-${colIndex}`}
                                            style={[
                                                styles.cell,
                                                {
                                                    width: cellSize,
                                                    height: cellSize,
                                                    backgroundColor: cell.isRevealed
                                                        ? (cell.isMine ? '#F44336' : '#E0E0E0')
                                                        : '#BDBDBD',
                                                    borderColor: colors.homeCardBorder,
                                                }
                                            ]}
                                            onPress={() => revealCell(rowIndex, colIndex)}
                                            onLongPress={() => toggleFlag(rowIndex, colIndex)}
                                            delayLongPress={200}
                                            activeOpacity={0.7}
                                        >
                                            <Text
                                                style={[
                                                    styles.cellText,
                                                    {
                                                        fontSize: cellSize * 0.5,
                                                        color: cell.isRevealed && !cell.isMine
                                                            ? getCellTextColor(cell.neighborMines)
                                                            : '#000000'
                                                    }
                                                ]}
                                            >
                                                {getCellContent(cell)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* 控制按钮 */}
                    <View style={styles.controlContainer}>
                        <TouchableOpacity
                            style={[styles.controlButton, { backgroundColor: '#10B981' }]}
                            onPress={restartGame}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#34D399', '#10B981']}
                                style={styles.controlButtonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name="refresh" size={20} color="white" />
                                <Text style={styles.controlButtonText}>重新开始</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* 游戏说明 */}
                    <View style={[styles.instructionsContainer, { backgroundColor: colors.homeCardBackground }]}>
                        <Text style={[styles.sectionTitle, { color: colors.homeCardTitle }]}>
                            游戏说明
                        </Text>
                        <Text style={[styles.instructionText, { color: colors.homeCardDescription }]}>
                            • 点击格子揭示内容{'\n'}
                            • 长按格子标记地雷{'\n'}
                            • 数字表示周围地雷数量{'\n'}
                            • 揭示所有非地雷格子即可获胜
                        </Text>
                    </View>
                </ScrollView>
            </View>
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
    statusItem: {
        alignItems: 'center',
    },
    statusLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 4,
    },
    statusValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
    },
    difficultyContainer: {
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
    },
    difficultyButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    difficultyButton: {
        flex: 1,
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
    },
    difficultyButtonText: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    difficultyInfo: {
        fontSize: 10,
        fontWeight: '400',
    },
    gameBoard: {
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
        alignItems: 'center',
    },
    boardContainer: {
        alignSelf: 'center',
    },
    boardRow: {
        flexDirection: 'row',
    },
    cell: {
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cellText: {
        fontWeight: '700',
        textAlign: 'center',
    },
    controlContainer: {
        marginBottom: 12,
    },
    controlButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    controlButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 8,
    },
    controlButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    instructionsContainer: {
        padding: 12,
        borderRadius: 12,
    },
    instructionText: {
        fontSize: 14,
        lineHeight: 20,
    },
});