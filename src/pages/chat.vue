<template>
  <maincontent>
    <template #detailbar>
      <chatList :active-chat-id="activeChatId" @chat-selected="handleChatSelected" />
    </template>
    <template #main>
      <!-- 默认界面 -->
      <div v-if="!currentChat" class="welcome-container">
        <echat-welcome />
      </div>

      <!-- 聊天界面 -->
      <chatArea v-else :chat="currentChat" @image-preview="handleImagePreview" />
    </template>
  </maincontent>
</template>

<script setup lang="ts">
  import type { Chat } from '@/service/messageTypes'
  import { computed, onMounted } from 'vue'
  import chatArea from '@/components/chat/chatArea.vue'
  import chatList from '@/components/chat/chatList.vue'
  import { useChat } from '@/composables/useChat'
  import maincontent from '@/layouts/maincontent.vue'

  // Use chat composable
  const { currentChat, selectChat, refreshChatList } = useChat()

  // Computed property for active chat ID
  const activeChatId = computed(() => currentChat.value?.id)

  // Event handlers
  function handleChatSelected (chat: Chat) {
    selectChat(chat)
  }

  function handleImagePreview (imageUrl: string) {
    // TODO: Implement image preview dialog
    console.log('Image preview:', imageUrl)
  }

  // Initialize chat list on mount
  onMounted(() => {
    refreshChatList()
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
