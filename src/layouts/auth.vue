<template>
  <v-app id="app">
    <!-- 顶部导航栏 -->
    <v-app-bar
      elevation="2"
      color="#1c1c1e"
      height="64"
      class="auth-app-bar"
    >
      <!-- 左侧 Logo 和品牌名称 -->
      <div class="d-flex align-center">
        <v-img
          :width="40"
          aspect-ratio="1/1"
          src="@/assets/echatlogo.png"
          class="mr-3"
        ></v-img>
        <h1 class="text-h6 font-weight-bold text-white">易聊</h1>
      </div>

      <v-spacer></v-spacer>

      <!-- 右侧登录按钮 -->
      <v-btn
        variant="outlined"
        color="primary"
        class="mr-4"
        @click="goToLogin"
        v-if="$route.path === '/register' || $route.path === '/index' || $route.path === '/forget'"
      >
        <v-icon start>mdi-login</v-icon>
        登录
      </v-btn>

      <!-- 如果在登录界面，显示注册按钮 -->
      <v-btn
        variant="outlined"
        color="primary"
        class="mr-4"
        @click="goToRegister"
        v-if="$route.path === '/login'"
      >
        <v-icon start>mdi-account-plus</v-icon>
        注册
      </v-btn>
    </v-app-bar>

    <!-- 主要内容区域 -->
    <v-main class="auth-main">
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

// 导航到登录页面
const goToLogin = () => {
  router.push('/login');
}

//导航到注册页面
const goToRegister= () => {
  router.push('/register');
}
</script>

<style scoped>
.auth-app-bar {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.auth-main {
  background-color: #1c1c1e;
  min-height: calc(100vh - 64px);
}

/* 确保应用栏内容垂直居中 */
:deep(.v-app-bar__content) {
  align-items: center;
}

/* 按钮悬停效果 */
.v-btn:hover {
  transform: translateY(-1px);
  transition: transform 0.2s ease-in-out;
}
</style>