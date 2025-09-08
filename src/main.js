// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { ElMessage } from 'element-plus'
// 创建应用实例
const app = createApp(App)
// 注册路由和组件库
app.use(router)
app.use(ElementPlus)

// 全局错误处理
app.config.errorHandler = (err) => {
  ElMessage.error(err.message)
}

// 环境变量
console.log(process.env.VUE_APP_API_BASE_URL)

// 挂载应用实例
app.mount('#app')