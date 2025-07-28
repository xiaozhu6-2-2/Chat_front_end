// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/LoginView.vue' // 登录页
import Register from '../views/RegisterView.vue' // 注册页
import ChatRoom from '../views/ChatRoom.vue' // 聊天室页
import FriendView from '../views/FriendView.vue' // 查看好友列表页
import FriendRequest from '@/views/FriendRequest.vue' // 查看好友请求页
// 路由数组
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
  },
  {
    path: '/chat',
    name: 'ChatRoom',
    component: ChatRoom
  },
  {
    path: '/friends',
    name: 'FriendView',
    component: FriendView
  },
  {
    path: '/friend-requests',
    name: 'FriendRequest',
    component: FriendRequest
  },
]
// 创建路由实例
const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes // short for `routes: routes`
})
// router模块导出，在main.js中导入
export default router