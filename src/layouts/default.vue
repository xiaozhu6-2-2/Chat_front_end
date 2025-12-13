<template>
  <v-app>
    <v-card>
      <v-layout>
        <!-- 优化后的侧边栏 -->
        <v-navigation-drawer width="80" permanent class="sidebar">
          <!-- 头像区域 -->
          <div class="avatar-container">
            <ContactCardModal :contact="currentUser" v-model="showContactCard">
              <template #activator="{ props }">
                <Avatar
                  :url="currentUser.avatar"
                  :name="currentUser.username"
                  :size="56"
                  :clickable="true"
                  v-bind="props"
                />
              </template>
            </ContactCardModal>
          </div>

          <!-- 导航按钮区域 -->
          <v-list density="compact" class="button-list" nav>
            <div class="main_buttons">
              <v-list-item class="nav-item">
                <v-btn @click="navigateTo('/home')" class="nav-button" variant="text" size="large"
                  :class="{ active: $route.path === '/home' }">
                  <v-img :width="32" aspect-ratio="1/1" src="@/assets/echatlogo.png" class="fixed-size-image">
                  </v-img>
                </v-btn>
                <v-badge v-if="unreadCount.chat > 0" :content="unreadCount.chat" color="error" class="badge"></v-badge>
              </v-list-item>
              <v-list-item class="nav-item">
                <v-btn @click="navigateTo('/chat')" class="nav-button" variant="text" size="large"
                  :class="{ active: $route.path === '/chat' }">
                  <v-icon size="x-large">mdi-forum</v-icon>
                </v-btn>
                <v-badge v-if="unreadCount.chat > 0" :content="unreadCount.chat" color="error" class="badge"></v-badge>
              </v-list-item>
              <v-list-item class="nav-item">
                <v-btn @click="navigateTo('/contact')" class="nav-button" variant="text" size="large"
                  :class="{ active: $route.path === '/contact' }">
                  <v-icon size="x-large">mdi-account</v-icon>
                </v-btn>
                <v-badge v-if="unreadCount.contact > 0" :content="unreadCount.contact" color="error"
                  class="badge"></v-badge>
              </v-list-item>
            </div>

            <v-list-item class="nav-item">
              <v-btn class="nav-button" variant="text" size="large" @click="showSettingsDialog = true">
                <v-icon size="x-large">mdi-cog</v-icon>
                <v-badge v-if="unreadCount.settings > 0" :content="unreadCount.settings" color="error"
                  class="badge"></v-badge>
              </v-btn>

              <settingsDialog v-model="showSettingsDialog" />
            </v-list-item>
          </v-list>
        </v-navigation-drawer>

        <v-main id="mainarea">
          <router-view></router-view>
        </v-main>
      </v-layout>
    </v-card>
  </v-app>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from "vue-router";
import { ref, reactive } from "vue";
import Avatar from '../components/global/Avatar.vue'
import ContactCardModal from '../components/global/ContactCardModal.vue'

const router = useRouter();
const $route = useRoute();

// 模拟未读消息数量
const unreadCount = reactive({
  chat: 3,
  contact: 1,
  settings: 0,
});

//默认设置页关闭
const showSettingsDialog = ref(false);
const showContactCard = ref(false);

// 当前用户信息
const currentUser = ref({
  uid: 'current-user-001',
  username: '我',
  account: 'me',
  gender: 'other' as const,
  region: '',
  email: 'me@example.com',
  create_time: new Date().toISOString(),
  avatar: '@/assets/yxd.jpg',
  bio: '这是我的个人简介'
});

const navigateTo = (path:string) => {
  router.push(path);
};
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