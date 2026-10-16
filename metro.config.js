const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('cjs');

// Force Metro to use the compiled output of react-native-gesture-handler
// instead of its TypeScript source, which causes unresolvable relative imports.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-gesture-handler') {
    return {
      filePath: require.resolve('react-native-gesture-handler/lib/commonjs/index.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
