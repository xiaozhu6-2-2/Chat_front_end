# 环境配置使用指南

本项目支持开发环境和生产环境的自动切换，让你可以在开发时使用模拟数据，在生产环境使用真实的API。

## 📋 环境配置概览

### 开发环境
- **数据源**: 使用 `mockDataService` 提供的模拟数据
- **用户信息**: 自动使用环境配置中的模拟用户
- **API调用**: 拦截并返回模拟数据
- **调试功能**: 启用详细的开发日志

### 生产环境
- **数据源**: 从真实后端API获取数据
- **用户信息**: 通过登录接口获取
- **API调用**: 直接调用后端接口
- **调试功能**: 关闭调试日志，提升性能

## 🚀 快速开始

### 1. 开发环境（默认）

```bash
# 启动开发服务器（自动使用开发环境配置）
npm run dev
```

**效果**:
- 自动加载模拟聊天数据
- 消息发送模拟回复（70%概率收到回复）
- 详细的控制台日志输出
- 无需后端服务即可测试前端功能

### 2. 生产环境构建

```bash
# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

**效果**:
- 使用真实API配置
- 优化的代码包
- 关闭调试信息

## ⚙️ 环境配置文件

### `.env.development` (开发环境)

```bash
# API配置
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000

# 功能开关
VITE_USE_MOCK_DATA=true          # 启用模拟数据
VITE_ENABLE_DEBUG=true           # 启用调试日志
VITE_ENABLE_LOG=true             # 启用普通日志

# 模拟用户配置
VITE_MOCK_USER_ID=test-user-001
VITE_MOCK_USER_TOKEN=dev-token-123456
VITE_MOCK_USER_NAME=测试用户
```

### `.env.production` (生产环境)

```bash
# API配置
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com

# 功能开关
VITE_USE_MOCK_DATA=false         # 关闭模拟数据
VITE_ENABLE_DEBUG=false          # 关闭调试日志
VITE_ENABLE_LOG=false            # 关闭普通日志
```

## 🔧 自定义配置

### 修改开发环境模拟数据

1. **添加新的模拟聊天**:
   编辑 `src/service/mockDataService.ts` 中的 `mockChats` 数组

2. **自定义消息内容**:
   修改 `getRandomMessageText()` 方法中的消息模板

3. **调整回复概率**:
   在 `mockReceiveReply()` 方法中修改随机概率

### 切换数据源

在代码中可以使用环境判断：

```typescript
import { isDevelopment, envConfig } from '@/utils/env'

// 根据环境选择数据源
if (isDevelopment()) {
  // 开发环境逻辑
  console.log('Development mode')
} else {
  // 生产环境逻辑
  console.log('Production mode')
}

// 使用环境配置
const apiUrl = envConfig.apiBaseUrl
const useMock = envConfig.useMockData
```

## 🧪 测试功能

### 开发环境测试特性

1. **自动加载聊天数据**:
   - 群聊：309宿舍群 (group-001)
   - 私聊：张三 (private-001)
   - 群聊：前端开发交流群 (group-002)

2. **消息发送模拟**:
   - 发送状态：pending → sending → sent
   - 70%概率收到自动回复
   - 1秒发送延迟模拟网络

3. **调试日志**:
   ```bash
   # 在控制台查看开发日志
   [DEV] Initializing MessageService in development mode
   [DEV] Mock data loaded successfully
   [DEV] Creating new message {type: "Group", senderId: "test-user-001"}
   ```

## 📱 功能演示

### 开发环境测试步骤

1. **启动项目**:
   ```bash
   npm run dev
   # 访问 http://localhost:8081
   ```

2. **查看聊天列表**:
   - 自动加载3个模拟聊天
   - 显示未读消息数量
   - 最后消息预览

3. **发送消息测试**:
   - 选择任意聊天
   - 发送消息查看状态变化
   - 等待模拟回复

4. **查看控制台日志**:
   - 详细的开发日志
   - 消息发送/接收记录
   - 环境配置信息

## 🔍 调试技巧

### 开发环境调试

```typescript
// 启用详细日志
import { devLog } from '@/utils/env'

devLog('自定义调试信息', { data: 'value' })

// 检查当前环境
import { getCurrentEnvironment } from '@/utils/env'
console.log('当前环境:', getCurrentEnvironment())
```

### 生产环境调试

生产环境默认关闭调试，如需开启：

```bash
# 临时启用调试
VITE_ENABLE_DEBUG=true npm run preview
```

## 📦 部署注意事项

1. **环境变量**: 确保生产环境配置正确的API地址
2. **构建优化**: 生产构建会自动移除开发代码
3. **安全考虑**: 不要在环境变量中存储敏感信息
4. **API对接**: 确保后端API接口与前端数据结构匹配

## 🚨 常见问题

### Q: 如何切换到真实API测试？

A: 修改 `.env.development` 文件：
```bash
VITE_USE_MOCK_DATA=false
```

### Q: 模拟数据不够丰富怎么办？

A: 编辑 `mockDataService.ts` 添加更多测试数据

### Q: 生产环境报错怎么办？

A: 检查API配置和网络连接，查看浏览器控制台错误信息

### Q: 如何添加新的环境？

A: 创建 `.env.test` 文件，使用 `npm run dev -- --mode test` 启动

## 📝 总结

这套环境配置系统让你能够：

✅ **开发效率**: 无需后端即可开发前端功能
✅ **无缝切换**: 一键切换开发/生产环境
✅ **测试完备**: 丰富的模拟数据和交互
✅ **调试友好**: 详细的开发日志和错误提示
✅ **生产就绪**: 优化的生产构建和配置

开始享受高效的前端开发体验吧！🎉