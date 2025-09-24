export function getRandomColor() {
  return (
    '#' +
    Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0')
  )
}

export function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export function shuffleArray(array) {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}

export const createBoardPath = () => {
  const boardSize = 7
  const path = []
  const visited = Array(boardSize)
    .fill(null)
    .map(() => Array(boardSize).fill(false))

  const directions = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0], // 右、下、左、上
  ]
  const directionNames = ['right', 'down', 'left', 'up']

  let directionIndex = 0
  let row = 0,
    col = 0
  let pathIndex = 0

  for (let i = 0; i < boardSize * boardSize; i++) {
    visited[row][col] = true
    const nextPlannedRow = row + directions[directionIndex][0]
    const nextPlannedCol = col + directions[directionIndex][1]
    let currentDirection = directionNames[directionIndex]

    path.push({
      id: pathIndex++,
      x: col,
      y: row,
      type: 'path',
      direction: null,
    })

    if (i === boardSize * boardSize - 1) {
      path[path.length - 1].direction = null
      break
    }

    if (
      nextPlannedRow < 0 ||
      nextPlannedRow >= boardSize ||
      nextPlannedCol < 0 ||
      nextPlannedCol >= boardSize ||
      visited[nextPlannedRow][nextPlannedCol]
    ) {
      directionIndex = (directionIndex + 1) % 4
      currentDirection = directionNames[directionIndex]
    }

    path[path.length - 1].direction = currentDirection
    row += directions[directionIndex][0]
    col += directions[directionIndex][1]
  }

  // 设置起点和终点
  if (path.length > 0) {
    path[0].type = 'start'
    path[path.length - 1].type = 'end'
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
    path[shuffled[i]].type = 'star'
  }

  for (let i = numStars; i < numStars + numTraps && i < shuffled.length; i++) {
    path[shuffled[i]].type = 'trap'
  }

  return path
}
