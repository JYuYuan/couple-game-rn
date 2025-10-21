import React, { useEffect, useState } from 'react'
import {
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { Colors } from '@/constants/theme'
import { useTasksStore } from '@/store/tasksStore'
import { useTranslation } from 'react-i18next'
import { TaskCategory, TaskSet } from '@/types/tasks'
import { TaskSetModal } from '@/components/TaskSetModal'
import { CategoryModal } from '@/components/CategoryModal'
import { TaskSetDetailModal } from '@/components/TaskSetDetailModal'
import * as DocumentPicker from 'expo-document-picker'
import { Language } from '@/utils/systemTasks'
import i18n from '@/i18n'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { showConfirmDialog } from '@/components/ConfirmDialog'

const TaskSettings: React.FC = () => {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme] as any

  // 跨平台alert函数
  const showAlert = (title: string, message?: string) => {
    showConfirmDialog({ title, message })
  }

  const {
    categories,
    taskSets,
    deleteTaskSet,
    deleteCategory,
    toggleTaskSetActive,
    initializeDefaultData,
    updateCategoriesI18n,
    loadSystemTasks,
    exportTaskSet,
    importTaskSet,
  } = useTasksStore()

  const [activeTab, setActiveTab] = useState<'taskSets' | 'categories'>('taskSets')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedTaskSet, setSelectedTaskSet] = useState<TaskSet | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | null>(null)

  // 浮动按钮拖拽状态
  const screenWidth = Dimensions.get('window').width
  const screenHeight = Dimensions.get('window').height
  const [fabPosition] = useState(
    new Animated.ValueXY({ x: screenWidth - 76, y: screenHeight - 200 }),
  )

  // 创建拖拽响应器
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      fabPosition.setOffset({
        x: (fabPosition.x as any)._value,
        y: (fabPosition.y as any)._value,
      })
    },
    onPanResponderMove: Animated.event([null, { dx: fabPosition.x, dy: fabPosition.y }], {
      useNativeDriver: false,
    }),
    onPanResponderRelease: () => {
      fabPosition.flattenOffset()

      // 限制边界
      const currentX = (fabPosition.x as any)._value
      const currentY = (fabPosition.y as any)._value

      let newX = Math.max(20, Math.min(screenWidth - 76, currentX))
      let newY = Math.max(100, Math.min(screenHeight - 200, currentY))

      Animated.spring(fabPosition, {
        toValue: { x: newX, y: newY },
        useNativeDriver: false,
      }).start()
    },
  })

  // 初始化默认数据
  useEffect(() => {
    const initializeData = async () => {
      // 初始化默认分类（如果需要）
      initializeDefaultData()

      // 等待i18n准备好后更新分类的国际化文本
      updateCategoriesI18n(() => [
        {
          id: '1',
          name: t('defaultCategories.dailyInteraction.name', '日常互动'),
          description: t('defaultCategories.dailyInteraction.description', '温馨日常的互动任务'),
          color: '#FF6B6B',
          icon: 'heart',
          createdAt: new Date(),
        },
        {
          id: '2',
          name: t('defaultCategories.sweetTime.name', '甜蜜时光'),
          description: t('defaultCategories.sweetTime.description', '增进感情的甜蜜任务'),
          color: '#4ECDC4',
          icon: 'gift',
          createdAt: new Date(),
        },
        {
          id: '3',
          name: t('defaultCategories.funChallenge.name', '趣味挑战'),
          description: t('defaultCategories.funChallenge.description', '有趣的挑战任务'),
          color: '#45B7D1',
          icon: 'game-controller',
          createdAt: new Date(),
        },
      ])

      // 根据当前i18n语言加载系统任务
      const currentLanguage = i18n.language as Language
      await loadSystemTasks(currentLanguage)
    }

    initializeData()
  }, [t, i18n.language]) // 语言变化时重新执行，但store已经能智能保留自定义任务

  const handleDeleteTaskSet = async (taskSet: TaskSet) => {
    const confirmed = await showConfirmDialog({
      title: t('tasks.delete.taskSet.title', '删除确认'),
      message: t(
        'tasks.delete.taskSet.message',
        '确定要删除任务集 "{{name}}" 吗？此操作无法撤销。',
        { name: taskSet.name },
      ),
      confirmText: t('tasks.delete.confirm', '删除'),
      cancelText: t('common.cancel', '取消'),
      destructive: true,
      icon: 'trash-outline',
      iconColor: '#FF6B6B',
    })

    if (confirmed) {
      deleteTaskSet(taskSet.id)
    }
  }

  const handleDeleteCategory = async (category: TaskCategory) => {
    const taskCount = taskSets.filter((set) => set.categoryId === category.id).length

    const confirmed = await showConfirmDialog({
      title: t('tasks.delete.taskSet.title', '删除确认'),
      message: t(
        'tasks.delete.category.message',
        '确定要删除分类 "{{name}}" 吗？{{warning}}此操作无法撤销。',
        {
          name: category.name,
          warning:
            taskCount > 0
              ? t('tasks.delete.category.warning', '这将同时删除该分类下的 {{count}} 个任务集。', {
                  count: taskCount,
                })
              : '',
        },
      ),
      confirmText: t('tasks.delete.confirm', '删除'),
      cancelText: t('common.cancel', '取消'),
      destructive: true,
      icon: 'trash-outline',
      iconColor: '#FF6B6B',
    })

    if (confirmed) {
      deleteCategory(category.id)
    }
  }

  const handleImportTaskSet = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0]

        // 读取文件内容
        const response = await fetch(file.uri)
        const content = await response.text()

        try {
          const importData = JSON.parse(content)

          // 验证数据格式
          if (!importData.tasks || !Array.isArray(importData.tasks)) {
            showAlert(
              t('common.error', '错误'),
              t('tasks.import.error.invalidFormat', '导入的文件格式不正确'),
            )
            return
          }

          // 检查是否需要创建新分类
          const categoryExists =
            importData.categoryId && categories.some((cat) => cat.id === importData.categoryId)
          const willCreateCategory = importData.categoryId && !categoryExists

          // 使用store的importTaskSet方法
          importTaskSet(importData)

          // 生成成功消息
          let successMessage = t('tasks.import.success', '已成功导入任务集: {{name}}', {
            name: importData.name || t('tasks.import.unnamedTaskSet', '未命名任务集'),
          })

          if (willCreateCategory) {
            successMessage += `\n${t('tasks.import.categoryCreated', '同时创建了新分类: {{categoryName}}', { categoryName: importData.categoryName || `分类 ${importData.categoryId}` })}`
          }

          showAlert(t('common.success', '成功'), successMessage)
        } catch {
          showAlert(
            t('common.error', '错误'),
            t('tasks.import.error.invalidContent', '导入的文件内容格式不正确'),
          )
        }
      }
    } catch {
      showAlert(t('common.error', '错误'), t('tasks.import.error.failed', '导入失败'))
    }
  }

  const handleExportTaskSet = async (taskSet: TaskSet) => {
    try {
      const exportData = exportTaskSet(taskSet.id)
      if (exportData) {
        // 查找对应的分类信息
        const category = categories.find((cat) => cat.id === exportData.categoryId)

        // 创建导出数据，包含分类信息以便导入时自动创建分类
        const exportJson = {
          name: exportData.name,
          description: exportData.description,
          difficulty: exportData.difficulty,
          categoryId: exportData.categoryId,
          // 包含分类信息用于自动创建
          categoryName: category?.name,
          categoryDescription: category?.description,
          categoryColor: category?.color,
          categoryIcon: category?.icon,
          tasks: exportData.tasks,
          isActive: exportData.isActive,
          exportedAt: new Date().toISOString(),
          version: '1.0',
        }

        const jsonString = JSON.stringify(exportJson, null, 2)

        const confirmed = await showConfirmDialog({
          title: t('tasks.export.title', '导出任务集'),
          message: t('tasks.export.message', '请选择导出方式'),
          confirmText: t('common.cancel', '取消'),
          cancelText: t('tasks.export.saveToFile', '保存到文件'),
        })

        if (confirmed) await saveToFile(exportData.name, jsonString)
      }
    } catch {
      showAlert(t('common.error', '错误'), t('tasks.export.error', '导出失败'))
    }
  }

  const saveToFile = async (taskSetName: string, content: string) => {
    try {
      // 创建文件名（移除特殊字符）
      let fileName = `${taskSetName}_${new Date().getTime()}.json`

      if (Platform.OS === 'web') {
        // Web端使用浏览器下载
        const blob = new Blob([content], { type: 'application/json' })
        const url = URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        showAlert(
          t('common.success', '成功'),
          t('tasks.export.success.downloaded', '文件已下载到您的设备'),
        )
      } else {
        // fileName = `game_task_${new Date().getTime()}.json`;

        try {
          // 移动端使用expo文件系统legacy API（更稳定）
          const fileUri = FileSystem.cacheDirectory + fileName

          // 写入文件内容
          await FileSystem.writeAsStringAsync(fileUri, content)

          // 验证文件是否创建成功
          const fileInfo = await FileSystem.getInfoAsync(fileUri)
          if (!fileInfo.exists) {
            throw new Error('文件创建失败')
          }

          console.log('文件创建成功，路径:', fileUri)

          // 检查是否支持分享
          if (!(await Sharing.isAvailableAsync())) {
            showAlert(
              t('common.success', '成功'),
              t('tasks.export.success.saved', '文件已保存到: {{fileName}}', { fileName }),
            )
            return
          }

          // 分享文件
          try {
            await Sharing.shareAsync(fileUri)
            showAlert(
              t('common.success', '成功'),
              t('tasks.export.success.exported', '文件已导出并可以保存到您的设备'),
            )
          } catch (shareError) {
            console.warn('分享失败，但文件已保存:', shareError)
            showAlert(
              t('common.success', '成功'),
              t('tasks.export.success.saved', '文件已保存到: {{fileName}}', { fileName }),
            )
          }
        } catch (fileError) {
          console.error('文件操作失败:', fileError)
          throw fileError // 重新抛出错误，让外层catch处理
        }
      }
    } catch (error) {
      console.error('保存文件失败:', error)
      showAlert(t('common.error', '错误'), t('tasks.export.error.saveFailed', '保存文件失败'))
    }
  }

  const TaskSetCard = ({ taskSet }: { taskSet: TaskSet }) => {
    const category = categories.find((cat) => cat.id === taskSet.categoryId)

    const handleCardPress = () => {
      setSelectedTaskSet(taskSet)
      setShowDetailModal(true)
    }

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: colors.homeCardBackground, borderColor: colors.homeCardBorder },
        ]}
        onPress={handleCardPress}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor:
                    taskSet.type === 'system' ? colors.settingsAccent + '20' : '#FF9500' + '20',
                },
              ]}
            >
              <Text
                style={[
                  styles.typeText,
                  { color: taskSet.type === 'system' ? colors.settingsAccent : '#FF9500' },
                ]}
              >
                {taskSet.type === 'system'
                  ? t('tasks.taskSet.type.system', '系统')
                  : t('tasks.taskSet.type.custom', '自定义')}
              </Text>
            </View>
          </View>
          <Text style={[styles.cardTitle, { color: colors.homeCardTitle }]}>{taskSet.name}</Text>
          {taskSet.description && (
            <Text style={[styles.cardDescription, { color: colors.homeCardDescription }]}>
              {taskSet.description}
            </Text>
          )}
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="list" size={16} color={colors.homeCardDescription} />
            <Text style={[styles.infoText, { color: colors.homeCardDescription }]}>
              {t('tasks.taskSet.tasks', '{{count}} 个任务', { count: taskSet.tasks.length })}
            </Text>
          </View>
          {category && (
            <View style={styles.infoRow}>
              <Ionicons name={category.icon as any} size={16} color={category.color} />
              <Text style={[styles.infoText, { color: colors.homeCardDescription }]}>
                {category.name}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: taskSet.isActive ? '#4ECDC4' + '20' : colors.homeCardArrowBg },
            ]}
            onPress={() => toggleTaskSetActive(taskSet.id)}
          >
            <Ionicons
              name={taskSet.isActive ? 'checkmark-circle' : 'pause-circle'}
              size={20}
              color={taskSet.isActive ? '#4ECDC4' : colors.homeCardArrow}
            />
            <Text
              style={[
                styles.actionText,
                { color: taskSet.isActive ? '#4ECDC4' : colors.homeCardArrow },
              ]}
            >
              {taskSet.isActive
                ? t('tasks.taskSet.status.enabled', '已启用')
                : t('tasks.taskSet.status.disabled', '已禁用')}
            </Text>
          </TouchableOpacity>

          <View style={styles.actionButtonGroup}>
            <TouchableOpacity
              style={[styles.iconButtonSmall, { backgroundColor: colors.settingsAccent + '20' }]}
              onPress={() => {
                setSelectedTaskSet(taskSet)
                setShowAddModal(true)
              }}
            >
              <Ionicons name="create" size={18} color={colors.settingsAccent} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconButtonSmall, { backgroundColor: '#4ECDC4' + '20' }]}
              onPress={() => handleExportTaskSet(taskSet)}
            >
              <Ionicons name="share" size={18} color="#4ECDC4" />
            </TouchableOpacity>

            {taskSet.type === 'custom' && (
              <TouchableOpacity
                style={[styles.iconButtonSmall, { backgroundColor: '#FF6B6B' + '20' }]}
                onPress={() => handleDeleteTaskSet(taskSet)}
              >
                <Ionicons name="trash" size={18} color="#FF6B6B" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const CategoryCard = ({ category }: { category: TaskCategory }) => {
    const taskCount = taskSets.filter((set) => set.categoryId === category.id).length

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.homeCardBackground, borderColor: colors.homeCardBorder },
        ]}
      >
        <View style={styles.categoryHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
            <Ionicons name={category.icon as any} size={24} color={category.color} />
          </View>
          <View style={styles.categoryInfo}>
            <Text style={[styles.cardTitle, { color: colors.homeCardTitle }]}>{category.name}</Text>
            {category.description && (
              <Text style={[styles.cardDescription, { color: colors.homeCardDescription }]}>
                {category.description}
              </Text>
            )}
            <Text style={[styles.infoText, { color: colors.homeCardDescription }]}>
              {t('tasks.category.taskSets', '{{count}} 个任务集', { count: taskCount })}
            </Text>
          </View>
          <View style={styles.categoryActions}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.settingsAccent + '20' }]}
              onPress={() => {
                setSelectedCategory(category)
                setShowCategoryModal(true)
              }}
            >
              <Ionicons name="create" size={20} color={colors.settingsAccent} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: '#FF6B6B' + '20' }]}
              onPress={() => handleDeleteCategory(category)}
            >
              <Ionicons name="trash" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.homeBackground }]}>
      {/* 头部 */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: colors.homeTitle }]}>
              {t('tasks.title', '任务管理')}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.homeSubtitle }]}>
              {t('tasks.subtitle', '管理你的游戏任务和分类')}
            </Text>
          </View>
          {activeTab === 'taskSets' && (
            <TouchableOpacity
              style={[styles.importButton, { backgroundColor: colors.settingsAccent }]}
              onPress={handleImportTaskSet}
            >
              <Ionicons name="download" size={20} color="white" />
              <Text style={styles.importButtonText}>{t('tasks.import.title', '导入')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 标签页切换 */}
      <View
        style={[
          styles.tabContainer,
          {
            backgroundColor: colors.homeCardBackground,
            borderColor: colors.homeCardBorder,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'taskSets' && { backgroundColor: colors.settingsAccent + '20' },
          ]}
          onPress={() => setActiveTab('taskSets')}
        >
          <Ionicons
            name="list"
            size={20}
            color={activeTab === 'taskSets' ? colors.settingsAccent : colors.homeCardDescription}
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === 'taskSets' ? colors.settingsAccent : colors.homeCardDescription,
              },
            ]}
          >
            {t('tasks.tabs.taskSets', '任务集')}({taskSets.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'categories' && { backgroundColor: colors.settingsAccent + '20' },
          ]}
          onPress={() => setActiveTab('categories')}
        >
          <Ionicons
            name="folder"
            size={20}
            color={activeTab === 'categories' ? colors.settingsAccent : colors.homeCardDescription}
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === 'categories' ? colors.settingsAccent : colors.homeCardDescription,
              },
            ]}
          >
            {t('tasks.tabs.categories', '分类')}({categories.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 内容区域 */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'taskSets' ? (
          <View style={styles.listContainer}>
            {taskSets.map((taskSet) => (
              <TaskSetCard key={taskSet.id} taskSet={taskSet} />
            ))}
            {taskSets.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons
                  name="document-text-outline"
                  size={48}
                  color={colors.homeCardDescription}
                />
                <Text style={[styles.emptyText, { color: colors.homeCardDescription }]}>
                  {t('tasks.empty.taskSets', '暂无任务集，点击右下角按钮创建')}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
            {categories.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="folder-outline" size={48} color={colors.homeCardDescription} />
                <Text style={[styles.emptyText, { color: colors.homeCardDescription }]}>
                  {t('tasks.empty.categories', '暂无分类，点击右下角按钮创建')}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* 浮动添加按钮 */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            transform: [{ translateX: fabPosition.x }, { translateY: fabPosition.y }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.settingsAccent }]}
          onPress={() => {
            if (activeTab === 'taskSets') {
              setSelectedTaskSet(null)
              setShowAddModal(true)
            } else {
              setSelectedCategory(null)
              setShowCategoryModal(true)
            }
          }}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </Animated.View>

      {/* 模态框 */}
      <TaskSetModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setSelectedTaskSet(null)
        }}
        taskSet={selectedTaskSet}
      />

      <CategoryModal
        visible={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false)
          setSelectedCategory(null)
        }}
        category={selectedCategory}
      />

      {/* 任务集详情弹窗 */}
      <TaskSetDetailModal
        visible={showDetailModal}
        taskSet={selectedTaskSet}
        category={
          selectedTaskSet
            ? categories.find((cat) => cat.id === selectedTaskSet.categoryId) || null
            : null
        }
        onClose={() => {
          setShowDetailModal(false)
          setSelectedTaskSet(null)
        }}
        onEdit={() => {
          setShowDetailModal(false)
          setShowAddModal(true)
        }}
        onToggleActive={() => {
          if (selectedTaskSet) {
            toggleTaskSetActive(selectedTaskSet.id)
          }
        }}
        onDelete={() => {
          if (selectedTaskSet) {
            setShowDetailModal(false)
            handleDeleteTaskSet(selectedTaskSet)
          }
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  importButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContainer: {
    paddingBottom: 100,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 14,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonSmall: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  fabContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
})

export default TaskSettings
