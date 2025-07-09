// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Login from '../components/LoginView.vue' // 登录组件路径
import Register from '../components/RegisterView.vue' // 注册组件路径

const routes = [
  {
    path: '/',
    name: 'Login',
    component: Login
  },
  {
    path: '/register',
    name: 'Register',
    component: Register
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes // short for `routes: routes`
})

export default router