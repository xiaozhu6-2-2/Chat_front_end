<template>
  <v-app id="app">
    <!-- 顶部导航栏 -->
    <v-app-bar
      class="auth-app-bar"
      color="#1c1c1e"
      elevation="2"
      height="64"
    >
      <!-- 左侧 Logo 和品牌名称 -->
      <div class="d-flex align-center">
        <v-img
          aspect-ratio="1/1"
          class="mr-3"
          src="@/assets/echatlogo.png"
          :width="40"
        />
        <h1 class="text-h6 font-weight-bold text-white">易聊</h1>
      </div>

      <v-spacer />

      <!-- 右侧登录按钮 -->
      <v-btn
        v-if="$route.path === '/register' || $route.path === '/index' || $route.path === '/forget'"
        class="mr-4"
        color="primary"
        variant="outlined"
        @click="goToLogin"
      >
        <v-icon start>mdi-login</v-icon>
        登录
      </v-btn>

      <!-- 如果在登录界面，显示注册按钮 -->
      <v-btn
        v-if="$route.path === '/login'"
        class="mr-4"
        color="primary"
        variant="outlined"
        @click="goToRegister"
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
  import { useRouter } from 'vue-router'

  const router = useRouter()

  // 导航到登录页面
  function goToLogin () {
    router.push('/login')
  }

  // 导航到注册页面
  function goToRegister () {
    router.push('/register')
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
