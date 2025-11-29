<template>
  <div class="chat-list">
    <v-list class="pa-0">
      <v-list-item
        v-for="chat in chatList"
        :key="chat.id"
        class="chat-item"
        :class="{ 'active-chat': isActiveChat(chat.id) }"
        @click="handleChatClick(chat)"
      >
        <template v-slot:prepend>
          <div class="avatar-container mr-4">
            <Avatar
              :url="chat.avatar"
              :name="chat.name"
              :size="40"
              :clickable="false"
              avatar-class="custom-avatar"
              :show-badge="chat.unreadCount > 0"
              :badge-content="formatUnreadCount(chat.unreadCount)"
              badge-color="error"
              :badge-dot="false"
            />
          </div>
        </template>

        <v-list-item-title class="chat-name">
          {{ chat.name }}
        </v-list-item-title>

        <v-list-item-subtitle class="chat-message">
          {{ chat.lastMessage || '暂无消息' }}
        </v-list-item-subtitle>

        <template v-slot:append>
          <div class="chat-meta">
            <span class="chat-time" v-if="chat.updatedAt">
              {{ formatTime(chat.updatedAt) }}
            </span>
          </div>
        </template>
      </v-list-item>
    </v-list>
  </div>
</template>

<script setup lang="ts">
import { useChat } from '@/composables/useChat'
import type { Chat } from '../../service/messageTypes'
import Avatar from '../../components/global/Avatar.vue'

import type { ChatListProps } from '../../types/componentProps'

const props = withDefaults(defineProps<ChatListProps>(), {
  activeChatId: undefined
})

const emit = defineEmits<{
  chatSelected: [chat: Chat]
}>()

const { chatList, selectChat } = useChat()

const isActiveChat = (chatId: string) => {
  return props.activeChatId === chatId
}

const handleChatClick = (chat: Chat) => {
  selectChat(chat)
  emit('chatSelected', chat)
}

const formatUnreadCount = (count: number) => {
  return count > 99 ? '99+' : count.toString()
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    // Today - show time
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  } else if (diffDays === 1) {
    // Yesterday
    return '昨天'
  } else if (diffDays < 7) {
    // This week
    return date.toLocaleDateString('zh-CN', {
      weekday: 'short'
    })
  } else {
    // Older - show date
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit'
    })
  }
}
</script>

<style lang="scss" scoped>
.chat-list {
  background-color: #1c1c1e;
  height: 100%;
  overflow-y: auto;
}

.chat-item {
  min-height: 72px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  background-color: #1c1c1e;
  &:hover {
    background-color: #2a2a2e;
  }

  &.active-chat {
    background-color: #3a3a3e;
  }
}

.avatar-container {
  position: relative;
  display: inline-block;
}

.custom-avatar {
  border-radius: 10px !important;
  overflow: hidden;
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
}

.chat-name {
  font-weight: 500;
  font-size: 14px;
  color: white;
}

.chat-message {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.chat-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.chat-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}
</style>