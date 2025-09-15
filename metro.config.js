const {getDefaultConfig} = require("expo/metro-config");
const {withNativeWind} = require('nativewind/metro');

const config = getDefaultConfig(__dirname)

config.resolver.unstable_enablePackageExports = true
config.resolver.unstable_conditionNames = [
    'require',
    'react-native',
    'default',
]

module.exports = withNativeWind(config, {input: './global.css'})