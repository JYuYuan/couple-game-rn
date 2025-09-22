import {Stack} from "expo-router";
import "react-native-reanimated";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import {useCallback, useEffect, useState} from "react";
import {useAudioManager} from "@/hooks/use-audio-manager";
import {useSettingsStore} from "@/store";
import * as SplashScreen from 'expo-splash-screen';
import "@/i18n";
import {Platform} from "react-native";

// 防止启动屏自动隐藏
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const audioManager = useAudioManager();
    const {soundSettings} = useSettingsStore();
    const [appIsReady, setAppIsReady] = useState(false);

    // 自动播放背景音乐
    useEffect(() => {
        const handleAudioControl = async () => {
            console.log('Audio control triggered:', {
                bgmEnabled: soundSettings.bgmEnabled,
                globalMute: soundSettings.globalMute,
                appIsReady
            });

            // 确保应用已经准备好
            if (!appIsReady) return;

            // 延迟一点时间确保音频已经初始化完成
            await new Promise(resolve => setTimeout(resolve, 500));

            if (soundSettings.bgmEnabled && !soundSettings.globalMute) {
                console.log('Attempting to play background music...');
                await audioManager.play();
            } else {
                console.log('Attempting to pause background music...');
                await audioManager.pause();
            }
        };

        handleAudioControl().catch(console.error);
    }, [soundSettings.bgmEnabled, soundSettings.globalMute, appIsReady, audioManager]);

    // 控制启动屏显示时间
    useEffect(() => {

        async function prepare() {
            try {
                // 这里可以进行一些初始化操作，比如加载资源、检查更新等
                // 延长启动屏显示时间（3秒）
                await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (e) {
                console.warn(e);
            } finally {
                // 标记应用准备就绪
                setAppIsReady(true);
            }
        }

        if (Platform.OS !== 'web' && typeof window !== "undefined") {
            prepare();
        } else {
            setAppIsReady(true);
        }

    }, []);

    const onLayoutRootView = useCallback(async () => {
        if (appIsReady) {
            // 应用准备好后，隐藏启动屏
            await SplashScreen.hideAsync();
        }
    }, [appIsReady]);

    if (!appIsReady) {
        return null;
    }

    return (
        <GestureHandlerRootView style={{flex: 1}} onLayout={onLayoutRootView}>
            <Stack>
                <Stack.Screen name="(tabs)" options={{headerShown: false, title: "主页"}}/>
            </Stack>
        </GestureHandlerRootView>
    );
}