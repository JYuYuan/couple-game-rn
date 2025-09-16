import { useState, useCallback } from 'react';

export interface WheelPlayer {
  id: number;
  name: string;
  color: string;
  score: number;
  icon: string;
  completedTasks: string[];
  achievements: string[];
}

const PLAYER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
const PLAYER_ICONS = ['🎯', '⭐', '🎪', '🎨'];
const PLAYER_NAMES = ['玩家1', '玩家2'];

// 转盘奖励配置 - 所有区域都触发任务
export const WHEEL_REWARDS = [
  { id: 1, label: '简单任务', type: 'task', difficulty: 'easy', color: '#4ECDC4', probability: 0.25 },
  { id: 2, label: '普通任务', type: 'task', difficulty: 'normal', color: '#45B7D1', probability: 0.25 },
  { id: 3, label: '困难任务', type: 'task', difficulty: 'hard', color: '#FF6B6B', probability: 0.2 },
  { id: 4, label: '挑战任务', type: 'task', difficulty: 'extreme', color: '#9C27B0', probability: 0.1 },
  { id: 5, label: '幸运任务', type: 'task', difficulty: 'lucky', color: '#FFB74D', probability: 0.1 },
  { id: 6, label: '惊喜任务', type: 'task', difficulty: 'surprise', color: '#4CAF50', probability: 0.05 },
  { id: 7, label: '再转一次', type: 'extra_spin', color: '#A5D6A7', probability: 0.05 }
];

export interface WheelResult {
  id: number;
  label: string;
  type: 'task' | 'extra_spin';
  difficulty?: string;
  color: string;
}

export const useWheelGame = () => {
  // 玩家状态
  const [players, setPlayers] = useState<WheelPlayer[]>(() =>
    Array.from({ length: 2 }, (_, index) => ({
      id: index + 1,
      name: PLAYER_NAMES[index],
      color: PLAYER_COLORS[index],
      score: 0,
      icon: PLAYER_ICONS[index],
      completedTasks: [],
      achievements: []
    }))
  );

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'paused' | 'ended'>('waiting');
  const [rounds, setRounds] = useState(0); // 总轮数
  const WINNING_SCORE = 100; // 胜利条件分数

  // 获取当前玩家
  const getCurrentPlayer = useCallback(() => {
    return players[currentPlayerIndex];
  }, [players, currentPlayerIndex]);

  // 切换到下一个玩家
  const nextPlayer = useCallback(() => {
    setCurrentPlayerIndex((prev) => {
      const nextIndex = (prev + 1) % players.length;
      // 如果回到第一个玩家，增加轮数
      if (nextIndex === 0) {
        setRounds(r => r + 1);
      }
      return nextIndex;
    });
  }, [players.length]);

  // 增加/减少玩家分数
  const updatePlayerScore = useCallback((playerId: number, points: number) => {
    setPlayers(prev => prev.map(player =>
      player.id === playerId
        ? { ...player, score: Math.max(0, player.score + points) } // 分数不能为负
        : player
    ));
  }, []);

  // 玩家完成任务
  const completeTask = useCallback((playerId: number, taskId: string, points: number, completed: boolean) => {
    const actualPoints = completed ? points : -Math.floor(points / 2); // 失败扣一半分数

    setPlayers(prev => prev.map(player =>
      player.id === playerId
        ? {
            ...player,
            completedTasks: [...player.completedTasks, taskId],
            score: Math.max(0, player.score + actualPoints)
          }
        : player
    ));
  }, []);

  // 添加成就
  const addAchievement = useCallback((playerId: number, achievement: string) => {
    setPlayers(prev => prev.map(player =>
      player.id === playerId && !player.achievements.includes(achievement)
        ? { ...player, achievements: [...player.achievements, achievement] }
        : player
    ));
  }, []);

  // 转盘结果处理
  const spinWheel = useCallback((): WheelResult => {
    const random = Math.random();
    let cumulativeProbability = 0;

    for (const reward of WHEEL_REWARDS) {
      cumulativeProbability += reward.probability;
      if (random <= cumulativeProbability) {
        return {
          id: reward.id,
          label: reward.label,
          type: reward.type as 'task' | 'extra_spin',
          difficulty: reward.difficulty,
          color: reward.color
        };
      }
    }

    // 默认返回随机任务
    return WHEEL_REWARDS[0] as WheelResult;
  }, []);

  // 应用转盘结果 - 现在所有区域都触发任务
  const applyWheelResult = useCallback((result: WheelResult, playerId: number) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return false;

    switch (result.type) {
      case 'extra_spin':
        // 额外转盘机会，不切换玩家
        return false; // 不需要任务模态框，也不切换玩家
      case 'task':
        return true; // 需要任务模态框
      default:
        return true; // 默认需要任务模态框
    }
  }, [players]);

  // 生成随机积分 (1-10分)
  const generateRandomScore = useCallback(() => {
    return Math.floor(Math.random() * 10) + 1; // 1-10分随机
  }, []);

  // 检查游戏胜利条件
  const checkWinCondition = useCallback((onWin: (winner: WheelPlayer) => void) => {
    const winner = players.find(player => player.score >= WINNING_SCORE);
    if (winner && gameStatus === 'playing') {
      setGameStatus('ended');
      onWin(winner);
    }
  }, [players, gameStatus]);

  // 重置游戏
  const resetGame = useCallback(() => {
    setPlayers(prev => prev.map(player => ({
      ...player,
      score: 0,
      completedTasks: [],
      achievements: []
    })));
    setCurrentPlayerIndex(0);
    setRounds(0);
    setGameStatus('waiting');
  }, []);

  // 开始游戏
  const startGame = useCallback(() => {
    setGameStatus('playing');
    setCurrentPlayerIndex(0);
    setRounds(0);
  }, []);

  // 暂停/恢复游戏
  const togglePause = useCallback(() => {
    setGameStatus(prev => prev === 'playing' ? 'paused' : 'playing');
  }, []);

  // 获取玩家排名
  const getPlayerRanking = useCallback(() => {
    return [...players].sort((a, b) => b.score - a.score);
  }, [players]);

  // 获取玩家统计信息
  const getPlayerStats = useCallback((playerId: number) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return null;

    return {
      tasksCompleted: player.completedTasks.length,
      achievements: player.achievements.length,
      score: player.score,
      progress: Math.round((player.score / WINNING_SCORE) * 100),
      progressToWin: WINNING_SCORE - player.score
    };
  }, [players]);

  // 获取对手玩家
  const getOpponentPlayer = useCallback((currentPlayerId: number) => {
    return players.find(player => player.id !== currentPlayerId) || null;
  }, [players]);

  // 显示胜利弹窗 - 移除Alert.alert的使用，让调用方处理弹窗显示
  const showWinDialog = useCallback((winner: WheelPlayer, onRestart: () => void, onExit: () => void) => {
    const ranking = getPlayerRanking();
    const winnerStats = getPlayerStats(winner.id);

    // 不再使用Alert.alert，返回数据供调用方使用
    console.log('游戏结束数据:', {
      winner: winner.name,
      score: winner.score,
      rounds,
      ranking: ranking.map((player, index) => ({
        rank: index + 1,
        name: player.name,
        score: player.score
      })),
      winnerStats: {
        tasksCompleted: winnerStats?.tasksCompleted || 0,
        achievements: winnerStats?.achievements || 0
      }
    });

    // 调用重新开始或退出的回调
    // 这里可以根据需要调用对应的回调
  }, [getPlayerRanking, getPlayerStats, rounds]);

  return {
    // 状态
    players,
    currentPlayerIndex,
    gameStatus,
    currentPlayer: getCurrentPlayer(),
    rounds,
    winningScore: WINNING_SCORE,

    // 转盘相关
    spinWheel,
    applyWheelResult,
    wheelRewards: WHEEL_REWARDS,
    generateRandomScore,

    // 玩家操作
    nextPlayer,
    updatePlayerScore,
    completeTask,
    addAchievement,
    getOpponentPlayer,

    // 游戏控制
    startGame,
    resetGame,
    togglePause,
    checkWinCondition,
    showWinDialog,

    // 统计信息
    getPlayerRanking,
    getPlayerStats,

    // 游戏状态检查
    isGameActive: gameStatus === 'playing',
    isGameEnded: gameStatus === 'ended',
    isGamePaused: gameStatus === 'paused'
  };
};