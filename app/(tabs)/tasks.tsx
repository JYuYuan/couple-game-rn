import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {BlurView} from 'expo-blur';
import {Ionicons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const TaskSettings: React.FC = () => {
    const insets = useSafeAreaInsets();

    const settingsSections = [
        {
            title: '通用',
            items: [
                {icon: 'language', label: '语言设置', value: '简体中文'},
                {icon: 'moon', label: '深色模式', value: '跟随系统'},
            ]
        },
        {
            title: '关于',
            items: [
                {icon: 'information-circle', label: '版本信息', value: '1.0.0'},
                {icon: 'document-text', label: '用户协议', value: ''},
                {icon: 'shield-checkmark', label: '隐私政策', value: ''},
            ]
        }
    ];

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#F2F2F7', '#E5E5EA', '#F2F2F7']}
                style={StyleSheet.absoluteFillObject}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{paddingTop: insets.top + 20, paddingBottom: 100}}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.pageTitle}>设置</Text>

                {settingsSections.map((section, sectionIndex) => (
                    <View key={sectionIndex} style={styles.section}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>

                        <View style={styles.sectionContent}>
                            <BlurView intensity={80} tint="light" style={styles.blurCard}>
                                {section.items.map((item, index) => (
                                    <View
                                        key={index}
                                        style={[
                                            styles.settingItem,
                                            index < section.items.length - 1 && styles.settingItemBorder
                                        ]}
                                    >
                                        <View style={styles.settingItemLeft}>
                                            <View style={styles.iconContainer}>
                                                <Ionicons name={item.icon as any} size={22} color="#5E5CE6"/>
                                            </View>
                                            <Text style={styles.settingLabel}>{item.label}</Text>
                                        </View>

                                        <View style={styles.settingItemRight}>
                                            {item.value && (
                                                <Text style={styles.settingValue}>{item.value}</Text>
                                            )}
                                            <Ionicons name="chevron-forward" size={20} color="#C7C7CC"/>
                                        </View>
                                    </View>
                                ))}
                            </BlurView>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}
export default TaskSettings;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 20,
    },
    pageTitle: {
        fontSize: 34,
        fontWeight: '700',
        color: '#1C1C1E',
        marginBottom: 30,
        letterSpacing: -0.5,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8E8E93',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 10,
        marginLeft: 16,
    },
    sectionContent: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    blurCard: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    settingItemBorder: {
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(60, 60, 67, 0.12)',
    },
    settingItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(94, 92, 230, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    settingLabel: {
        fontSize: 16,
        color: '#1C1C1E',
        fontWeight: '400',
    },
    settingItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingValue: {
        fontSize: 15,
        color: '#8E8E93',
        marginRight: 8,
    },
});