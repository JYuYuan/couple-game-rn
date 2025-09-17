import React, {useEffect, useState} from 'react';
import {Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useColorScheme} from '@/hooks/use-color-scheme';
import {Colors} from '@/constants/theme';
import {TaskCategory} from '@/types/tasks';
import {useTasksStore} from '@/store/tasksStore';

interface CategoryModalProps {
  visible: boolean;
  onClose: () => void;
  category?: TaskCategory | null;
}

const ICON_OPTIONS = [
  'heart', 'gift', 'game-controller', 'trophy', 'star', 'flame',
  'sparkles', 'happy', 'thumbs-up', 'diamond', 'rocket', 'music',
  'camera', 'restaurant', 'home', 'car', 'bicycle', 'walk',
];

const COLOR_OPTIONS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D2B4DE',
  '#AED6F1', '#A3E4D7', '#F9E79F', '#FADBD8', '#D5DBDB',
];

export const CategoryModal: React.FC<CategoryModalProps> = ({
  visible,
  onClose,
  category = null,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme] as any;

  const { addCategory, updateCategory } = useTasksStore();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: COLOR_OPTIONS[0],
    icon: ICON_OPTIONS[0],
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        description: category.description || '',
        color: category.color,
        icon: category.icon,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: COLOR_OPTIONS[0],
        icon: ICON_OPTIONS[0],
      });
    }
  }, [category, visible]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('提示', '请输入分类名称');
      return;
    }

    setLoading(true);
    try {
      if (category) {
        updateCategory(category.id, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          color: formData.color,
          icon: formData.icon,
        });
      } else {
        addCategory({
          name: formData.name.trim(),
          description: formData.description.trim(),
          color: formData.color,
          icon: formData.icon,
        });
      }

      onClose();
    } catch (error) {
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={[styles.overlay, { backgroundColor: colors.modalOverlay }]}>
        <View style={[styles.modal, { backgroundColor: colors.modalBackground }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.settingsText }]}>
              {category ? '编辑分类' : '创建分类'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.settingsSecondaryText} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.settingsText }]}>名称</Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: colors.settingsCardBackground,
                  borderColor: colors.settingsCardBorder,
                  color: colors.settingsText,
                }]}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="输入分类名称"
                placeholderTextColor={colors.settingsSecondaryText}
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.settingsText }]}>描述</Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: colors.settingsCardBackground,
                  borderColor: colors.settingsCardBorder,
                  color: colors.settingsText,
                  minHeight: 60,
                }]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="输入分类描述（可选）"
                placeholderTextColor={colors.settingsSecondaryText}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.settingsText }]}>图标</Text>
              <View style={styles.optionsGrid}>
                {ICON_OPTIONS.map((iconName) => (
                  <TouchableOpacity
                    key={iconName}
                    style={[
                      styles.iconOption,
                      {
                        backgroundColor: formData.icon === iconName
                          ? formData.color + '20'
                          : colors.settingsCardBackground,
                        borderColor: formData.icon === iconName
                          ? formData.color
                          : colors.settingsCardBorder,
                      }
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, icon: iconName }))}
                  >
                    <Ionicons
                      name={iconName as any}
                      size={24}
                      color={formData.icon === iconName ? formData.color : colors.settingsText}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.settingsText }]}>颜色</Text>
              <View style={styles.optionsGrid}>
                {COLOR_OPTIONS.map((colorValue) => (
                  <TouchableOpacity
                    key={colorValue}
                    style={[
                      styles.colorOption,
                      {
                        backgroundColor: colorValue,
                        borderColor: formData.color === colorValue
                          ? colors.settingsText
                          : 'transparent',
                        borderWidth: formData.color === colorValue ? 2 : 0,
                      }
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, color: colorValue }))}
                  >
                    {formData.color === colorValue && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.previewSection}>
              <Text style={[styles.label, { color: colors.settingsText }]}>预览</Text>
              <View style={[styles.preview, {
                backgroundColor: colors.settingsCardBackground,
                borderColor: colors.settingsCardBorder,
              }]}>
                <View style={[styles.previewIcon, { backgroundColor: formData.color + '20' }]}>
                  <Ionicons name={formData.icon as any} size={24} color={formData.color} />
                </View>
                <View style={styles.previewInfo}>
                  <Text style={[styles.previewName, { color: colors.settingsText }]}>
                    {formData.name || '分类名称'}
                  </Text>
                  <Text style={[styles.previewDescription, { color: colors.settingsSecondaryText }]}>
                    {formData.description || '分类描述'}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { backgroundColor: colors.settingsCardBackground }]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: colors.settingsSecondaryText }]}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, { backgroundColor: colors.settingsAccent }]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: 'white' }]}>
                {loading ? '保存中...' : '保存'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 16,
    paddingVertical: 20,
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
  section: {
    marginBottom: 20,
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
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewSection: {
    marginBottom: 20,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  previewDescription: {
    fontSize: 14,
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
});