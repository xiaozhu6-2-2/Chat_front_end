/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// 1. 最先初始化 Pinia - 在所有其他 import 之前！
import { createPinia, setActivePinia } from 'pinia' // 关键：立即激活 Pinia 实例

// Composables
import { createApp } from 'vue'

// Plugins
import { registerPlugins } from '@/plugins'
// Components
import App from './App.vue'

// 拦截器依赖pinia，所以需要在pinia启动后，再手动开启拦截器
import { setupApiInterceptors } from './service/api'

// Styles
import 'unfonts.css'
const pinia = createPinia()
setActivePinia(pinia)

const app = createApp(App)

// 注册插件（Pinia 已经手动初始化，这里只需要注册到 app）
registerPlugins(app)

// 设置 API 拦截器（现在 Pinia 已经可用）
setupApiInterceptors()

// 直接挂载应用，认证初始化移到 App.vue 中处理
app.mount('#app')
