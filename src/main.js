// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { ElMessage } from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
// 创建应用实例
const app = createApp(App)
//注册图标库
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
// 注册路由和组件库和图标库
app.use(router)
app.use(ElementPlus)
app.use(ElementPlusIconsVue)
// 全局错误处理
app.config.errorHandler = (err) => {
  ElMessage.error(err.message)
}

// 环境变量
console.log(process.env.VUE_APP_API_BASE_URL)

// 挂载应用实例
app.mount('#app')