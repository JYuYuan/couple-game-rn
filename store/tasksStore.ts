import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { TaskCategory, TaskSet, TasksState } from '@/types/tasks'
import { getStorage } from '@/utils/storage'
import { getSystemTasksForLanguage, Language } from '@/utils/systemTasks'

// 获取默认分类的函数，支持国际化
export const getDefaultCategories = (): TaskCategory[] => [
  {
    id: '1',
    name: 'categories.daily.name',
    description: 'categories.daily.description',
    color: '#FF6B6B',
    icon: 'heart',
    createdAt: new Date(),
  },
  {
    id: '2',
    name: 'categories.sweet.name',
    description: 'categories.sweet.description',
    color: '#4ECDC4',
    icon: 'gift',
    createdAt: new Date(),
  },
  {
    id: '3',
    name: 'categories.challenge.name',
    description: 'categories.challenge.description',
    color: '#45B7D1',
    icon: 'game-controller',
    createdAt: new Date(),
  },
]

const defaultCategories = getDefaultCategories()

type TasksStoreType = () => TasksState

let tasksStoreInstance: TasksStoreType | null = null

export const useTasksStore: TasksStoreType = (() => {
  if (tasksStoreInstance) {
    return tasksStoreInstance
  }

  tasksStoreInstance = create<TasksState>()(
    persist(
      (set, get) => ({
        categories: [],
        taskSets: [],

        addCategory: (category) =>
          set((state) => ({
            categories: [
              ...state.categories,
              {
                ...category,
                id: Date.now().toString(),
                createdAt: new Date(),
              },
            ],
          })),

        updateCategory: (id, category) =>
          set((state) => ({
            categories: state.categories.map((cat) =>
              cat.id === id ? { ...cat, ...category } : cat,
            ),
          })),

        deleteCategory: (id) =>
          set((state) => ({
            categories: state.categories.filter((cat) => cat.id !== id),
            taskSets: state.taskSets.filter((taskSet) => taskSet.categoryId !== id),
          })),

        addTaskSet: (taskSet) =>
          set((state) => ({
            taskSets: [
              ...state.taskSets,
              {
                ...taskSet,
                id: Date.now().toString(),
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          })),

        updateTaskSet: (id, taskSet) =>
          set((state) => ({
            taskSets: state.taskSets.map((set) =>
              set.id === id ? { ...set, ...taskSet, updatedAt: new Date() } : set,
            ),
          })),

        deleteTaskSet: (id) =>
          set((state) => ({
            taskSets: state.taskSets.filter((taskSet) => taskSet.id !== id),
          })),

        toggleTaskSetActive: (id) =>
          set((state) => ({
            taskSets: state.taskSets.map((taskSet) =>
              taskSet.id === id
                ? { ...taskSet, isActive: !taskSet.isActive, updatedAt: new Date() }
                : taskSet,
            ),
          })),

        addTaskToSet: (taskSetId, task) =>
          set((state) => ({
            taskSets: state.taskSets.map((taskSet) =>
              taskSet.id === taskSetId
                ? {
                    ...taskSet,
                    tasks: [...taskSet.tasks, task],
                    updatedAt: new Date(),
                  }
                : taskSet,
            ),
          })),

        removeTaskFromSet: (taskSetId, taskIndex) =>
          set((state) => ({
            taskSets: state.taskSets.map((taskSet) =>
              taskSet.id === taskSetId
                ? {
                    ...taskSet,
                    tasks: taskSet.tasks.filter((_, index) => index !== taskIndex),
                    updatedAt: new Date(),
                  }
                : taskSet,
            ),
          })),

        updateTaskInSet: (taskSetId, taskIndex, task) =>
          set((state) => ({
            taskSets: state.taskSets.map((taskSet) =>
              taskSet.id === taskSetId
                ? {
                    ...taskSet,
                    tasks: taskSet.tasks.map((t, index) => (index === taskIndex ? task : t)),
                    updatedAt: new Date(),
                  }
                : taskSet,
            ),
          })),

        initializeDefaultData: () =>
          set((state) => {
            // 保留所有自定义任务集（type === 'custom'）
            const customTaskSets = state.taskSets.filter((ts) => ts.type === 'custom')

            return {
              // 只在categories为空时才设置默认分类
              categories: state.categories.length === 0 ? defaultCategories : state.categories,
              // 保留自定义任务集，重置系统任务集
              taskSets: customTaskSets,
            }
          }),

        // 更新分类的国际化显示名称
        updateCategoriesI18n: (getLocalizedCategories: () => TaskCategory[]) =>
          set((state) => {
            const localizedCategories = getLocalizedCategories()
            return {
              categories: state.categories.map((category) => {
                const localized = localizedCategories.find((lc) => lc.id === category.id)
                return localized
                  ? { ...category, name: localized.name, description: localized.description }
                  : category
              }),
            }
          }),

        loadSystemTasks: async (language: Language = 'zh') => {
          try {
            const { taskSets } = get()
            const systemConfigs = getSystemTasksForLanguage(language)

            // 移除旧的系统任务集
            const customTaskSets = taskSets.filter((ts) => ts.type === 'custom')

            // 创建新的系统任务集
            const newSystemTaskSets: TaskSet[] = []

            for (const config of systemConfigs) {
              if (Array.isArray(config.tasks) && config.tasks.length > 0) {
                newSystemTaskSets.push({
                  id: `system_${config.fileName}_${language}`,
                  name: config.name,
                  description: config.description,
                  difficulty: 'normal',
                  type: 'system',
                  categoryId: config.categoryId,
                  categoryName: '',
                  categoryIcon: '',
                  categoryColor: '',
                  categoryDescription: '',
                  tasks: config.tasks,
                  isActive: true,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                })
              }
            }

            // 合并自定义任务集和新的系统任务集
            set(() => ({
              taskSets: [...customTaskSets, ...newSystemTaskSets],
            }))
          } catch (error) {
            console.error('Failed to load system tasks:', error)
          }
        },

        importTaskSet: (data) => {
          const { categories, addTaskSet } = get()

          let categoryId = data.categoryId

          // 检查categoryId是否存在
          if (categoryId) {
            const categoryExists = categories.some((cat) => cat.id === categoryId)
            if (!categoryExists) {
              // 如果分类不存在，尝试根据categoryId创建新分类
              const newCategory: TaskCategory = {
                id: categoryId,
                name: data.categoryName || `导入分类 ${categoryId}`,
                description: data.categoryDescription || '从导入任务集自动创建的分类',
                color: data.categoryColor || '#45B7D1',
                icon: (data.categoryIcon as any) || 'folder',
                createdAt: new Date(),
              }

              // 添加新分类，但不生成新ID，使用原来的ID
              set((state) => ({
                categories: [...state.categories, newCategory],
              }))
            }
          } else {
            // 如果没有categoryId，使用第一个可用分类
            categoryId = categories.length > 0 ? categories[0].id : '1'
          }

          // 获取分类信息填充到 TaskSet 中
          const category = categories.find((cat) => cat.id === categoryId)

          addTaskSet({
            name: data.name || '导入的任务集',
            description: data.description || '',
            difficulty: data.difficulty || 'normal',
            categoryName: category?.name || '',
            categoryIcon: category?.icon || '',
            categoryColor: category?.color || '',
            categoryDescription: category?.description || '',
            type: 'custom',
            categoryId: categoryId,
            tasks: data.tasks,
            isActive: data.isActive ?? true,
          })
        },

        exportTaskSet: (id) => {
          const { taskSets } = get()
          return taskSets.find((taskSet) => taskSet.id === id) || null
        },
      }),
      {
        name: 'tasks-storage',
        storage: createJSONStorage(() => getStorage()),
        partialize: (state) => ({
          categories: state.categories,
          taskSets: state.taskSets,
        }),
      },
    ),
  )

  return tasksStoreInstance
})()
