import React, { useEffect, useState } from 'react'
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { TaskSet } from '@/types/tasks'
import { useTasksStore } from '@/store/tasksStore'
import * as Clipboard from 'expo-clipboard'
import toast from '@/utils/toast'
import { usePageBase } from '@/hooks/usePageBase'
import { gameModeTaskService } from '@/server'
import { useAIConfig } from '@/hooks/useAIConfig'
import { showConfirmDialog } from '@/components/ConfirmDialog'
import { useSettingsStore } from '@/store'

interface TaskSetModalProps {
  visible: boolean
  onClose: () => void
  taskSet?: TaskSet | null
}

export const TaskSetModal: React.FC<TaskSetModalProps> = ({ visible, onClose, taskSet = null }) => {
  const { colors, t, colorScheme } = usePageBase()
  const { categories, addTaskSet, updateTaskSet } = useTasksStore()
  const { isAIEnabled, isLoading: aiLoading } = useAIConfig()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: categories[0]?.id || '',
    tasks: [''],
  })

  const [loading, setLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const { languageMode } = useSettingsStore()

  useEffect(() => {
    if (taskSet) {
      setFormData({
        name: taskSet.name,
        description: taskSet.description || '',
        categoryId: taskSet.categoryId,
        tasks:
          taskSet.tasks.length > 0
            ? taskSet.tasks.map((task) => (typeof task === 'string' ? task : task.title || ''))
            : [''],
      })
    } else {
      setFormData({
        name: '',
        description: '',
        categoryId: categories[0]?.id || '',
        tasks: [''],
      })
    }
  }, [taskSet, categories, visible])

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error(
        t('taskSetModal.alerts.nameRequired.title', '提示'),
        t('taskSetModal.alerts.nameRequired.message', '请输入任务集名称'),
      )
      return
    }

    if (formData.tasks.every((task) => !task.trim())) {
      toast.error(
        t('taskSetModal.alerts.nameRequired.title', '提示'),
        t('taskSetModal.alerts.tasksRequired.message', '请至少添加一个任务'),
      )
      return
    }

    setLoading(true)
    try {
      const validTasks = formData.tasks.filter((task) => task.trim())

      if (taskSet) {
        if (taskSet.type === 'system') {
          // 系统任务编辑时创建新的自定义任务
          addTaskSet({
            name: formData.name.trim(),
            description: formData.description.trim(),
            difficulty: 'normal',
            type: 'custom',
            categoryId: formData.categoryId,
            tasks: validTasks,
            isActive: true,
          })
        } else {
          // 自定义任务正常更新
          updateTaskSet(taskSet.id, {
            name: formData.name.trim(),
            description: formData.description.trim(),
            categoryId: formData.categoryId,
            tasks: validTasks,
          })
        }
      } else {
        // 新建任务集
        addTaskSet({
          name: formData.name.trim(),
          description: formData.description.trim(),
          difficulty: 'normal',
          type: 'custom',
          categoryId: formData.categoryId,
          tasks: validTasks,
          isActive: true,
        })
      }

      onClose()
    } catch {
      toast.error(
        t('taskSetModal.alerts.saveError.title', '错误'),
        t('taskSetModal.alerts.saveError.message', '保存失败，请重试'),
      )
    } finally {
      setLoading(false)
    }
  }

  const addTask = () => {
    setFormData((prev) => ({
      ...prev,
      tasks: [...prev.tasks, ''],
    }))
  }

  const removeTask = (index: number) => {
    if (formData.tasks.length <= 1) return
    setFormData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index),
    }))
  }

  const updateTask = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task, i) => (i === index ? value : task)),
    }))
  }

  const pasteFromClipboard = async () => {
    try {
      const clipboardText = await Clipboard.getStringAsync()

      if (!clipboardText.trim()) {
        toast.info(
          t('taskSetModal.alerts.nameRequired.title', '提示'),
          t('taskSetModal.alerts.clipboardEmpty.message', '剪切板为空'),
        )
        return
      }

      // 按换行符分割并过滤空行
      const pastedTasks = clipboardText
        .split('\n')
        .map((task) => task.trim())
        .filter((task) => task.length > 0)

      if (pastedTasks.length === 0) {
        toast.info(
          t('taskSetModal.alerts.nameRequired.title', '提示'),
          t('taskSetModal.alerts.clipboardNoTasks.message', '剪切板中没有有效的任务内容'),
        )
        return
      }

      // 如果当前只有一个空任务，则替换它
      if (formData.tasks.length === 1 && !formData.tasks[0].trim()) {
        setFormData((prev) => ({
          ...prev,
          tasks: pastedTasks,
        }))
      } else {
        // 否则追加到现有任务后面
        setFormData((prev) => ({
          ...prev,
          tasks: [...prev.tasks, ...pastedTasks],
        }))
      }

      toast.success(
        t('taskSetModal.alerts.pasteSuccess.title', '成功'),
        t('taskSetModal.alerts.pasteSuccess.message', '已粘贴 {{count}} 个任务', {
          count: pastedTasks.length,
        }),
      )
    } catch {
      toast.error(
        t('taskSetModal.alerts.pasteError.title', '错误'),
        t('taskSetModal.alerts.pasteError.message', '粘贴失败，请重试'),
      )
    }
  }

  // AI 生成任务
  const handleAIGenerate = async () => {
    // 检查名称和描述
    if (!formData.name.trim()) {
      toast.error(
        t('taskSetModal.alerts.nameRequired.title', '提示'),
        t('taskSetModal.alerts.nameRequired.message', '请先输入任务集名称'),
      )
      return
    }

    // 检查 AI 是否启用
    if (!isAIEnabled) {
      await showConfirmDialog({
        title: t('taskSetModal.aiGenerate.disabled.title', 'AI 未启用'),
        message: t('taskSetModal.aiGenerate.disabled.message', '请先在设置中配置并启用 AI 功能'),
        confirmText: t('common.ok', '确定'),
        cancelText: false,
        icon: 'alert-circle-outline',
        iconColor: '#FF9500',
      })
      return
    }

    // 确认对话框
    const confirm = await showConfirmDialog({
      title: t('taskSetModal.aiGenerate.confirm.title', 'AI 生成任务'),
      message: t(
        'taskSetModal.aiGenerate.confirm.message',
        '将使用 AI 为"{{name}}"生成 50 个任务。这将替换当前的任务列表，是否继续？',
        { name: formData.name },
      ),
      confirmText: t('taskSetModal.aiGenerate.confirm.yes', '开始生成'),
      cancelText: t('common.cancel', '取消'),
      icon: 'sparkles-outline',
      iconColor: '#F59E0B',
    })

    if (!confirm) return

    // 开始生成
    setIsGenerating(true)
    try {
      const tasks = await gameModeTaskService.generateTasks({
        name: formData.name,
        description: formData.description || '',
        count: 50,
        language: languageMode,
        difficulty: 'normal',
      })

      if (tasks.length === 0) {
        toast.error(
          t('taskSetModal.aiGenerate.failed.title', '生成失败'),
          t('taskSetModal.aiGenerate.failed.message', 'AI 生成任务失败，请检查网络连接或稍后重试'),
        )
        return
      }

      // 更新任务列表
      setFormData((prev) => ({
        ...prev,
        tasks,
      }))

      // 成功提示
      toast.success(
        t('taskSetModal.aiGenerate.success.title', '生成成功'),
        t('taskSetModal.aiGenerate.success.message', '成功生成 {{count}} 个任务！', {
          count: tasks.length,
        }),
      )
    } catch (error) {
      console.error('AI generation error:', error)
      toast.error(
        t('taskSetModal.aiGenerate.error.title', '发生错误'),
        t('taskSetModal.aiGenerate.error.message', '生成任务时发生错误，请重试'),
      )
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.modalBackground }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.settingsText }]}>
              {taskSet
                ? taskSet.type === 'system'
                  ? t('taskSetModal.copyFromSystem', '基于系统任务创建')
                  : t('taskSetModal.edit', '编辑任务集')
                : t('taskSetModal.create', '创建任务集')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.settingsSecondaryText} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            bounces={true}
            nestedScrollEnabled={Platform.OS === 'web'}
          >
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.settingsText }]}>
                {t('taskSetModal.name', '名称')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.settingsCardBackground,
                    borderColor: colorScheme === 'light' ? '#E5E5E5' : colors.settingsCardBorder,
                    color: colors.settingsText,
                  },
                ]}
                value={formData.name}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
                placeholder={t('taskSetModal.namePlaceholder', '输入任务集名称')}
                placeholderTextColor={colors.settingsSecondaryText}
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.settingsText }]}>
                {t('taskSetModal.description', '描述')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.settingsCardBackground,
                    borderColor: colorScheme === 'light' ? '#E5E5E5' : colors.settingsCardBorder,
                    color: colors.settingsText,
                    minHeight: 60,
                  },
                ]}
                value={formData.description}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
                placeholder={t('taskSetModal.descriptionPlaceholder', '输入任务集描述（可选）')}
                placeholderTextColor={colors.settingsSecondaryText}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.settingsText }]}>
                {t('taskSetModal.category', '分类')}
              </Text>
              <View
                style={[
                  styles.pickerContainer,
                  {
                    backgroundColor: colors.settingsCardBackground,
                    borderColor: colorScheme === 'light' ? '#E5E5E5' : colors.settingsCardBorder,
                  },
                ]}
              >
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.pickerOption,
                      formData.categoryId === category.id && {
                        backgroundColor: category.color + '20',
                      },
                    ]}
                    onPress={() => setFormData((prev) => ({ ...prev, categoryId: category.id }))}
                  >
                    <Ionicons
                      name={category.icon as keyof typeof Ionicons.glyphMap}
                      size={16}
                      color={category.color}
                    />
                    <Text
                      style={[
                        styles.pickerText,
                        {
                          color:
                            formData.categoryId === category.id
                              ? category.color
                              : colors.settingsText,
                        },
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.taskHeader}>
                <Text style={[styles.label, { color: colors.settingsText }]}>
                  {t('taskSetModal.taskList', '任务列表')}
                </Text>
                <View style={styles.taskHeaderButtons}>
                  {/* AI 生成按钮 */}
                  <TouchableOpacity
                    style={[
                      styles.aiButton,
                      { backgroundColor: '#F59E0B' + '20' },
                      isGenerating && styles.buttonDisabled,
                    ]}
                    onPress={handleAIGenerate}
                    disabled={isGenerating || aiLoading}
                  >
                    {isGenerating ? (
                      <ActivityIndicator size="small" color="#F59E0B" />
                    ) : (
                      <Ionicons name="sparkles" size={20} color="#F59E0B" />
                    )}
                    <Text style={[styles.aiButtonText, { color: '#F59E0B' }]}>
                      {isGenerating
                        ? t('taskSetModal.aiGenerating', '生成中...')
                        : t('taskSetModal.aiGenerated', 'AI 生成')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.settingsAccent + '20' }]}
                    onPress={addTask}
                  >
                    <Ionicons name="add" size={20} color={colors.settingsAccent} />
                    <Text style={[styles.addButtonText, { color: colors.settingsAccent }]}>
                      {t('taskSetModal.addTask', '添加任务')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pasteButton, { backgroundColor: '#4ECDC4' + '20' }]}
                    onPress={pasteFromClipboard}
                  >
                    <Ionicons name="clipboard" size={20} color="#4ECDC4" />
                    <Text style={[styles.pasteButtonText, { color: '#4ECDC4' }]}>
                      {t('taskSetModal.paste', '粘贴')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {formData.tasks.map((task, index) => (
                <View key={index} style={styles.taskRow}>
                  <TextInput
                    style={[
                      styles.taskInput,
                      {
                        backgroundColor: colors.settingsCardBackground,
                        borderColor:
                          colorScheme === 'light' ? '#E5E5E5' : colors.settingsCardBorder,
                        color: colors.settingsText,
                      },
                    ]}
                    value={task}
                    onChangeText={(text) => updateTask(index, text)}
                    placeholder={t('taskSetModal.taskPlaceholder', '任务 {{index}}', {
                      index: index + 1,
                    })}
                    placeholderTextColor={colors.settingsSecondaryText}
                    multiline
                  />
                  {formData.tasks.length > 1 && (
                    <TouchableOpacity
                      style={[styles.removeButton, { backgroundColor: '#FF6B6B' + '20' }]}
                      onPress={() => removeTask(index)}
                    >
                      <Ionicons name="trash" size={16} color="#FF6B6B" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                { backgroundColor: colors.settingsCardBackground },
              ]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: colors.settingsSecondaryText }]}>
                {t('taskSetModal.cancel', '取消')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, { backgroundColor: colors.settingsAccent }]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: 'white' }]}>
                {loading ? t('taskSetModal.saving', '保存中...') : t('taskSetModal.save', '保存')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modal: {
    width: '100%',
    maxHeight: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    // Web 端确保圆角生效
    ...(Platform.OS === 'web' &&
      ({
        overflow: 'hidden',
      } as any)),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
    maxHeight: 500,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  pickerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  taskHeader: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskHeaderButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  aiButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  pasteButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  taskInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    minHeight: 40,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {},
  saveButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
})
