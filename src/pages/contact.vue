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

      <!-- 联系人详情 -->
      <ContactCardModal
        v-else-if="activeItem.type === 'contact'"
        :contact="activeItem.data"
        v-model="showContactCard"
        
        @edit-profile="handleEditProfile"
      />
<!-- @send-message="handleSendMessage" -->
      <!-- 群聊详情 -->
      <groupCard
        v-else-if="activeItem.type === 'group'"
        :group="activeItem.data"
      />
    </template>
  </maincontent>

  <!-- 用户资料编辑模态框 -->
  <UserProfileEditModal
    v-model="showEditProfile"
    @profile-updated="handleProfileUpdated"
  />
</template>

<script lang="ts" setup>
import maincontent from "@/layouts/maincontent.vue";
import ContactCardModal from "@/components/global/ContactCardModal.vue";
import UserProfileEditModal from "@/components/global/UserProfileEditModal.vue";
import Avatar from "@/components/global/Avatar.vue";

import { ref } from "vue";
import { useUserStore } from "@/stores/userStore";
import { useRouter } from "vue-router";
import type { ContactData } from "@/types/componentProps";
import type { FriendWithUserInfo,GroupProfile } from "@/service/messageTypes";
// interface Contact {
//   id: string;
//   name: string;
//   initial: string;
// }

// interface Group {
//   id: string;
//   name: string;
//   initial?: string;
// }

type ActiveItem =
  | { type: "contact"; data: FriendWithUserInfo }
  | { type: "group"; data: GroupProfile }

// Stores
const userStore = useUserStore();
const router = useRouter();

// Refs
const activeItem = ref<ActiveItem | null>(null);
const showUserCard = ref(false);
const showContactCard = ref(false);
const showEditProfile = ref(false);

// 初始化用户资料
userStore.initialize();

const handleItemClick = (type: "contact" | "group", data: FriendWithUserInfo | GroupProfile) => {
  if (type === "contact") {
    activeItem.value = { type, data: data as FriendWithUserInfo };
    showContactCard.value = true;
  } else {
    activeItem.value = { type, data: data as GroupProfile };
  }
};

// 处理发送消息
// const handleSendMessage = (contact: ContactData) => {
//   // 跳转到聊天页面
//   router.push(`/chat/${contact.uid}`);
// };

// 处理编辑资料
const handleEditProfile = () => {
  showEditProfile.value = true;
  // 关闭当前打开的卡片
  if (showUserCard.value) {
    showUserCard.value = false;
  } else if (showContactCard.value) {
    showContactCard.value = false;
  }
};

// 处理资料更新完成
const handleProfileUpdated = (profile: any) => {
  console.log('资料已更新:', profile);
};
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