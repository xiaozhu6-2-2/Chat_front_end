<template>
  <div class="chat-list">
    <v-list class="pa-0">
      <v-list-item
        v-for="chat in chatList"
        :key="chat.id"
        class="chat-item"
        :class="{ 'active-chat': isActiveChat(chat.id), 'pinned-chat': chat.isPinned }"
        @click="handleChatClick(chat)"
      >
        <template #prepend>
          <div class="avatar-container mr-4">
            <Avatar
              avatar-class="custom-avatar"
              badge-color="error"
              :badge-content="formatUnreadCount(chat.unreadCount)"
              :badge-dot="false"
              :clickable="false"
              :is-online="getChatOnlineStatus(chat) === true"
              :name="getChatDisplayName(chat.id, chat.type)"
              :show-badge="chat.unreadCount > 0"
              :show-online-indicator="chat.type === 'private'"
              :size="40"
              :url="chat.avatar"
            />
          </div>
        </template>

        <v-list-item-title class="chat-name">
          {{ getChatDisplayName(chat.id, chat.type) }}
        </v-list-item-title>

        <v-list-item-subtitle class="chat-message">
          <span v-if="chat.mentionedCount && chat.mentionedCount > 0" class="mention-indicator">
            有人@你
          </span>
          {{ chat.lastMessage || '暂无消息' }}
        </v-list-item-subtitle>

        <template #append>
          <div class="chat-meta">
            <!-- 置顶按钮 -->
            <v-tooltip>
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  class="pin-btn"
                  color="grey-lighten-1"
                  :icon="chat.isPinned ? 'mdi-pin' : 'mdi-pin-outline'"
                  size="x-small"
                  variant="text"
                  @click.stop="handlePinToggle(chat)"
                />
              </template>
              <span>{{ chat.isPinned ? '取消置顶' : '置顶聊天' }}</span>
            </v-tooltip>
            <span v-if="chat.updatedAt" class="chat-time">
              {{ formatTime(chat.updatedAt) }}
            </span>
          </div>
        </template>
      </v-list-item>
    </v-list>
    <div v-if="chatList.length === 0" class="no-results">
      <v-icon class="mb-2" icon="mdi-comment-off" size="24" />
      <p>暂无聊天</p>
      <p class="text-caption text-grey">与好友或群聊开始聊天后，可以在此查看</p>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { Chat } from '../../types/chat'
  import { useChat } from '../../composables/useChat'
  import { useFriend } from '../../composables/useFriend'
  import { useSidebarStore } from '../../stores/sidebarStore'

  const { activeChatId, chatList, selectChat, togglePinChat, getChatDisplayName } = useChat()
  const { getFriendByFid } = useFriend()
  const sidebarStore = useSidebarStore()

  /**
   * 获取聊天对象的在线状态
   * 私聊：从好友列表获取在线状态（使用 fid 查找）
   * 群聊：不显示在线状态
   */
  function getChatOnlineStatus (chat: Chat): boolean | undefined {
    if (chat.type !== 'private') {
      return undefined
    }
    // chat.id 是 pid/fid，使用 getFriendByFid 查找好友
    const friend = getFriendByFid(chat.id)
    return friend?.online_state
  }

  function isActiveChat (chatId: string) {
    return activeChatId.value === chatId
  }

  function handleChatClick (chat: Chat) {
    selectChat(chat.id)
    // 选择聊天后折叠侧边栏
    sidebarStore.collapse()
  }

  async function handlePinToggle (chat: Chat) {
    await togglePinChat(chat.id, chat.type, !chat.isPinned)
  }

  function formatUnreadCount (count: number) {
    return count > 99 ? '99+' : count.toString()
  }

  function formatTime (timestamp: string) {
    // 后端返回的是秒级 Unix 时间戳字符串，需要转换为毫秒
    // 本地生成的是 ISO 8601 格式字符串
    let date: Date
    const timestampNum = Number(timestamp)
    if (!isNaN(timestampNum) && timestampNum > 1000000000) {
      // 秒级时间戳（如 "1736745600"），转换为毫秒
      date = new Date(timestampNum * 1000)
    } else {
      // ISO 格式字符串（如 "2024-01-13T10:30:00Z"）
      date = new Date(timestamp)
    }
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      // Today - show time
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    } else if (diffDays === 1) {
      // Yesterday
      return '昨天'
    } else if (diffDays < 7) {
      // This week
      return date.toLocaleDateString('zh-CN', {
        weekday: 'short',
      })
    } else {
      // Older - show date
      return date.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
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

  &.pinned-chat {
    background-color: #25252a;
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

.mention-indicator {
  color: #f44336;
  font-weight: 600;
  margin-right: 8px;
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

.pin-btn {
  margin-left: 8px;
  opacity: 0.6;
  transition: opacity 0.2s;
  &:hover {
    opacity: 1;
  }
}

.no-results {
  padding: 16px;
  text-align: center;
  color: #999;
  font-size: 14px;
}
</style>
