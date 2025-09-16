import { getSystemTasksForLanguage } from '../utils/systemTasks';

// 测试多语言任务加载
console.log('=== 测试中文任务 ===');
const zhTasks = getSystemTasksForLanguage('zh');
console.log(`中文任务集数量: ${zhTasks.length}`);
zhTasks.forEach(config => {
  console.log(`- ${config.name}: ${config.tasks.length} 个任务`);
});

console.log('\n=== 测试英文任务 ===');
const enTasks = getSystemTasksForLanguage('en');
console.log(`英文任务集数量: ${enTasks.length}`);
enTasks.forEach(config => {
  console.log(`- ${config.name}: ${config.tasks.length} 个任务`);
});

console.log('\n=== 测试日文任务 ===');
const jaTasks = getSystemTasksForLanguage('ja');
console.log(`日文任务集数量: ${jaTasks.length}`);
jaTasks.forEach(config => {
  console.log(`- ${config.name}: ${config.tasks.length} 个任务`);
});