<template>
  <!-- 撤回消息 -->
  <div v-if="isRevokedMessage" class="message-bubble revoked-message">
    <div class="revoked-content">
      <span class="revoked-text">消息已撤回</span>
    </div>
  </div>

  <!-- 正常消息 -->
  <div v-else class="message-bubble" :class="messageClasses">
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
      @edit-profile="handleEditProfile"
      @update-friend-profile="(fid, remark, isBlacklisted, tag) => updateFriendProfile(fid, {remark, isBlacklisted, tag} )"
    />
    <UserProfileEditModal
      v-model="showProfileEditModal"
      :user-id="currentUser?.id"
    />
  </div>
</template>

<script setup lang="ts">
  import type { MessageBubbleProps } from '../../../types/chat'
  import type { FriendWithUserInfo } from '../../../types/friend'
  import { storeToRefs } from 'pinia'
  import { computed, ref } from 'vue'
  import { useFriend } from '../../../composables/useFriend'
  import { useFriendStore } from '../../../stores/friendStore'
  import { useUserStore } from '../../../stores/userStore'
  import { ContentType } from '../../../types/message'
  import { MessageType } from '../../../types/websocket'
  const props = defineProps<MessageBubbleProps>()

  const friendStore = useFriendStore()
  const { updateFriendProfile } = useFriend()
  const userStore = useUserStore()
  const {
    currentUser,
    currentUserAvatar,
    currentUserId,
    currentAccount,
  } = storeToRefs(userStore)
  const emit = defineEmits<{
    imagePreview: [imageUrl: string]
  }>()

  const showContactCard = ref(false)
  const selectedContactInfo = ref<FriendWithUserInfo>()
  const showProfileEditModal = ref(false)
  const isRevokedMessage = computed(() =>
    props.message.is_revoked
  )
  const isOwnMessage = computed(() =>
    props.message.userIsSender
  )
  
  const messageClasses = computed(() => ({
    'own-message': isOwnMessage.value,
    'other-message': !isOwnMessage.value,
  }))

  const bubbleClasses = computed(() => ({
    'own-bubble': isOwnMessage.value,
    'other-bubble': !isOwnMessage.value,
  }))

  const senderName = computed(() => {
    // 直接使用消息记录的 sender_name
    return props.message.payload.sender_name || '未知用户'
  })

  const senderAvatar = computed(() => {
    // 使用消息记录的 sender_avatar（存储的是 fileId）
    // Avatar 组件会自动处理 fileId 的加载
    return props.message.payload.sender_avatar || ''
  })

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
    // timestamp 是秒级 Unix 时间戳，需要转换为毫秒
    const date = new Date(timestamp * 1000)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function getFileName (filePath: string) {
    return filePath.split('/').pop() || filePath
  }

  const isImageMessage = computed(() => {
    return props.message.payload.content_type === ContentType.IMAGE
      || (props.message.type === MessageType.MESGROUP && props.message.payload.detail?.startsWith('http'))
  })

  const isTextMessage = computed(() => {
    return props.message.payload.content_type === ContentType.TEXT
  })

  const isFileMessage = computed(() => {
    return props.message.payload.content_type === ContentType.FILE
  })

  function previewImage () {
    if (isImageMessage.value && props.message.payload.detail) {
      emit('imagePreview', props.message.payload.detail)
    }
  }

  // 处理头像点击事件
  function handleAvatarClick () {
    const senderId = props.message.payload.sender_id

    // 首先检查是否为好友
    const friendInfo = senderId ? friendStore.getFriendByUid(senderId) : null

    if (friendInfo) {
      // 如果是好友，传递完整的 FriendWithUserInfo 数据
      selectedContactInfo.value = friendInfo
    } else {
      // TODO 如果是陌生人，构建不完整的数据
      selectedContactInfo.value = getStrangerData()
    }

    showContactCard.value = true
  }

  // 处理自己头像点击事件
  function handleMyAvatarClick () {
    // 自己的头像不查询好友关系，直接构建 UserProfile
    selectedContactInfo.value = {
      // OK：考虑从 authStore 获取真实的用户数据
      id: currentUserId.value,
      fid: 'default',
      name: '我',
      createdAt: currentUser.value?.createdAt,
      isBlacklisted: false,
      avatar: currentUserAvatar.value,
      bio: '这是我的个人信息',
      info: {
        account: currentAccount.value,
        gender: currentUser.value?.gender,
        region: currentUser.value?.region,
        email: currentUser.value?.email,
      },
    }
    showContactCard.value = true
  }

  // 处理编辑资料事件
  function handleEditProfile () {
    showProfileEditModal.value = true
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

// 撤回消息样式
.revoked-message {
  display: flex;
  justify-content: center;
  width: 100%;
  margin-bottom: 16px;
}

.revoked-content {
  display: inline-block;
  background-color: rgba(255, 255, 255, 0.1);
  padding: 4px 12px;
  border-radius: 4px;
}

.revoked-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}
</style>
