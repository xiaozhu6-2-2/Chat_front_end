<template>
  <v-app>
    <v-card>
      <v-layout>
        <!-- 优化后的侧边栏 -->
        <v-navigation-drawer class="sidebar" permanent width="80">
          <!-- 头像区域 -->
          <div class="avatar-container">
            <v-avatar class="custom-avatar" size="56" variant="tonal">
              <img
                alt="头像"
                src="@/assets/yxd.jpg"
                style="object-fit: cover"
              >
            </v-avatar>
          </div>

          <!-- 导航按钮区域 -->
          <v-list class="button-list" density="compact" nav>
            <div class="main_buttons">
              <v-list-item class="nav-item">
                <v-btn
                  class="nav-button"
                  :class="{ active: $route.path === '/chat' }"
                  size="large"
                  variant="text"
                  @click="navigateTo('/chat')"
                >
                  <v-icon size="x-large">mdi-forum</v-icon>
                </v-btn>
                <v-badge
                  v-if="unreadCount.chat > 0"
                  class="badge"
                  color="error"
                  :content="unreadCount.chat"
                />
              </v-list-item>
              <div class="bottom_buttons">
                <v-list-item class="nav-item">
                  <v-btn
                    class="nav-button"
                    :class="{ active: $route.path === '/contact' }"
                    size="large"
                    variant="text"
                    @click="navigateTo('/contact')"
                  >
                    <v-icon size="x-large">mdi-account</v-icon>
                  </v-btn>
                  <v-badge
                    v-if="unreadCount.contact > 0"
                    class="badge"
                    color="error"
                    :content="unreadCount.contact"
                  />
                </v-list-item>
              </div>
            </div>

            <v-list-item class="nav-item">
              <v-btn
                class="nav-button"
                :class="{ active: $route.path === '/settings' }"
                size="large"
                variant="text"
                @click="navigateTo('/settings')"
              >
                <v-icon size="x-large">mdi-cog</v-icon>
              </v-btn>
              <v-badge
                v-if="unreadCount.settings > 0"
                class="badge"
                color="error"
                :content="unreadCount.settings"
              />
            </v-list-item>
          </v-list>
        </v-navigation-drawer>

        <v-main id="mainarea">
          <router-view />
        </v-main>
      </v-layout>
    </v-card>
  </v-app>
</template>

  <script setup>
  import { reactive, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'

  const router = useRouter()
  const $route = useRoute()

  // 模拟未读消息数量
  const unreadCount = reactive({
    chat: 3,
    contact: 1,
    settings: 0,
  })

  function navigateTo (path) {
    router.push(path)
  }
</script>

  <style scoped>
.sidebar {
  background-color: #0f0f0f !important;
  display: flex;
  flex-direction: column;
  padding: 20px 0;
}

.avatar-container {
  margin-bottom: 30px;
  display: flex;
  justify-content: center;
  width: 100%;
}

.custom-avatar {
  border-radius: 10px !important; /* 圆角方形 */
  overflow: hidden;
}

.custom-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover; /* 等比例压缩适应 */
}

.button-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 100%;
}
.main_buttons{
  flex-grow: 1;
}
.nav-item {
  display: flex;
  justify-content: center;
  padding: 0 !important;
  margin: 16px 0;
}

.nav-button {
  width: 48px;
  height: 48px;
  min-width: auto !important;
  background-color: transparent !important;
  color: rgba(255, 255, 255, 0.6) !important;
  border-radius: 12px;
  transition: all 0.3s ease;
  position: relative;
}

.nav-button:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
  color: rgba(255, 255, 255, 0.9) !important;
  transform: scale(1.05);
}

.nav-button.active {
  color: #04BE02 !important;
}

.badge {
  /* 注意到vlistitem内置的css有锚点 */
  position: absolute;
  top: 0px;
  right: 0px;
}

#mainarea {
  height: 100vh;
  background-color: #1a1a25;
}

/* 确保头像容器正确显示 */
:deep(.v-navigation-drawer__content) {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
