<template>
  <v-container class="pa-4" fluid>
    <v-card flat style="background-color: #1A1A25">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2" icon="mdi-account-plus" />
        新的朋友
      </v-card-title>

      <v-card-text>
        <!-- 标签页导航 -->
        <v-tabs v-model="selectedTab" class="mb-4" color="primary">
          <v-tab value="search">
            <v-icon class="mr-2" icon="mdi-magnify" />
            搜索用户
          </v-tab>
          <v-tab value="requests">
            <v-icon class="mr-2" icon="mdi-bell-ring" />
            好友请求
            <v-badge
              v-if="totalPending > 0"
              class="ml-2"
              color="error"
              :content="totalPending"
            />
          </v-tab>
        </v-tabs>

        <v-window v-model="selectedTab">
          <!-- 搜索用户标签页 -->
          <v-window-item value="search">
            <UserSearchPanel />
          </v-window-item>

          <!-- 好友请求标签页 -->
          <v-window-item value="requests">
            <FriendRequestPanel />
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
  import { onMounted } from 'vue'
  import { useFriendRequest } from '@/composables/useFriendRequest'
  import FriendRequestPanel from '../components/friend/FriendRequestPanel.vue'
  import UserSearchPanel from '../components/friend/UserSearchPanel.vue'
  import { useFriend } from '../composables/useFriend'

  const selectedTab = 'search'

  // 待处理的请求的总数
  const { totalPending } = useFriendRequest()

</script>

<style scoped>
.v-container {
  height: 100%;
}

.v-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.v-card-text {
  flex: 1;
  overflow: hidden;
}

.v-window {
  height: 100%;
}

.v-window-item {
  height: 100%;
}
</style>
