import {useCallback, useState} from 'react';
import {Alert} from 'react-native';
import {useTranslation} from 'react-i18next';
import {PlayerIconType} from '@/components/icons';

export interface GamePlayer {
  id: number;
  name: string;
  color: string;
  position: number;
  score: number;
  iconType: PlayerIconType; // 改为SVG图标类型
  completedTasks: string[];
  achievements: string[];
}

const PLAYER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
const PLAYER_ICON_TYPES: PlayerIconType[] = ['airplane', 'helicopter', 'rocket', 'ufo'];

export const useGamePlayers = (initialPlayerCount: number = 2) => {
  const { t } = useTranslation();

  // 获取国际化的玩家名称
  const getPlayerNames = useCallback(() => [
    t('players.names.player1', '玩家1'),
    t('players.names.player2', '玩家2'),
    t('players.names.player3', '玩家3'),
    t('players.names.player4', '玩家4'),
  ], [t]);

  const [players, setPlayers] = useState<GamePlayer[]>(() => {
    const playerNames = getPlayerNames();
    return Array.from({ length: initialPlayerCount }, (_, index) => ({
      id: index + 1,
      name: playerNames[index],
      color: PLAYER_COLORS[index],
      position: 0,
      score: 0,
      iconType: PLAYER_ICON_TYPES[index],
      completedTasks: [],
      achievements: []
    }));
  });

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

  // 更新玩家名称为国际化版本
  const updatePlayerNames = useCallback(() => {
    const playerNames = getPlayerNames();
    setPlayers(prev => prev.map((player, index) => ({
      ...player,
      name: playerNames[index] || player.name
    })));
  }, [getPlayerNames]);

  // 显示胜利弹窗
  const showWinDialog = useCallback((winner: GamePlayer, onRestart: () => void, onExit: () => void) => {
    const ranking = getPlayerRanking();
    const winnerStats = getPlayerStats(winner.id);

    const rankingText = ranking.map((player, index) =>
      t('players.rankingItem', '{{rank}}. {{name}} (位置: {{position}}, 分数: {{score}})', {
        rank: index + 1,
        name: player.name,
        position: player.position + 1,
        score: player.score
      })
    ).join('\n');

    const message = `${t('players.victory', '{{name}} 获得胜利！', { name: winner.name })}\n\n${t('players.finalRanking', '📊 最终排名:')}\n${rankingText}\n\n${t('players.winnerStats', '🏆 获胜者统计:')}\n${t('players.completedTasks', '✅ 完成任务: {{count}} 个', { count: winnerStats?.tasksCompleted || 0 })}\n${t('players.achievements', '🌟 获得成就: {{count}} 个', { count: winnerStats?.achievements || 0 })}`;

    Alert.alert(
      t('players.gameEnd', '🎉 游戏结束'),
      message,
      [
        { text: t('players.restart', '重新开始'), onPress: onRestart },
        { text: t('players.exitGame', '退出游戏'), onPress: onExit }
      ]
    );
  }, [getPlayerRanking, getPlayerStats, t]);

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
    updatePlayerNames,

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