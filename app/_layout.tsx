import {Stack} from "expo-router";
import "react-native-reanimated";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import "../global.css";
import "@/i18n";

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{flex: 1}}>
            <Stack>
                <Stack.Screen name="(tabs)" options={{headerShown: false, title: "主页"}}/>
            </Stack>
        </GestureHandlerRootView>
    );
}