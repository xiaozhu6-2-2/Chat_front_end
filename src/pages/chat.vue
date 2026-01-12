<template>
  <maincontent>
    <template #detailbar>
      <chatList :active-chat-id="activeChatId" />
    </template>
    <template #main>
      <!-- 默认界面 -->
      <div v-if="!activeChat" class="welcome-container">
        <echat-welcome />
      </div>

      <!-- 聊天界面 -->
      <chatArea
        v-else
        :chat="activeChat"
        @image-preview="handleImagePreview"
      />
    </template>
  </maincontent>
</template>

<script setup lang="ts">
  import type { Chat } from '../types/chat'
  import { onMounted } from 'vue'
  import { useChat } from '../composables/useChat'
  import { useChatStore } from '../stores/chatStore'
  // @ts-ignore - maincontent layout is imported for manual usage
  import maincontent from '../layouts/maincontent.vue'

  // Use chat composable
  const { activeChatId, activeChat, selectChat, initializeChats } = useChat()
  // Computed property for active chat ID
  // const activeChatId = computed(() => currentChat.value?.id)

  function handleImagePreview (imageUrl: string) {
    // TODO: Implement image preview dialog
    console.log('Image preview:', imageUrl)
  }

  // Initialize chat list on mount
  onMounted(() => {
    initializeChats(false) // 不强制初始化，检查缓存
  })
</script>

<style scoped>
.welcome-container {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
