import {useEffect, useState} from 'react';
import {useTasksStore} from '@/store/tasksStore';
import {Task, TaskSet} from '@/types/tasks';

interface GameTask {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    reward?: number;
}

export const useGameTasks = (taskSetId?: string) => {
    const {taskSets, categories} = useTasksStore();
    const [currentTasks, setCurrentTasks] = useState<GameTask[]>([]);
    const [selectedTaskSet, setSelectedTaskSet] = useState<TaskSet | null>(null);

    useEffect(() => {
        // 根据游戏模式获取对应的任务集
        loadTasksForMode(taskSetId);
    }, [taskSetId]);

    const loadTasksForMode = (targetTaskSetId?: string) => {
        const targetTaskSets: TaskSet | undefined = taskSets.find(item => item.id === targetTaskSetId);
        // 随机选择一个任务集
        if (targetTaskSets && targetTaskSets?.tasks.length > 0) {
            setSelectedTaskSet(targetTaskSets);

            // 转换任务格式
            const gameTasks: GameTask[] = targetTaskSets?.tasks.map((task: string | Task, index: number) => ({
                id: `${targetTaskSets?.id}-${index}`,
                title: typeof task === 'string' ? task : task.title || '',
                description: typeof task === 'object' && task.description ? task.description : '',
                category: targetTaskSets?.categoryId,
                difficulty: targetTaskSets?.difficulty,
                reward: getDifficultyReward(targetTaskSets?.difficulty)
            }));

            setCurrentTasks(gameTasks);
        }
    };

    const getDifficultyReward = (difficulty: string): number => {
        switch (difficulty) {
            case 'easy':
                return 10;
            case 'normal':
                return 20;
            case 'hard':
                return 30;
            case 'extreme':
                return 50;
            default:
                return 15;
        }
    };

    const getRandomTask = (): GameTask | null => {

        console.log('getRandomTask 被调用，当前任务数量：', currentTasks.length);
        if (currentTasks.length === 0) {
            console.log('没有可用任务');
            return null;
        }
        const randomIndex = Math.floor(Math.random() * currentTasks.length);
        const randomTask = currentTasks[randomIndex];

        // 获取任务的同时从列表中删除
        setCurrentTasks(prevTasks => prevTasks.filter((_, index) => index !== randomIndex));

        console.log('随机选择的任务：', randomTask);
        return randomTask;
    };

    const getCategoryInfo = () => {
        if (!selectedTaskSet) return null;
        return categories.find(cat => cat.id === selectedTaskSet.categoryId);
    };

    const refreshTasks = () => {
        loadTasksForMode(taskSetId);
    };

    return {
        currentTasks,
        selectedTaskSet,
        categoryInfo: getCategoryInfo(),
        getRandomTask,
        refreshTasks,
        tasksCount: currentTasks.length
    };
};