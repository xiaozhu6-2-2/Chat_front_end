<template>
  <div class="message-bubble" :class="messageClasses">
    <div v-if="!isOwnMessage" class="message-avatar-container">
      <Avatar
        avatar-class="custom-avatar"
        :clickable="true"
        :name="senderName"
        :size="40"
        :url="senderAvatar"
        @click="handleAvatarClick"
      />
    </div>

    <div class="message-content">
      <div v-if="!isOwnMessage" class="message-sender">
        {{ senderName }}
      </div>

      <div class="message-bubble-content" :class="bubbleClasses">
        <!-- Text Message -->
        <div v-if="isTextMessage" class="message-text">
          {{ message.payload.detail }}
        </div>

        <!-- Image Message -->
        <div v-else-if="isImageMessage" class="message-image">
          <v-img
            :alt="'图片'"
            cover
            max-height="200"
            max-width="200"
            :src="message.payload.detail"
            @click="previewImage"
          />
        </div>

        <!-- File Message -->
        <div v-else-if="isFileMessage" class="message-file">
          <v-icon class="mr-2">mdi-file</v-icon>
          <span>{{ getFileName(message.payload.detail || '') }}</span>
        </div>

        <!-- System Message -->
        <div v-else-if="isSystemMessage" class="message-system">
          {{ message.payload.detail }}
        </div>
      </div>

      <div class="message-meta">
        <span class="message-time">{{ formatTime(message.payload.timestamp) }}</span>
        <span v-if="isOwnMessage" class="message-status">
          <v-icon
            :color="statusColor"
            :icon="statusIcon"
            size="16"
          />
        </span>
      </div>
    </div>

    <div v-if="isOwnMessage" class="message-avatar-container">
      <Avatar
        avatar-class="custom-avatar"
        :clickable="true"
        :name="'我'"
        :size="40"
        :url="currentUserAvatar"
        @click="handleMyAvatarClick"
      />
    </div>

    <!-- 联系人卡片弹窗 -->
    <ContactCardModal
      v-if="showContactCard && selectedContactInfo"
      v-model="showContactCard"
      :contact="selectedContactInfo"
      v-model="showContactCard"
      @update-friend-profile="(fid, remark, isBlacklisted, tag) => friendStore.updateFriendProfile(fid,  remark, isBlacklisted, tag )"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ContentType, MessageType } from '../../../service/messageTypes'
import type { MessageBubbleProps } from '../../../types/chat'
import { useFriendStore } from '../../../stores/friendStore'
import type { FriendWithUserInfo } from '../../../types/friend'
import { useFriend } from '../../../composables/useFriend'

  const props = withDefaults(defineProps<MessageBubbleProps>(), {
    currentUserId: 'current-user',
  })

const friendStore = useFriendStore()
const { updateFriendProfile } = useFriend()
const emit = defineEmits<{
  imagePreview: [imageUrl: string]
}>()

const showContactCard = ref(false)
const selectedContactInfo = ref<FriendWithUserInfo>()

  const isOwnMessage = computed(() =>
    props.message.userIsSender || props.message.payload.senderId === props.currentUserId,
  )

  const messageClasses = computed(() => ({
    'own-message': isOwnMessage.value,
    'other-message': !isOwnMessage.value,
  }))

  const bubbleClasses = computed(() => ({
    'own-bubble': isOwnMessage.value,
    'other-bubble': !isOwnMessage.value,
    'system-bubble': props.message.type === 'System',
  }))

  const senderName = computed(() => {
    // 这里可以根据需要从用户服务中获取用户名
    return props.message.payload.senderId || '未知用户'
  })

  const senderAvatar = computed(() => {
    // 这里可以根据需要从用户服务中获取用户头像
    return '/src/assets/default-avatar.png'
  })

  const currentUserAvatar = computed(() =>
    '/src/assets/yxd.jpg', // This should come from user store
  )

  const statusIcon = computed(() => {
    switch (props.message.sendStatus) {
      case 'pending': {
        return 'mdi-clock-outline'
      }
      case 'sending': {
        return 'mdi-clock-outline'
      }
      case 'sent': {
        return 'mdi-check'
      }
      case 'failed': {
        return 'mdi-alert-circle'
      }
      default: {
        return 'mdi-check'
      }
    }
  })

  const statusColor = computed(() => {
    switch (props.message.sendStatus) {
      case 'pending':
      case 'sending': {
        return 'grey'
      }
      case 'sent': {
        return 'grey'
      }
      case 'failed': {
        return 'error'
      }
      default: {
        return 'grey'
      }
    }
  })

  function formatTime (timestamp?: number) {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function getFileName (filePath: string) {
    return filePath.split('/').pop() || filePath
  }

  const isImageMessage = computed(() => {
    return props.message.payload.contentType === ContentType.IMAGE
      || (props.message.type === MessageType.GROUP && props.message.payload.detail?.startsWith('http'))
  })

  const isTextMessage = computed(() => {
    return props.message.payload.contentType === ContentType.TEXT
  })

  const isFileMessage = computed(() => {
    return props.message.payload.contentType === ContentType.FILE
  })

  const isSystemMessage = computed(() => {
    return props.message.type === MessageType.SYSTEM || props.message.type === MessageType.NOTIFICATION
  })

  function previewImage () {
    if (isImageMessage.value && props.message.payload.detail) {
      emit('imagePreview', props.message.payload.detail)
    }
  }

// 处理头像点击事件
const handleAvatarClick = () => {
  const senderId = props.message.payload.senderId

  // 首先检查是否为好友
  const friendInfo = senderId ? friendStore.getFriendByUid(senderId) : null

  if (friendInfo) {
    // 如果是好友，传递完整的 FriendWithUserInfo 数据
    selectedContactInfo.value = friendInfo
  } else {
    // 如果是陌生人，构建不完整的数据
    selectedContactInfo.value = getStrangerData()
  }

  showContactCard.value = true
}

// 处理自己头像点击事件
const handleMyAvatarClick = () => {
  // 自己的头像不查询好友关系，直接构建 UserProfile
  selectedContactInfo.value = {
    // TODO：考虑从 authStore 获取真实的用户数据
    fid: '1111',
    uid: 'current-user',
    username: '我',
    createdAt: new Date().toISOString(),
    isBlacklisted: false,
    avatar: currentUserAvatar.value,
    bio: '这是我的个人信息',
    info:{
      account: '1111',
      gender: 'male',
      region: '11',
      email: '111'
    }
  }
  showContactCard.value = true
}
</script>

<style lang="scss" scoped>
.message-bubble {
  display: flex;
  margin-bottom: 16px;
  // max-width: 80%;
  width: auto;
  &.own-message {
    margin-left: auto;
  }

  &.other-message {
    margin-right: auto;
  }
}

.message-avatar-container {
  flex-shrink: 0;
  margin: 0 8px;
}

.message-avatar{
  border-radius: 8px !important;
}

.message-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  // max-width: 70%; // 限制内容区域最大宽度
}

.message-sender {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 4px;
  margin-left: 12px;
}

.message-bubble-content {
  padding: 8px 12px;
  border-radius: 18px;
  word-wrap: break-word;
  max-width: fit-content;
  min-width: 0;
  align-self: flex-start;
  box-shadow: 2px 2px 5px 0 rgba(0,0,0,0.2);
  &.own-bubble {
    background-color: #1976d2;
    color: black;
    border-radius: 4px;
    align-self: flex-end;
  }

  &.other-bubble {
    background-color: #1c1c1e;
    color: white;
    border-radius: 4px;
    align-self: flex-start;
  }

  &.system-bubble {
    background-color: transparent;
    color: rgba(255, 255, 255, 0.6);
    text-align: center;
    font-style: italic;
    font-size: 12px;
    align-self: center;
    max-width: 90%;
  }
}

.message-text {
  display: inline-block;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 100%;
  text-align: left;

  .own-bubble & {
    text-align: left;
  }
}

.message-image {
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
}

.message-file {
  display: flex;
  align-items: center;
  cursor: pointer;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

.message-system {
  text-align: center;
}

.message-meta {
  display: flex;
  align-items: center;
  margin-top: 4px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  gap: 4px;

  .own-message & {
    flex-direction: row-reverse;
    margin-right: 12px;
  }

  .other-message & {
    margin-left: 12px;
  }
}

.message-time {
  white-space: nowrap;
}

.message-status {
  display: flex;
  align-items: center;
}
</style>
