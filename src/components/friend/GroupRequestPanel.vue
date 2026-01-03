<template>
  <div class="group-request-panel">
    <v-tabs v-model="activeTab" class="mb-4" color="primary">
      <v-tab value="received">
        <v-icon class="mr-2" icon="mdi-inbox-arrow-down" />
        收到的申请
        <v-badge
          v-if="pendingApprovalRequests.length > 0"
          class="ml-2"
          color="error"
          :content="pendingApprovalRequests.length"
        />
      </v-tab>
      <v-tab value="sent">
        <v-icon class="mr-2" icon="mdi-send" />
        发送的申请
        <v-badge
          v-if="pendingUserRequests.length > 0"
          class="ml-2"
          color="info"
          :content="pendingUserRequests.length"
        />
      </v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <!-- 收到的申请 -->
      <v-window-item value="received">
        <!-- 加载状态 -->
        <div v-if="isLoadingApprovals" class="text-center py-8">
          <v-progress-circular
            color="primary"
            indeterminate
            size="40"
          />
          <p class="text-grey mt-4">加载中...</p>
        </div>

        <!-- 有数据时显示列表 -->
        <div v-else-if="pendingApprovalRequests.length > 0" class="request-list">
          <GroupRequestItem
            v-for="request in approvalRequests"
            :key="request.req_id"
            :request="request"
            type="received"
            @accept="handleAcceptRequest"
            @reject="handleRejectRequest"
          />
        </div>

        <!-- 空状态 -->
        <div v-else class="text-center py-8">
          <v-icon color="grey-lighten-1" icon="mdi-inbox-arrow-down-outline" size="64" />
          <p class="text-grey mt-4">暂无收到群聊申请</p>
        </div>
      </v-window-item>

      <!-- 发送的申请 -->
      <v-window-item value="sent">
        <!-- 加载状态 -->
        <div v-if="isLoading" class="text-center py-8">
          <v-progress-circular
            color="primary"
            indeterminate
            size="40"
          />
          <p class="text-grey mt-4">加载中...</p>
        </div>

        <!-- 有数据时显示列表 -->
        <div v-else-if="userRequests.length > 0" class="request-list">
          <GroupRequestItem
            v-for="request in userRequests"
            :key="request.req_id"
            :request="request"
            type="sent"
          />
        </div>

        <!-- 空状态 -->
        <div v-else class="text-center py-8">
          <v-icon color="grey-lighten-1" icon="mdi-send-outline" size="64" />
          <p class="text-grey mt-4">暂无发送群聊申请</p>
        </div>
      </v-window-item>
    </v-window>
  </div>
</template>

<script setup lang="ts">
  import type { GroupRequest } from '../../types/groupRequest'
  import { computed, onMounted, ref } from 'vue'
  import { useGroupRequest } from '../../composables/useGroupRequest'
  import { useSnackbar } from '../../composables/useSnackbar'
  import { useGroupRequestStore } from '../../stores/groupRequestStore'
  import GroupRequestItem from './GroupRequestItem.vue'

  // 获取composable方法
  const {
    respondGroupRequest, // 响应申请
    init, // 初始化
  } = useGroupRequest()

  // 获取store状态
  const groupRequestStore = useGroupRequestStore()

  // 响应式数据
  const approvalRequests = computed(() => groupRequestStore.approvalRequests)
  const userRequests = computed(() => groupRequestStore.userRequests)
  const pendingApprovalRequests = computed(() => groupRequestStore.pendingApprovalRequests)
  const pendingUserRequests = computed(() => groupRequestStore.pendingUserRequests)
  const isLoading = computed(() => groupRequestStore.isLoading)
  const isLoadingApprovals = computed(() => groupRequestStore.isLoadingApprovals)

  const { showSuccess, showError } = useSnackbar()

  const activeTab = ref<'received' | 'sent'>('received')

  // 处理接受群聊申请
  async function handleAcceptRequest (request: GroupRequest) {
    try {
      await respondGroupRequest(request.req_id, 'accept', request.gid)
      showSuccess('已接受加群申请')
      console.log('群聊申请已接受:', request.req_id)
    } catch (error) {
      console.error('接受群聊申请失败:', error)
      showError('接受申请失败，请重试')
    }
  }

  // 处理拒绝群聊申请
  async function handleRejectRequest (request: GroupRequest) {
    try {
      await respondGroupRequest(request.req_id, 'reject', request.gid)
      showSuccess('已拒绝加群申请')
      console.log('群聊申请已拒绝:', request.req_id)
    } catch (error) {
      console.error('拒绝群聊申请失败:', error)
      showError('拒绝申请失败，请重试')
    }
  }

  // 页面挂载时加载数据
  onMounted(async () => {
    try {
      await init()
    } catch (error) {
      console.error('加载群聊申请失败:', error)
      showError('加载数据失败，请刷新重试')
    }
  })
</script>

<style scoped>
.group-request-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.v-window {
  flex: 1;
  display: flex;
  flex-direction: column;
}

:deep(.v-window__container) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.v-window-item) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.request-list {
  flex: 1;
  overflow-y: auto;
}

.v-badge {
  position: relative;
  top: -12px;
}
</style>
