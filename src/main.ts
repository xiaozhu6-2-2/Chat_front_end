/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import { registerPlugins } from '@/plugins'

// Components
import App from './App.vue'

// Composables
import { createApp } from 'vue'
import { createPinia } from 'pinia'

// Styles
import 'unfonts.css'

const app = createApp(App)

// 创建 pinia 实例
const pinia = createPinia()

registerPlugins(app)

app.use(pinia)

//拦截器依赖pinia，所以需要在pinia启动后，再手动开启拦截器
import { setupApiInterceptors } from './service/api'
setupApiInterceptors()

app.mount('#app')
