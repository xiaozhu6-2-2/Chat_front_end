<template>
  <v-app>
    <v-card>
      <v-layout>
        <!-- 优化后的侧边栏 -->
        <v-navigation-drawer class="sidebar" permanent width="80">
          <!-- 头像区域 -->
          <div class="avatar-container">
            <template v-if="currentUser">
              <ContactCardModal v-model="showContactCard" :contact="currentUser as any" @edit-profile="handleEditProfile">
                <template #activator="{ props }">
                  <Avatar
                    :clickable="true"
                    :name="currentUser.name"
                    :size="56"
                    :url="currentUser.avatar"
                    v-bind="props"
                  />
                </template>
              </ContactCardModal>
            </template>
            <template v-else>
              <!-- 加载状态 -->
              <v-skeleton-loader type="avatar" class="skeleton-avatar" />
            </template>
            <!-- 新增的 UserProfileEditModal -->
            <UserProfileEditModal
              v-model="showProfileEditModal"
              :user-id="currentUser?.id"
            />
          </div>

          <!-- 导航按钮区域 -->
          <v-list class="button-list" density="compact" nav>
            <div class="main_buttons">
              <v-list-item class="nav-item">
                <v-btn
                  class="nav-button"
                  :class="{ active: $route.path === '/home' }"
                  size="large"
                  variant="text"
                  @click="navigateTo('/home')"
                >
                  <v-img aspect-ratio="1/1" class="fixed-size-image" src="@/assets/echatlogo.png" :width="32" />
                </v-btn>
                <v-badge v-if="unreadCount.chat > 0" class="badge" color="error" :content="unreadCount.chat" />
              </v-list-item>
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
                <v-badge v-if="unreadCount.chat > 0" class="badge" color="error" :content="unreadCount.chat" />
              </v-list-item>
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

            <v-list-item class="nav-item">
              <v-btn class="nav-button" size="large" variant="text" @click="showSettingsDialog = true">
                <v-icon size="x-large">mdi-cog</v-icon>
                <v-badge
                  v-if="unreadCount.settings > 0"
                  class="badge"
                  color="error"
                  :content="unreadCount.settings"
                />
              </v-btn>

              <settingsDialog v-model="showSettingsDialog" />
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

<script setup lang="ts">
  import { reactive, ref } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useRoute, useRouter } from 'vue-router'
  import { useUserStore } from '../stores/userStore'
  import Avatar from '../components/global/Avatar.vue'
  import ContactCardModal from '../components/global/ContactCardModal.vue'
  import UserProfileEditModal from '../components/global/UserProfileEditModal.vue'

  const router = useRouter()
  const $route = useRoute()
  const userStore = useUserStore()
  const { currentUser } = storeToRefs(userStore)
  // 模拟未读消息数量
  const unreadCount = reactive({
    chat: 0,
    contact: 0,
    settings: 0,
  })

  // 默认设置页关闭
  const showSettingsDialog = ref(false)
  const showContactCard = ref(false)
  // 控制模态框显示
  const showProfileEditModal = ref(false)
  // 处理编辑资料事件
  function handleEditProfile() {
    showProfileEditModal.value = true
  }
  function navigateTo (path: string) {
    router.push(path)
  }
</script>

<style scoped>
.sidebar {
  background-color: #1A1A25 !important;
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

.button-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 100%;
}

.main_buttons {
  flex-grow: 1;
}

.fixed-size-image {
  flex: none !important;
  /* 防止图片在flex容器中拉伸 */
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
  color: #1AAD19 !important;
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
  overflow: hidden;
}

/* 确保头像容器正确显示 */
:deep(.v-navigation-drawer__content) {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
