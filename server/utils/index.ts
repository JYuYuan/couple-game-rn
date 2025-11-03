export function getRandomColor() {
  // 使用预定义的颜色池，与客户端保持一致
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F']
  return colors[Math.floor(Math.random() * colors.length)]
}

export function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = newArray[i]
    newArray[i] = newArray[j]!
    newArray[j] = temp!
  }
  return newArray
}

// 棋盘路径单元格类型
interface PathCell {
  id: number
  x: number
  y: number
  type: 'start' | 'end' | 'path' | 'star' | 'trap'
  direction: 'right' | 'down' | 'left' | 'up' | null
}

export const createBoardPath = (): PathCell[] => {
  const boardSize = 7
  const path: PathCell[] = []
  const visited = Array(boardSize)
    .fill(null)
    .map(() => Array(boardSize).fill(false))

  const directions: [number, number][] = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0], // 右、下、左、上
  ]
  const directionNames: ('right' | 'down' | 'left' | 'up')[] = ['right', 'down', 'left', 'up']

  let directionIndex = 0
  let row = 0,
    col = 0
  let pathIndex = 0

  for (let i = 0; i < boardSize * boardSize; i++) {
    const currentRowArray = visited[row]
    if (currentRowArray) {
      currentRowArray[col] = true
    }
    const nextPlannedRow = row + (directions[directionIndex]?.[0] ?? 0)
    const nextPlannedCol = col + (directions[directionIndex]?.[1] ?? 0)
    let currentDirection: 'right' | 'down' | 'left' | 'up' | null = directionNames[directionIndex] || null

    path.push({
      id: pathIndex++,
      x: col,
      y: row,
      type: 'path',
      direction: null,
    })

    if (i === boardSize * boardSize - 1) {
      const lastCell = path[path.length - 1]
      if (lastCell) {
        lastCell.direction = null
      }
      break
    }

    if (
      nextPlannedRow < 0 ||
      nextPlannedRow >= boardSize ||
      nextPlannedCol < 0 ||
      nextPlannedCol >= boardSize ||
      visited[nextPlannedRow]?.[nextPlannedCol]
    ) {
      directionIndex = (directionIndex + 1) % 4
      currentDirection = directionNames[directionIndex] || null
    }

    const currentCell = path[path.length - 1]
    if (currentCell) {
      currentCell.direction = currentDirection
    }
    row += directions[directionIndex]?.[0] ?? 0
    col += directions[directionIndex]?.[1] ?? 0
  }

  // 设置起点和终点
  if (path.length > 0) {
    const firstCell = path[0]
    const lastCell = path[path.length - 1]
    if (firstCell) {
      firstCell.type = 'start'
    }
    if (lastCell) {
      lastCell.type = 'end'
    }
  }

  // 设置特殊格子
  const numStars = 13
  const numTraps = 16

  const availableIndices = []
  for (let i = 2; i < path.length - 2; i++) {
    availableIndices.push(i)
  }

  const shuffled = shuffleArray(availableIndices)

  for (let i = 0; i < numStars && i < shuffled.length; i++) {
    const index = shuffled[i]
    if (index !== undefined) {
      const cell = path[index]
      if (cell) {
        cell.type = 'star'
      }
    }
  }

  for (let i = numStars; i < numStars + numTraps && i < shuffled.length; i++) {
    const index = shuffled[i]
    if (index !== undefined) {
      const cell = path[index]
      if (cell) {
        cell.type = 'trap'
      }
    }
  }

  return path
}
