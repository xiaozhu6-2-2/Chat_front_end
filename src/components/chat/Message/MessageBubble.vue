<template>
  <!-- 撤回消息 -->
  <div v-if="isRevokedMessage" class="message-bubble revoked-message">
    <div class="revoked-content">
      <span class="revoked-text">消息已撤回</span>
    </div>
  </div>

  <!-- 正常消息 -->
  <div v-else class="message-bubble" :class="messageClasses">
    <!-- 撤回按钮 -->
    <div v-if="isOwnMessage" class="revoke-btn-container">
      <v-tooltip>
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-undo-variant"
            size="x-small"
            variant="text"
            color="grey-lighten-1"
            class="revoke-btn"
            @click.stop="handleRevokeMessage"
          />
        </template>
        <span>撤回消息</span>
      </v-tooltip>
    </div>

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
          <!-- 调试信息：用于触发响应式更新 -->
          <div class="reactive-debug">{{ displayUrl || '空' }}</div>
          <v-img
            v-if="displayUrl"
            :src="displayUrl"
            :alt="'图片'"
            cover
            max-height="200"
            @click="previewImage"
          />
          <div v-else class="image-loading">
            <v-progress-circular indeterminate size="24" />
          </div>
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
          <v-icon
            :color="isReadColor"
            :icon="isReadIcon"
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
  import { computed, onMounted, ref, watch } from 'vue'
  import { useFile } from '../../../composables/useFile'
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
  const { previewFile } = useFile()
  const emit = defineEmits<{
    imagePreview: [imageUrl: string]
  }>()
  const displayUrl = ref<string>('')
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
      case 'pending':
      case 'sending': {
        return 'mdi-clock-outline'
      }
      case 'failed': {
        return 'mdi-alert-circle'
      }
      default: {
        return '' // 成功发送不显示图标
      }
    }
  })

  const isReadIcon = computed(() => {
    if(props.message.is_read){
      return 'mdi-check-circle'
    }else{
      return 'mdi-checkbox-blank-circle-outline'
    }
  })

  const isReadColor = computed(() => {
    return props.message.is_read ? '#1976d2' : 'grey'
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
    const now = new Date()

    const isToday = date.toDateString() === now.toDateString()
    const isSameYear = date.getFullYear() === now.getFullYear()

    if (isToday) {
      // 今天的消息：只显示时间
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    } else if (isSameYear) {
      // 今年的消息：显示日期+时间
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } else {
      // 往年的消息：显示年份+日期+时间
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
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
    // 使用 displayUrl 而不是 detail，因为 displayUrl 是经过处理的可用 URL
    // detail 可能是 fileId，而 displayUrl 是通过 previewFile 加载的真实 URL
    if (isImageMessage.value && displayUrl.value) {
      emit('imagePreview', displayUrl.value)
    } else if (isImageMessage.value && props.message.payload.detail) {
      // 如果 displayUrl 未加载，fallback 到原始 detail
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

  // 处理撤回消息事件
  function handleRevokeMessage () {
    console.log('撤回消息:', props.message.payload.message_id)
    // TODO: 实现撤回消息逻辑
  }

  //处理图片预览
  const loadUrl = async () => {
    if (!props.message.payload.detail) {
      displayUrl.value = ''
      return
    }

    const detail = props.message.payload.detail

    // 检查是否是完整的 URL（http://, https://, blob:, data:）
    if (/^(https?:|blob:|data:)/.test(detail)) {
      displayUrl.value = detail
      return
    }

    // 检查是否是本地资源路径（以 /src/assets/ 或 /assets/ 开头）
    if (detail.startsWith('/src/assets/') || detail.startsWith('/assets/') || detail.startsWith('@/assets/')) {
      displayUrl.value = detail
      return
    }

    // 否则假设是 fileId，使用文件模块加载
    try {
      const url = await previewFile(detail)
      displayUrl.value = url || ''
    } catch (error) {
      displayUrl.value = ''
    }
  }

onMounted(async () => {
    if (isImageMessage.value) {
    await loadUrl()
    }
  })


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

.reactive-debug {
  color: white;
  font-size: 10px;
  padding: 2px;
  opacity: 0;
  pointer-events: none;
  height: 0;
  overflow: hidden;
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

.revoke-btn-container {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  margin-right: 4px;
  opacity: 0;
  transition: opacity 0.2s;
  position: relative;
}

.revoke-btn {
  position: relative;
  top: -10px;
}

.message-bubble:hover .revoke-btn-container {
  opacity: 1;
}
</style>
