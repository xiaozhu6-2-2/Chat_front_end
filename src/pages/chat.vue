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
        <chatArea v-else :chat="activeChat" @image-preview="handleImagePreview" />
      </template>
    </maincontent>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import maincontent from '../layouts/maincontent.vue'
import { useChat } from '../composables/useChat'
import { useChatStore } from '../stores/chatStore'
import chatList from '../components/chat/chatList.vue'
import chatArea from '../components/chat/chatArea.vue'
import type { Chat } from '../types/chat'

// Use chat composable
const { activeChatId, activeChat, selectChat } = useChat()
const { fetchChatList } = useChatStore()
// Computed property for active chat ID
// const activeChatId = computed(() => currentChat.value?.id)


  function handleImagePreview (imageUrl: string) {
    // TODO: Implement image preview dialog
    console.log('Image preview:', imageUrl)
  }

// Initialize chat list on mount
onMounted(() => {
  fetchChatList()
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
