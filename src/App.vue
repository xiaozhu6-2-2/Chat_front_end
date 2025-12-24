<template>
  <v-app id="app">
    <router-view />

    <!-- 全局 Snackbar -->
    <v-snackbar
      :color="snackbarStore.current?.color || 'info'"
      location="top"
      :model-value="!!snackbarStore.current?.show"
      :timeout="snackbarStore.current?.timeout || 3000"
      @update:model-value="handleSnackbarUpdate"
    >
      {{ snackbarStore.current?.text }}

      <template #actions>
        <v-btn
          icon="mdi-close"
          variant="text"
          @click="snackbarStore.close()"
        />
      </template>
    </v-snackbar>
  </v-app>
</template>

<script lang="ts" setup>
  import { onBeforeUnmount, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useAuth } from '@/composables/useAuth'
  import { useMessage } from '@/composables/useMessage'
  import { websocketService } from '@/service/websocket'
  import { useAuthStore } from '@/stores/authStore'
  import { useSnackbarStore } from '@/stores/snackbarStore'

  const snackbarStore = useSnackbarStore()
  const router = useRouter()
  const route = useRoute()
  const auth = useAuth()
  const authStore = useAuthStore()
  const { stopQueueProcessing, cleanupWebSocketListeners } = useMessage()

  // 公开路由列表，这些页面不需要认证检查
  const publicRoutes = new Set(['/login', '/register', '/forget'])

  // 页面卸载前的清理
  function handleBeforeUnload () {
    console.log('App.vue: 页面即将卸载，执行清理...')
    websocketService.quickDisconnect()
    stopQueueProcessing()
    cleanupWebSocketListeners()
  }

  // 组件卸载时的清理
  function handleUnmount () {
    console.log('App.vue: 组件卸载，执行清理...')
    handleBeforeUnload()
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }

  function handleSnackbarUpdate (show: boolean) {
    if (!show) {
      // 立即处理关闭，不需要延迟
      snackbarStore.onClosed()
    }
  }

  // 应用启动时的认证初始化和路由检查
  onMounted(async () => {
    // 添加页面卸载监听
    window.addEventListener('beforeunload', handleBeforeUnload)

    // 如果当前是公开路由，仍然需要尝试初始化认证状态（为了恢复登录状态）
    const isPublicRoute = publicRoutes.has(route.path)

    try {
      // 尝试从存储加载并验证认证信息
      console.log('App.vue: 开始认证初始化...')
      const initSuccess = await auth.init()

      if (initSuccess) {
        console.log('App.vue: 认证初始化成功')
        // 如果当前在登录/注册页，但已经认证成功，跳转到首页
        if (isPublicRoute && route.path !== '/register') {
          router.push('/home')
        }
      } else {
        console.log('App.vue: 认证初始化失败或未找到认证信息')
        // 如果不在公开路由，跳转到登录页
        if (!isPublicRoute) {
          router.push('/login')
        }
      }
    } catch (error) {
      console.error('App.vue: 认证初始化过程中发生错误:', error)
      // 发生错误时，确保用户在登录页
      if (!isPublicRoute) {
        router.push('/login')
      }
    }
  })

  onBeforeUnmount(() => {
    handleUnmount()
  })
</script>

<style>
html, body, #app,#app > * {
  height: 100%;
  width: 100%;
  overflow: scroll;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

* {
  box-sizing: border-box;
  margin:0;
  padding:0;
}

body::-webkit-scrollbar {
  width: 0 !important;
}

/* 隐藏浏览器滚动条 */
body::-webkit-scrollbar {
  display: none;
}
</style>
