import {Stack} from "expo-router";
import "react-native-reanimated";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import {useEffect} from "react";
import {useAudioManager} from "@/hooks/use-audio-manager";
import {useSettingsStore} from "@/store";
import "@/i18n";

export default function RootLayout() {
    const audioManager = useAudioManager();
    const {soundSettings} = useSettingsStore();

    // 自动播放背景音乐
    useEffect(() => {
        if (soundSettings.bgmEnabled && !soundSettings.globalMute) {
            audioManager.play();
        } else {
            audioManager.pause();
        }
    }, [soundSettings.bgmEnabled, soundSettings.globalMute]);

    return (
        <GestureHandlerRootView style={{flex: 1}}>
            <Stack>
                <Stack.Screen name="(tabs)" options={{headerShown: false, title: "主页"}}/>
            </Stack>
        </GestureHandlerRootView>
    );
}