import { useState, useCallback } from 'react';
import { Alert } from 'react-native';

export interface GamePlayer {
  id: number;
  name: string;
  color: string;
  position: number;
  score: number;
  icon: string;
  completedTasks: string[];
  achievements: string[];
}

const PLAYER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
const PLAYER_ICONS = ['✈️', '🚁', '🚀', '🛸'];
const PLAYER_NAMES = ['玩家1', '玩家2', '玩家3', '玩家4'];

export const useGamePlayers = (initialPlayerCount: number = 2) => {
  const [players, setPlayers] = useState<GamePlayer[]>(() =>
    Array.from({ length: initialPlayerCount }, (_, index) => ({
      id: index + 1,
      name: PLAYER_NAMES[index],
      color: PLAYER_COLORS[index],
      position: 0,
      score: 0,
      icon: PLAYER_ICONS[index],
      completedTasks: [],
      achievements: []
    }))
  );

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'paused' | 'ended'>('waiting');

  // 获取当前玩家
  const getCurrentPlayer = useCallback(() => {
    return players[currentPlayerIndex];
  }, [players, currentPlayerIndex]);

  // 切换到下一个玩家
  const nextPlayer = useCallback(() => {
    setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
  }, [players.length]);

  // 移动玩家位置
  const movePlayer = useCallback((playerId: number, newPosition: number) => {
    setPlayers(prev => prev.map(player =>
      player.id === playerId
        ? { ...player, position: Math.max(0, Math.min(newPosition, 48)) }
        : player
    ));
  }, []);

  // 增加玩家分数
  const addPlayerScore = useCallback((playerId: number, points: number) => {
    setPlayers(prev => prev.map(player =>
      player.id === playerId
        ? { ...player, score: player.score + points }
        : player
    ));
  }, []);

  // 玩家完成任务
  const completeTask = useCallback((playerId: number, taskId: string, points: number = 0) => {
    setPlayers(prev => prev.map(player =>
      player.id === playerId
        ? {
            ...player,
            completedTasks: [...player.completedTasks, taskId],
            score: player.score + points
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

  // 检查游戏胜利条件
  const checkWinCondition = useCallback((onWin: (winner: GamePlayer) => void) => {
    // 在反弹机制下，玩家需要刚好落在终点位置(48)才能获胜
    const winner = players.find(player => player.position === 48);
    if (winner && gameStatus === 'playing') {
      setGameStatus('ended');
      onWin(winner);
    }
  }, [players, gameStatus]);

  // 重置游戏
  const resetGame = useCallback(() => {
    setPlayers(prev => prev.map(player => ({
      ...player,
      position: 0,
      score: 0,
      completedTasks: [],
      achievements: []
    })));
    setCurrentPlayerIndex(0);
    setGameStatus('waiting');
  }, []);

  // 开始游戏
  const startGame = useCallback(() => {
    setGameStatus('playing');
    setCurrentPlayerIndex(0);
  }, []);

  // 暂停/恢复游戏
  const togglePause = useCallback(() => {
    setGameStatus(prev => prev === 'playing' ? 'paused' : 'playing');
  }, []);

  // 获取玩家排名
  const getPlayerRanking = useCallback(() => {
    return [...players].sort((a, b) => {
      // 首先按位置排序，然后按分数排序
      if (a.position !== b.position) {
        return b.position - a.position;
      }
      return b.score - a.score;
    });
  }, [players]);

  // 获取玩家统计信息
  const getPlayerStats = useCallback((playerId: number) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return null;

    return {
      tasksCompleted: player.completedTasks.length,
      achievements: player.achievements.length,
      position: player.position,
      score: player.score,
      progress: Math.round((player.position / 48) * 100)
    };
  }, [players]);

  // 任务奖惩机制
  const applyTaskReward = useCallback((playerId: number, taskType: 'trap' | 'star' | 'collision', completed: boolean) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return null;

    let moveSteps = 0;
    let newPosition = player.position;
    const oldPosition = player.position;

    switch (taskType) {
      case 'trap':
      case 'star':
        // 陷阱和幸运任务：完成前进3-6格，未完成后退3-6格
        moveSteps = Math.floor(Math.random() * 4) + 3; // 3-6格
        if (completed) {
          newPosition = Math.min(player.position + moveSteps, 48);
        } else {
          newPosition = Math.max(player.position - moveSteps, 0);
        }
        break;
      case 'collision':
        // 碰撞任务：完成停留原地，未完成回到起点
        if (completed) {
          newPosition = player.position; // 保持原位
        } else {
          newPosition = 0; // 回到起点
        }
        break;
    }

    // 更新玩家位置
    movePlayer(playerId, newPosition);

    // 返回移动信息用于显示
    return {
      playerId,
      oldPosition,
      newPosition,
      moveSteps: taskType === 'collision' ? (completed ? 0 : -oldPosition) : (completed ? moveSteps : -moveSteps)
    };
  }, [players, movePlayer]);

  // 获取对手玩家
  const getOpponentPlayer = useCallback((currentPlayerId: number) => {
    return players.find(player => player.id !== currentPlayerId) || null;
  }, [players]);

  // 显示胜利弹窗
  const showWinDialog = useCallback((winner: GamePlayer, onRestart: () => void, onExit: () => void) => {
    const ranking = getPlayerRanking();
    const winnerStats = getPlayerStats(winner.id);

    Alert.alert(
      '🎉 游戏结束',
      `${winner.name} 获得胜利！\n\n📊 最终排名:\n${ranking.map((player, index) =>
        `${index + 1}. ${player.name} (位置: ${player.position + 1}, 分数: ${player.score})`
      ).join('\n')}\n\n🏆 获胜者统计:\n✅ 完成任务: ${winnerStats?.tasksCompleted || 0} 个\n🌟 获得成就: ${winnerStats?.achievements || 0} 个`,
      [
        { text: '重新开始', onPress: onRestart },
        { text: '退出游戏', onPress: onExit }
      ]
    );
  }, [getPlayerRanking, getPlayerStats]);

  return {
    // 状态
    players,
    currentPlayerIndex,
    gameStatus,
    currentPlayer: getCurrentPlayer(),

    // 玩家操作
    nextPlayer,
    movePlayer,
    addPlayerScore,
    completeTask,
    addAchievement,
    getOpponentPlayer,

    // 游戏控制
    startGame,
    resetGame,
    togglePause,
    checkWinCondition,
    showWinDialog,

    // 任务系统
    applyTaskReward,

    // 统计信息
    getPlayerRanking,
    getPlayerStats,

    // 游戏状态检查
    isGameActive: gameStatus === 'playing',
    isGameEnded: gameStatus === 'ended',
    isGamePaused: gameStatus === 'paused'
  };
};