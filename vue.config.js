// vue.config.js
const { defineConfig } = require('@vue/cli-service');

module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    resolve: {
      extensions: ['.js', '.ts', '.vue'] // ✅ 关键配置1：识别.ts扩展名
    },
    module: {
      rules: [
        {
          test: /\.ts$/,                  // 匹配所有.ts文件
          loader: 'ts-loader',             // ✅ 关键配置2：使用ts-loader处理TS
          options: {
            appendTsSuffixTo: [/\.vue$/]  // ✅ 关键配置3：让Vue单文件支持TS
          },
          exclude: /node_modules/         // 排除node_modules
        }
      ]
    }
  }
});