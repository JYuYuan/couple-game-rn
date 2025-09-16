import AsyncStorage from "@react-native-async-storage/async-storage";

export const getStorage = () => {
    if (typeof window !== "undefined") {
        // Web 端
        return localStorage;
    }
    // React Native
    return {
        getItem: async (name: string) => {
            return await AsyncStorage.getItem(name);
        },
        setItem: async (name: string, value: string) => {
            await AsyncStorage.setItem(name, value);
        },
        removeItem: async (name: string) => {
            await AsyncStorage.removeItem(name);
        },
    };
};

const storage = getStorage();
export default storage;