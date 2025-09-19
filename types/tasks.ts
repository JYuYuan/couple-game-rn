export type TaskDifficulty = 'easy' | 'normal' | 'hard' | 'extreme';

export type TaskType = 'system' | 'custom';

export interface Task {
    title?: string;
    description?: string;
}

export interface TaskCategory {
    id: string;
    name: string;
    description?: string;
    color: string;
    icon: string;
    createdAt: Date;
}

export interface TaskSet {
    id: string;
    name: string;
    description?: string;
    difficulty: TaskDifficulty;
    categoryName?: string;
    categoryIcon?: string;
    categoryColor?: string;
    categoryDescription?: string;
    type: TaskType;
    categoryId: string;
    tasks: (string | Task)[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface TasksState {
    categories: TaskCategory[];
    taskSets: TaskSet[];

    // 分类管理
    addCategory: (category: Omit<TaskCategory, 'id' | 'createdAt'>) => void;
    updateCategory: (id: string, category: Partial<TaskCategory>) => void;
    deleteCategory: (id: string) => void;

    // 任务集管理
    addTaskSet: (taskSet: Omit<TaskSet, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateTaskSet: (id: string, taskSet: Partial<TaskSet>) => void;
    deleteTaskSet: (id: string) => void;
    toggleTaskSetActive: (id: string) => void;

    // 任务管理
    addTaskToSet: (taskSetId: string, task: string) => void;
    removeTaskFromSet: (taskSetId: string, taskIndex: number) => void;
    updateTaskInSet: (taskSetId: string, taskIndex: number, task: string) => void;

    // 初始化数据
    initializeDefaultData: () => void;
    updateCategoriesI18n: (getLocalizedCategories: () => TaskCategory[]) => void;
    loadSystemTasks: (language?: 'zh' | 'en' | 'ja') => Promise<void>;

    // 导入导出
    importTaskSet: (data: Partial<TaskSet> & { tasks: string[] }) => void;
    exportTaskSet: (id: string) => TaskSet | null;
}