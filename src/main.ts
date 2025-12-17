/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

import { createPinia } from 'pinia'

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

const app = createApp(App)

// 创建 pinia 实例
const pinia = createPinia()

registerPlugins(app)

app.use(pinia)
setupApiInterceptors()

app.mount('#app')
