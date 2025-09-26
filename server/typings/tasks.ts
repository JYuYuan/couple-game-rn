export type TaskDifficulty = 'easy' | 'normal' | 'hard' | 'extreme'

export type TaskType = 'system' | 'custom'

export interface TaskSet {
  id: string
  name: string
  description?: string
  difficulty: TaskDifficulty
  categoryName?: string
  categoryIcon?: string
  categoryColor?: string
  categoryDescription?: string
  type: TaskType
  categoryId: string
  tasks: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
