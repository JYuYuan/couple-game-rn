import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createLocalPlayers } from '@/utils/playerFactory'
import { DrawGuessPlayer } from '@/types/player'

// 重新导出玩家类型
export type { DrawGuessPlayer } from '@/types/player'

// 游戏阶段类型
export type GamePhase = 'drawing' | 'guessing' | 'result'

// 游戏轮次类型
export interface GameRound {
  roundNumber: number
  drawer: DrawGuessPlayer // 画画的玩家
  guesser: DrawGuessPlayer // 猜的玩家
  word: string // 要画的词
  timeLimit: number // 时间限制(秒)
  timeElapsed: number // 已用时间
  isCompleted: boolean // 是否完成
  guessedCorrectly: boolean // 是否猜对
  pointsAwarded: number // 获得积分
  hasTask: boolean // 是否有任务需要执行
  taskExecutor?: DrawGuessPlayer // 执行任务的玩家
  phase: GamePhase // 当前阶段: drawing(画画) | guessing(猜词) | result(结果)
  drawingConfirmed: boolean // 画画是否已确认
}

// 词库难度配置
export const WORD_CATEGORIES = {
  easy: {
    name: '简单',
    words: [
      '太阳',
      '月亮',
      '星星',
      '房子',
      '树',
      '花',
      '猫',
      '狗',
      '鱼',
      '鸟',
      '苹果',
      '香蕉',
      '西瓜',
      '草莓',
      '汽车',
      '飞机',
      '船',
      '自行车',
      '雨伞',
      '眼镜',
      '杯子',
      '书',
      '笔',
      '爱心',
      '笑脸',
    ],
    timeLimit: 60,
    basePoints: 10,
  },
  medium: {
    name: '中等',
    words: [
      '电脑',
      '手机',
      '键盘',
      '耳机',
      '相机',
      '冰箱',
      '电视',
      '沙发',
      '桌子',
      '椅子',
      '足球',
      '篮球',
      '羽毛球',
      '游泳',
      '跑步',
      '跳舞',
      '唱歌',
      '钢琴',
      '吉他',
      '画画',
      '彩虹',
      '风筝',
      '蝴蝶',
      '蜜蜂',
      '蜗牛',
    ],
    timeLimit: 90,
    basePoints: 20,
  },
  hard: {
    name: '困难',
    words: [
      '宇航员',
      '恐龙',
      '城堡',
      '火山',
      '金字塔',
      '过山车',
      '摩天轮',
      '热气球',
      '潜水艇',
      '直升机',
      '机器人',
      '外星人',
      '海盗',
      '骑士',
      '公主',
      '巫师',
      '龙',
      '独角兽',
      '美人鱼',
      '凤凰',
      '北极光',
      '流星雨',
      '瀑布',
      '沙漠',
      '森林',
    ],
    timeLimit: 120,
    basePoints: 30,
  },
}

export type WordDifficulty = keyof typeof WORD_CATEGORIES

export const useDrawGuessGame = () => {
  const { t } = useTranslation()

  // 获取国际化的玩家名称
  const getPlayerNames = useCallback(
    () => [t('players.names.player1', '玩家1'), t('players.names.player2', '玩家2')],
    [t],
  )

  // 玩家状态
  const [players, setPlayers] = useState<DrawGuessPlayer[]>(() => {
    const playerNames = getPlayerNames()
    const basePlayers = createLocalPlayers({
      count: 2,
      playerNames,
      gameType: 'draw-guess',
    })

    return basePlayers.map((player) => ({
      ...player,
      score: 0,
      correctGuesses: 0,
      drawingCount: 0,
    }))
  })

  const [currentRoundIndex, setCurrentRoundIndex] = useState(0)
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'paused' | 'ended'>(
    'waiting',
  )
  const [difficulty, setDifficulty] = useState<WordDifficulty>('medium')
  const [rounds, setRounds] = useState<GameRound[]>([])
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set())

  const WINNING_SCORE = 100 // 胜利条件分数
  const TOTAL_ROUNDS = 6 // 总轮数

  // 获取随机词语
  const getRandomWord = useCallback(
    (difficulty: WordDifficulty): string => {
      const category = WORD_CATEGORIES[difficulty]
      const availableWords = category.words.filter((word) => !usedWords.has(word))

      if (availableWords.length === 0) {
        // 如果词库用完了，重置已用词语
        setUsedWords(new Set())
        return category.words[Math.floor(Math.random() * category.words.length)]
      }

      const word = availableWords[Math.floor(Math.random() * availableWords.length)]
      setUsedWords((prev) => new Set([...prev, word]))
      return word
    },
    [usedWords],
  )

  // 创建新的游戏轮次
  const createNewRound = useCallback(
    (roundNumber: number): GameRound => {
      const drawerIndex = roundNumber % players.length
      const guesserIndex = (roundNumber + 1) % players.length

      const word = getRandomWord(difficulty)
      const config = WORD_CATEGORIES[difficulty]

      return {
        roundNumber,
        drawer: players[drawerIndex],
        guesser: players[guesserIndex],
        word,
        timeLimit: config.timeLimit,
        timeElapsed: 0,
        isCompleted: false,
        guessedCorrectly: false,
        pointsAwarded: 0,
        hasTask: false,
        taskExecutor: undefined,
        phase: 'drawing' as GamePhase,
        drawingConfirmed: false,
      }
    },
    [players, difficulty, getRandomWord],
  )

  // 开始游戏
  const startGame = useCallback(() => {
    // 重置游戏状态
    setPlayers((prev) =>
      prev.map((player) => ({
        ...player,
        score: 0,
        correctGuesses: 0,
        drawingCount: 0,
      })),
    )
    setUsedWords(new Set())
    setCurrentRoundIndex(0)

    // 创建第一轮
    const firstRound = createNewRound(0)
    setRounds([firstRound])
    setGameStatus('playing')
  }, [createNewRound])

  // 获取当前轮次
  const getCurrentRound = useCallback((): GameRound | null => {
    return rounds[currentRoundIndex] || null
  }, [rounds, currentRoundIndex])

  // 确认画画完成,切换到猜词阶段
  const confirmDrawing = useCallback(() => {
    const currentRound = getCurrentRound()
    if (!currentRound || currentRound.phase !== 'drawing') return

    const updatedRound: GameRound = {
      ...currentRound,
      phase: 'guessing',
      drawingConfirmed: true,
    }

    setRounds((prev) => {
      const newRounds = [...prev]
      newRounds[currentRoundIndex] = updatedRound
      return newRounds
    })
  }, [getCurrentRound, currentRoundIndex])

  // 完成当前轮次(猜对了)
  const completeRound = useCallback(
    (timeElapsed: number) => {
      const currentRound = getCurrentRound()
      if (!currentRound || currentRound.phase !== 'guessing') return

      const config = WORD_CATEGORIES[difficulty]
      // 计算积分:基础分 + 时间奖励
      const timeBonus = Math.max(0, Math.floor((config.timeLimit - timeElapsed) / 10))
      const points = config.basePoints + timeBonus

      // 更新轮次信息 - 猜对了,画画的人执行任务
      const updatedRound: GameRound = {
        ...currentRound,
        timeElapsed,
        isCompleted: true,
        guessedCorrectly: true,
        pointsAwarded: points,
        hasTask: true,
        taskExecutor: currentRound.drawer, // 画画的人执行任务
        phase: 'result',
      }

      setRounds((prev) => {
        const newRounds = [...prev]
        newRounds[currentRoundIndex] = updatedRound
        return newRounds
      })

      // 更新玩家积分和统计
      setPlayers((prev) =>
        prev.map((player) => {
          if (player.id === currentRound.guesser.id) {
            return {
              ...player,
              score: player.score + points,
              correctGuesses: player.correctGuesses + 1,
            }
          }
          if (player.id === currentRound.drawer.id) {
            return {
              ...player,
              drawingCount: player.drawingCount + 1,
            }
          }
          return player
        }),
      )

      // 不自动检查游戏结束,等待任务完成后再检查
    },
    [getCurrentRound, difficulty, currentRoundIndex],
  )

  // 跳过当前轮次(没猜对或超时)
  const skipRound = useCallback(
    (timeElapsed: number) => {
      const currentRound = getCurrentRound()
      if (!currentRound || currentRound.phase !== 'guessing') return

      // 更新轮次信息 - 没猜对,猜的人执行任务
      const updatedRound: GameRound = {
        ...currentRound,
        timeElapsed,
        isCompleted: true,
        guessedCorrectly: false,
        pointsAwarded: 0,
        hasTask: true,
        taskExecutor: currentRound.guesser, // 猜的人执行任务
        phase: 'result',
      }

      setRounds((prev) => {
        const newRounds = [...prev]
        newRounds[currentRoundIndex] = updatedRound
        return newRounds
      })

      // 更新玩家统计(画画次数)
      setPlayers((prev) =>
        prev.map((player) => {
          if (player.id === currentRound.drawer.id) {
            return {
              ...player,
              drawingCount: player.drawingCount + 1,
            }
          }
          return player
        }),
      )

      // 不自动检查游戏结束,等待任务完成后再检查
    },
    [getCurrentRound, currentRoundIndex],
  )

  // 进入下一轮
  const nextRound = useCallback(() => {
    const nextRoundNumber = currentRoundIndex + 1
    const newRound = createNewRound(nextRoundNumber)

    setRounds((prev) => [...prev, newRound])
    setCurrentRoundIndex(nextRoundNumber)
  }, [currentRoundIndex, createNewRound])

  // 检查游戏是否结束
  const checkGameEnd = useCallback(() => {
    const currentRound = getCurrentRound()
    if (!currentRound || !currentRound.isCompleted) return

    // 检查是否有玩家达到胜利分数
    const winner = players.find((player) => player.score >= WINNING_SCORE)
    if (winner) {
      setGameStatus('ended')
      return
    }

    // 检查是否达到总轮数
    if (currentRoundIndex + 1 >= TOTAL_ROUNDS) {
      setGameStatus('ended')
      return
    }

    // 继续下一轮
    setTimeout(() => {
      nextRound()
    }, 1500)
  }, [getCurrentRound, players, currentRoundIndex, nextRound])

  // 完成任务后的处理
  const completeTask = useCallback(() => {
    // 任务完成后,检查游戏是否结束
    setTimeout(() => {
      checkGameEnd()
    }, 100)
  }, [checkGameEnd])

  // 重置游戏
  const resetGame = useCallback(() => {
    setPlayers((prev) =>
      prev.map((player) => ({
        ...player,
        score: 0,
        correctGuesses: 0,
        drawingCount: 0,
      })),
    )
    setUsedWords(new Set())
    setCurrentRoundIndex(0)
    setRounds([])
    setGameStatus('waiting')
  }, [])

  // 暂停/恢复游戏
  const togglePause = useCallback(() => {
    setGameStatus((prev) => (prev === 'playing' ? 'paused' : 'playing'))
  }, [])

  // 设置游戏难度
  const setGameDifficulty = useCallback((newDifficulty: WordDifficulty) => {
    setDifficulty(newDifficulty)
  }, [])

  // 获取玩家排名
  const getPlayerRanking = useCallback(() => {
    return [...players].sort((a, b) => b.score - a.score)
  }, [players])

  // 获取获胜者
  const getWinner = useCallback((): DrawGuessPlayer | null => {
    if (gameStatus !== 'ended') return null

    const ranking = getPlayerRanking()
    // 积分最高的获胜,如果积分相同则猜对次数多的获胜
    let winner = ranking[0]
    if (ranking.length > 1 && ranking[0].score === ranking[1].score) {
      winner = ranking[0].correctGuesses > ranking[1].correctGuesses ? ranking[0] : ranking[1]
    }

    return winner
  }, [gameStatus, getPlayerRanking])

  return {
    // 状态
    players,
    gameStatus,
    difficulty,
    currentRound: getCurrentRound(),
    currentRoundIndex,
    rounds,
    totalRounds: TOTAL_ROUNDS,
    winningScore: WINNING_SCORE,

    // 游戏控制
    startGame,
    resetGame,
    togglePause,
    confirmDrawing,
    completeRound,
    skipRound,
    completeTask,
    setGameDifficulty,
    nextRound,

    // 统计信息
    getPlayerRanking,
    getWinner,

    // 游戏状态检查
    isGameActive: gameStatus === 'playing',
    isGameEnded: gameStatus === 'ended',
    isGamePaused: gameStatus === 'paused',
    isGameWaiting: gameStatus === 'waiting',
  }
}
