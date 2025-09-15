import React, {useEffect} from 'react';
import {View, Pressable, StyleSheet, Dimensions, Platform} from 'react-native';
import {Tabs} from 'expo-router';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import {Ionicons} from '@expo/vector-icons';
import {BlurView} from 'expo-blur';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const {width: screenWidth} = Dimensions.get('window');

const ICONS = ['home', 'list-outline', 'settings-sharp']; // 支持3个标签页

const CustomTabBar: React.FC<any> = ({state, navigation}) => {
    console.log(state.routes);
    const insets = useSafeAreaInsets();
    const tabCount = state.routes.length;
    const tabBarPadding = 20;
    const tabWidth = (screenWidth - tabBarPadding * 2) / tabCount;
    const indicatorWidth = tabWidth - 40; // 指示器比tab小一些

    const translateX = useSharedValue(state.index * tabWidth);

    useEffect(() => {
        translateX.value = withSpring(state.index * tabWidth, {
            damping: 22,
            stiffness: 200,
            mass: 1
        });
    }, [state.index, tabWidth]);

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [{translateX: translateX.value}],
    }));

    return (
        <View style={[styles.container, {paddingBottom: insets.bottom + 8}]}>
            <BlurView intensity={25} tint="light" style={styles.blur}>
                <View style={styles.tabContent}>
                    <Animated.View style={[
                        styles.indicator,
                        indicatorStyle,
                        {width: indicatorWidth, left: 20}
                    ]}>
                        <BlurView intensity={80} tint="light" style={styles.glassIndicator}>
                            <View style={styles.glassBackground}/>
                        </BlurView>
                    </Animated.View>

                    {state.routes.map((route: any, index: number) => {
                        const isFocused = state.index === index;
                        const onPress = () => {
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true
                            });
                            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
                        };
                        const onLongPress = () => navigation.emit({type: 'tabLongPress', target: route.key});
                        return (
                            <TabButton
                                key={route.key}
                                icon={ICONS[index]}
                                isFocused={isFocused}
                                onPress={onPress}
                                onLongPress={onLongPress}
                            />
                        );
                    })}
                </View>
            </BlurView>
        </View>
    );
};

const TabButton: React.FC<any> = ({icon, isFocused, onPress, onLongPress}) => {
    const scale = useSharedValue(isFocused ? 1.15 : 1);

    useEffect(() => {
        scale.value = withSpring(isFocused ? 1.15 : 1, {
            damping: 20,
            stiffness: 300,
            mass: 0.8
        });
    }, [isFocused, scale]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{scale: scale.value}],
    }));

    // 直接计算颜色值
    const iconColor = isFocused ? '#007AFF' : '#8E8E93';

    return (
        <Animated.View style={[styles.tabButton, animatedStyle]}>
            <Pressable onPress={onPress} onLongPress={onLongPress} style={styles.pressable}>
                <Ionicons name={icon} size={26} color={iconColor}/>
            </Pressable>
        </Animated.View>
    );
};

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{headerShown: false}}
            tabBar={(props) => <CustomTabBar {...props} />}
        >
            <Tabs.Screen name="index" options={{title: '首页'}}/>
            <Tabs.Screen name="tasks" options={{title: '任务'}}/>
            <Tabs.Screen name="settings" options={{title: '设置'}}/>
        </Tabs>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        paddingHorizontal: 20,
    },
    blur: {
        borderRadius: 25,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 6},
                shadowOpacity: 0.1,
                shadowRadius: 20
            },
            android: {elevation: 10},
        }),
    },
    tabContent: {
        flexDirection: 'row',
        height: 64,
        alignItems: 'center',
        position: 'relative',
    },
    indicator: {
        position: 'absolute',
        height: 48,
        borderRadius: 24,
        overflow: 'hidden',
    },
    glassIndicator: {
        flex: 1,
        borderRadius: 24,
        overflow: 'hidden',
    },
    glassBackground: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 24,
        borderWidth: 0.5,
        borderColor: 'rgba(255, 255, 255, 0.8)',
    },
    tabButton: {
        flex: 1,
        height: 64,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pressable: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
