<!-- pages/contact.vue -->
<template>
  <maincontent>
    <template #detailbar>
      <contactList :active-item="activeItem" @item-click="handleItemClick" />
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
        :contact="activeItem.data"
        v-model="showContactCard"
      />

      <!-- 群聊详情 -->
      <groupCard
        v-else-if="activeItem.type === 'group'"
        :group="activeItem.data"
        v-model="showGroupCard"
      />
    </template>
  </maincontent>
</template>

<script lang="ts" setup>
  import type { GroupProfile } from '../types/group'
  import type { FriendWithUserInfo } from '../types/friend'
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import maincontent from '../layouts/maincontent.vue'

  type ActiveItem
    = | { type: 'contact', data: FriendWithUserInfo }
      | { type: 'group', data: GroupProfile }

  // Stores
  const router = useRouter()

  // Refs
  const activeItem = ref<ActiveItem | null>(null)
  const showUserCard = ref(false)
  const showContactCard = ref(false)
  const showGroupCard = ref(false)
  const showEditProfile = ref(false)

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

  // 处理发送消息
  // const handleSendMessage = (contact: ContactData) => {
  //   // 跳转到聊天页面
  //   router.push(`/chat/${contact.uid}`);
  // };

  // 处理编辑资料
  function handleEditProfile () {
    showEditProfile.value = true
    // 关闭当前打开的卡片
    if (showUserCard.value) {
      showUserCard.value = false
    } else if (showContactCard.value) {
      showContactCard.value = false
    }
  }

  function handleAddFriend (uid: string) {}

  // 处理资料更新完成
  function handleProfileUpdated (profile: any) {
    console.log('资料已更新:', profile)
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
