import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';
import {TaskCategory, TaskSet, TasksState} from '@/types/tasks';
import {getStorage} from '@/utils/storage';
import {getSystemTasksForLanguage, Language} from '@/utils/systemTasks';

// 静态默认分类（不依赖i18n，在组件中动态获取翻译）
const staticDefaultCategories: TaskCategory[] = [
  {
    id: '1',
    name: '日常互动',
    description: '温馨日常的互动任务',
    color: '#FF6B6B',
    icon: 'heart',
    createdAt: new Date(),
  },
  {
    id: '2',
    name: '甜蜜时光',
    description: '增进感情的甜蜜任务',
    color: '#4ECDC4',
    icon: 'gift',
    createdAt: new Date(),
  },
  {
    id: '3',
    name: '趣味挑战',
    description: '有趣的挑战任务',
    color: '#45B7D1',
    icon: 'game-controller',
    createdAt: new Date(),
  }
];

// 获取国际化的默认分类（在组件中调用）
export const getDefaultCategories = (): TaskCategory[] => [
  {
    id: '1',
    name: '日常互动', // 组件中使用时会被国际化文本替换
    description: '温馨日常的互动任务',
    color: '#FF6B6B',
    icon: 'heart',
    createdAt: new Date(),
  },
  {
    id: '2',
    name: '甜蜜时光',
    description: '增进感情的甜蜜任务',
    color: '#4ECDC4',
    icon: 'gift',
    createdAt: new Date(),
  },
  {
    id: '3',
    name: '趣味挑战',
    description: '有趣的挑战任务',
    color: '#45B7D1',
    icon: 'game-controller',
    createdAt: new Date(),
  }
];

const defaultCategories = staticDefaultCategories;


const defaultTaskSets: TaskSet[] = [];

type TasksStoreType = () => TasksState;

let tasksStoreInstance: TasksStoreType | null = null;

export const useTasksStore: TasksStoreType = (() => {
    if (tasksStoreInstance) {
        return tasksStoreInstance;
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
                            }
                        ]
                    })),

                updateCategory: (id, category) =>
                    set((state) => ({
                        categories: state.categories.map((cat) =>
                            cat.id === id ? {...cat, ...category} : cat
                        )
                    })),

                deleteCategory: (id) =>
                    set((state) => ({
                        categories: state.categories.filter((cat) => cat.id !== id),
                        taskSets: state.taskSets.filter((taskSet) => taskSet.categoryId !== id)
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
                            }
                        ]
                    })),

                updateTaskSet: (id, taskSet) =>
                    set((state) => ({
                        taskSets: state.taskSets.map((set) =>
                            set.id === id
                                ? {...set, ...taskSet, updatedAt: new Date()}
                                : set
                        )
                    })),

                deleteTaskSet: (id) =>
                    set((state) => ({
                        taskSets: state.taskSets.filter((taskSet) => taskSet.id !== id)
                    })),

                toggleTaskSetActive: (id) =>
                    set((state) => ({
                        taskSets: state.taskSets.map((taskSet) =>
                            taskSet.id === id
                                ? {...taskSet, isActive: !taskSet.isActive, updatedAt: new Date()}
                                : taskSet
                        )
                    })),

                addTaskToSet: (taskSetId, task) =>
                    set((state) => ({
                        taskSets: state.taskSets.map((taskSet) =>
                            taskSet.id === taskSetId
                                ? {
                                    ...taskSet,
                                    tasks: [...taskSet.tasks, task],
                                    updatedAt: new Date()
                                }
                                : taskSet
                        )
                    })),

                removeTaskFromSet: (taskSetId, taskIndex) =>
                    set((state) => ({
                        taskSets: state.taskSets.map((taskSet) =>
                            taskSet.id === taskSetId
                                ? {
                                    ...taskSet,
                                    tasks: taskSet.tasks.filter((_, index) => index !== taskIndex),
                                    updatedAt: new Date()
                                }
                                : taskSet
                        )
                    })),

                updateTaskInSet: (taskSetId, taskIndex, task) =>
                    set((state) => ({
                        taskSets: state.taskSets.map((taskSet) =>
                            taskSet.id === taskSetId
                                ? {
                                    ...taskSet,
                                    tasks: taskSet.tasks.map((t, index) =>
                                        index === taskIndex ? task : t
                                    ),
                                    updatedAt: new Date()
                                }
                                : taskSet
                        )
                    })),

                initializeDefaultData: () =>
                    set(() => ({
                        categories: defaultCategories,
                        taskSets: defaultTaskSets,
                    })),

                // 更新分类的国际化显示名称
                updateCategoriesI18n: (getLocalizedCategories: () => TaskCategory[]) =>
                    set((state) => {
                        const localizedCategories = getLocalizedCategories();
                        return {
                            categories: state.categories.map(category => {
                                const localized = localizedCategories.find(lc => lc.id === category.id);
                                return localized ? { ...category, name: localized.name, description: localized.description } : category;
                            })
                        };
                    }),

                loadSystemTasks: async (language: Language = 'zh') => {
                    try {
                        const {taskSets} = get();
                        const systemConfigs = getSystemTasksForLanguage(language);
                        const newTaskSets: TaskSet[] = [];

                        for (const config of systemConfigs) {
                            // 检查是否已经存在同名的系统任务集
                            const existingTaskSet = taskSets.find(ts => ts.name === config.name && ts.type === 'system');
                            if (existingTaskSet) continue;

                            if (Array.isArray(config.tasks) && config.tasks.length > 0) {
                                newTaskSets.push({
                                    id: `system_${config.fileName}_${Date.now()}`,
                                    name: config.name,
                                    description: config.description,
                                    difficulty: 'normal',
                                    type: 'system',
                                    categoryId: config.categoryId,
                                    tasks: config.tasks,
                                    isActive: true,
                                    createdAt: new Date(),
                                    updatedAt: new Date(),
                                });
                            }
                        }

                        if (newTaskSets.length > 0) {
                            set((state) => ({
                                taskSets: [...state.taskSets, ...newTaskSets]
                            }));
                        }
                    } catch (error) {
                        console.error('Failed to load system tasks:', error);
                    }
                },

                importTaskSet: (data) => {
                    const {addTaskSet} = get();
                    addTaskSet({
                        name: data.name || '导入的任务集',
                        description: data.description || '',
                        difficulty: data.difficulty || 'normal',
                        type: 'custom',
                        categoryId: data.categoryId || '1',
                        tasks: data.tasks,
                        isActive: data.isActive ?? true,
                    });
                },

                exportTaskSet: (id) => {
                    const {taskSets} = get();
                    return taskSets.find((taskSet) => taskSet.id === id) || null;
                },
            }),
            {
                name: 'tasks-storage',
                storage: createJSONStorage(() => getStorage()),
                partialize: (state) => ({
                    categories: state.categories,
                    taskSets: state.taskSets
                }),
            }
        )
    );

    return tasksStoreInstance;
})();