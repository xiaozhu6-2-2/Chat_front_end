<template>
  <div class="friend-request-panel">
    <v-tabs v-model="activeTab" class="mb-4" color="primary">
      <v-tab value="received">
        <v-icon class="mr-2" icon="mdi-inbox-arrow-down" />
        收到的请求
        <v-badge
          v-if="pendingRequests.length > 0"
          class="ml-2"
          color="error"
          :content="pendingRequests.length"
        />
      </v-tab>
      <v-tab value="sent">
        <v-icon class="mr-2" icon="mdi-send" />
        发送的请求
        <v-badge
          v-if="sentRequests.length > 0"
          class="ml-2"
          color="info"
          :content="sentRequests.filter(r => r.status === 'pending').length"
        />
      </v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <!-- 收到的请求 -->
      <v-window-item value="received">
        <div v-if="pendingRequests.length > 0" class="request-list">
          <FriendRequestItem
            v-for="request in pendingRequests"
            :key="request.req_id"
            :request="request"
            type="received"
            @accept="handleAcceptRequest"
            @reject="handleRejectRequest"
          />
        </div>

        <div v-else class="text-center py-8">
          <v-icon color="grey-lighten-1" icon="mdi-inbox-arrow-down-outline" size="64" />
          <p class="text-grey mt-4">暂无收到的好友请求</p>
        </div>
      </v-window-item>

      <!-- 发送的请求 -->
      <v-window-item value="sent">
        <div v-if="sentRequests.length > 0" class="request-list">
          <FriendRequestItem
            v-for="request in sentRequests"
            :key="request.req_id"
            :request="request"
            type="sent"
          />
        </div>

        <div v-else class="text-center py-8">
          <v-icon color="grey-lighten-1" icon="mdi-send-outline" size="64" />
          <p class="text-grey mt-4">暂无发送的好友请求</p>
        </div>
      </v-window-item>
    </v-window>
  </div>
</template>

<script setup lang="ts">
  import type { FriendRequest } from '@/service/messageTypes'
  import { onMounted, ref } from 'vue'
  import { useFriend } from '@/composables/useFriend'
  import FriendRequestItem from './FriendRequestItem.vue'

  const {
    pendingRequests,
    sentRequests,
    loadPendingRequests,
    respondToFriendRequest,
  } = useFriend()

  const activeTab = ref<'received' | 'sent'>('received')

  // 处理接受好友请求
  async function handleAcceptRequest (request: FriendRequest) {
    try {
      await respondToFriendRequest(request.req_id, 'accepted')
      console.log('好友请求已接受:', request.req_id)
    } catch (error) {
      console.error('接受好友请求失败:', error)
    }
  }

  // 处理拒绝好友请求
  async function handleRejectRequest (request: FriendRequest) {
    try {
      await respondToFriendRequest(request.req_id, 'rejected')
      console.log('好友请求已拒绝:', request.req_id)
    } catch (error) {
      console.error('拒绝好友请求失败:', error)
    }
  }

  // 页面挂载时加载数据
  onMounted(async () => {
    try {
      await loadPendingRequests()
    } catch (error) {
      console.error('加载好友请求失败:', error)
    }
  })
</script>

<style scoped>
.friend-request-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.v-window {
  flex: 1;
}

.v-window-item {
  height: auto;
}

.request-list {
  max-height: 500px;
  overflow-y: auto;
}
</style>
