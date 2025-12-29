<!-- pages/contact.vue -->
<template>
  <maincontent>
    <template #detailbar>
      <contactList @item-click="handleItemClick"/>
    </template>
    <template #main class="d-flex align-center justify-center">
      <!-- 默认界面 -->
      <div
        v-if="!activeItem"
        class="default-view d-flex flex-column align-center justify-center"
        style="height: 100%"
      >
        <!-- 欢迎信息 -->
        <echat-welcome />
      </div>

      <contactCard
        v-else-if="activeItem.type === 'contact'"
        v-model="showContactCard"
        :contact="activeItem.data"
        @delete="activeItem = null"
      />

      <!-- 群聊详情 -->
      <groupCard
        v-else-if="activeItem.type === 'group'"
        v-model="showGroupCard"
        :group="activeItem.data"
      />
    </template>
  </maincontent>
</template>

<script lang="ts" setup>
  import type { FriendWithUserInfo } from '../types/friend'
  import type { GroupProfile } from '../types/group'
  import { ref } from 'vue'
  import maincontent from '../layouts/maincontent.vue'

  type ActiveItem
    = | { type: 'contact', data: FriendWithUserInfo }
      | { type: 'group', data: GroupProfile }


  // Refs
  const activeItem = ref<ActiveItem | null>(null)
  const showContactCard = ref(false)
  const showGroupCard = ref(false)

  function handleItemClick (type: 'contact' | 'group', data: FriendWithUserInfo | GroupProfile) {
    if (type === 'contact') {
      const contact = data as FriendWithUserInfo
      // 数据完整性验证
      if (!contact || !contact.fid || !contact.id) {
        console.error('无效的好友数据:', contact)
        // 可以显示错误提示
        return
      }
      activeItem.value = { type, data: contact }
      showContactCard.value = true
    } else {
      activeItem.value = { type, data: data as GroupProfile }
      showGroupCard.value = true
    }
  }
</script>

<style scoped>
.fixed-size-image {
  flex: none !important;
}

.user-card {
  min-width: 280px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.user-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.user-card-wrapper {
  position: relative;
}

.default-view {
  padding: 40px 20px;
}
</style>
