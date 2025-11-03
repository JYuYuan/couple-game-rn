import { useTranslation } from 'react-i18next'

export const useGameTypeText = () => {
  const { t } = useTranslation()

  return (type: string) => {
    switch (type) {
      case 'fly':
        return t('gameMode.flyingChess', '飞行棋')
      case 'wheel':
        return t('gameMode.wheel', '大转盘')
      case 'minesweeper':
        return t('gameMode.minesweeper', '扫雷对战')
      default:
        return type
    }
  }
}

export const generateRoomName = (
  gameType: string,
  taskSetId: string | undefined,
  getGameTypeText: (type: string) => string,
) => {
  const gameTypeName = getGameTypeText(gameType)
  return `${gameTypeName}-${taskSetId}_${Date.now().toString().slice(-4)}`
}
