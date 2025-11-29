<!-- views/ContactView.vue -->
<template>
  <maincontent>
    <template #detailbar>
      <contactList :active-item="activeItem" @item-click="handleItemClick" />
    </template>
    <template #main class="d-flex align-center justify-center">
      <!-- 默认界面 -->

      <div
        v-if="!activeItem"
        style="height: 100%"
      >
        <echat-welcome />
      </div>

      <!-- 联系人详情 -->
      <contactCard
        v-else-if="activeItem.type === 'contact'"
        :contact="activeItem.data"
      />

      <!-- 群聊详情 -->
      <groupCard
        v-else-if="activeItem.type === 'group'"
        :group="activeItem.data"
      />
    </template>
  </maincontent>
</template>

<script lang="ts" setup>
import maincontent from "@/layouts/maincontent.vue";

import { ref } from "vue";

interface Contact {
  id: string;
  name: string;
  initial: string;
}

interface Group {
  id: string;
  name: string;
  initial?: string;
}

type ActiveItem =
  | { type: "contact"; data: Contact }
  | { type: "group"; data: Group }

const activeItem = ref<ActiveItem | null>(null);

const handleItemClick = (type: "contact" | "group", data: Contact | Group) => {
  if (type === "contact") {
    activeItem.value = { type, data: data as Contact };
  } else {
    activeItem.value = { type, data: data as Group };
  }
};
</script>

<style scoped>
.fixed-size-image {
  flex: none !important;
}
</style>