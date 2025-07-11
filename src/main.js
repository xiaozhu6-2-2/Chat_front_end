import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { ElMessage } from 'element-plus'

const app = createApp(App)

app.use(router)
app.use(ElementPlus)

// 全局错误处理
app.config.errorHandler = (err) => {
  ElMessage.error(err.message)
}

app.mount('#app')