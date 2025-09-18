const {getDefaultConfig} = require("expo/metro-config");

const path = require('path');


const config = getDefaultConfig(__dirname)

config.resolver.unstable_enablePackageExports = true
config.resolver.unstable_conditionNames = [
    'require',
    'react-native',
    'default',
]

config.resolver.extraNodeModules = {
    '@': path.resolve(__dirname),
};

config.watchFolders = [path.resolve(__dirname)];

config.resolver.sourceExts.push('cjs');

module.exports = config