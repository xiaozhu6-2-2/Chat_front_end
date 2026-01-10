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
              v-if="pendingReceivedRequests.length > 0"
              class="ml-2"
              color="error"
              :content= "pendingReceivedRequests.length"
            />
          </v-tab>
          <v-tab value="group-requests">
            <v-icon class="mr-2" icon="mdi-account-group" />
            群聊请求
            <v-badge
              v-if="totalPendingGroupRequests > 0"
              class="ml-2"
              color="error"
              :content="totalPendingGroupRequests"
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

          <!-- 群聊请求标签页 -->
          <v-window-item value="group-requests">
            <GroupRequestPanel />
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { useFriendRequestStore } from '../stores/friendRequestStore'
  import { useGroupRequestStore } from '../stores/groupRequestStore'
  import { storeToRefs } from 'pinia'

  const selectedTab = ref('search')

  // 待处理的请求的总数 - 只统计收到的好友请求
  const FriendRequestStore = useFriendRequestStore()
  const {
    receivedRequests,
    sentRequests,
    pendingReceivedRequests,
  } = storeToRefs(FriendRequestStore)

  // 获取群聊请求store
  const groupRequestStore = useGroupRequestStore()
  const totalPendingGroupRequests = computed(() => groupRequestStore.totalPendingApprovals)

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

.v-badge{
  position: relative;
  top: -12px;
}
</style>
