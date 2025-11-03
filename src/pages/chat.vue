<template>
  <maincontent>
    <template #detailbar>
      <chatList :active-item="activeItem" @item-click="handleItemClick" />
    </template>
    <template #main>
      <!-- 默认界面 -->
      <div
        v-if="!activeItem"
        style="height: 100%"
      >
        <echat-welcome />
      </div>

      <!-- 聊天界面 -->
      <chatArea
        v-else-if="activeItem.type === 'chat'"
        :chat="activeItem.data"
      />
    </template>
  </maincontent>
</template>

<script setup lang="ts">
import maincontent from '@/layouts/maincontent.vue'
import { ref } from 'vue'

interface Chat {
  id: string;
  name: string;
  avatar?: string;
  type: 'private' | 'group';
  lastMessage?: string;
}

interface ActiveItem {
  type: "chat";
  data: Chat;
}

const activeItem = ref<ActiveItem | null>(null);

const handleItemClick = (type: "chat", data: Chat) => {
  activeItem.value = { type, data };
};
</script>

<style scoped>
.fixed-size-image {
  flex: none !important;
}
</style>