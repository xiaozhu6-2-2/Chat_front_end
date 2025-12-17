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
  import { ref } from 'vue'

  import maincontent from '@/layouts/maincontent.vue'

  interface Contact {
    id: string
    uid: string
    name: string
    initial: string
    tag?: string
    avatar?: string
    bio?: string
    remark?: string
  }

  interface Group {
    id: string
    name: string
    initial?: string
  }

  type ActiveItem
    = | { type: 'contact', data: Contact }
      | { type: 'group', data: Group }

  const activeItem = ref<ActiveItem | null>(null)

  function handleItemClick (type: 'contact' | 'group', data: Contact | Group) {
    activeItem.value = type === 'contact' ? { type, data: data as Contact } : { type, data: data as Group }
  }
</script>

<style scoped>
.fixed-size-image {
  flex: none !important;
}
</style>
