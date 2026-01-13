<template>
  <!-- 撤回消息 - 使用 v-chip 居中显示 -->
  <div v-if="isRevokedMessage" class="message-bubble revoked-message">
    <v-chip
      class="revoked-chip"
      size="small"
      variant="tonal"
      color="grey-lighten-1"
    >
      {{ revokeMessageText }}
    </v-chip>
  </div>

  <!-- 正常消息和公告消息 - 整合在一起 -->
  <div v-else class="message-bubble" :class="messageClasses">
    <!-- 撤回按钮 -->
    <div v-if="canRevokeMessage" class="revoke-btn-container">
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

      <!-- 公告消息内容 -->
      <div v-if="isAnnouncement" class="message-bubble-content announcement-bubble" :class="bubbleClasses">
        <div class="announcement-header">
          <span class="announcement-label">群公告</span>
        </div>
        <div class="announcement-text">{{ announcementData?.content }}</div>
        <div v-if="announcementData?.mentioned_uids?.length" class="announcement-mentions">
          <v-chip size="x-small" color="info">@{{ announcementData.mentioned_uids.length }}人</v-chip>
        </div>
      </div>

      <!-- 普通消息内容 -->
      <div v-else class="message-bubble-content" :class="bubbleClasses">
        <!-- Text Message -->
        <TextMessage v-if="isTextMessage" :message="message" />

        <!-- Image Message -->
        <div v-else-if="isImageMessage" class="message-image">
          <!-- 调试信息：用于触发响应式更新 -->
          <div class="reactive-debug">{{ displayUrl || '空' }}</div>
          <v-img
            v-if="displayUrl"
            :src="displayUrl"
            :alt="'图片'"
            max-width="300"
            max-height="200"
            @click="previewImage"
          />
          <div v-else class="image-loading">
            <v-progress-circular indeterminate size="24" />
          </div>
        </div>

        <!-- File Message - WeChat Style Card -->
        <div v-else-if="isFileMessage" class="message-file-card" :class="{ 'loading': isLoadingFile }" @click="handleFileDownload">
          <!-- Loading State -->
          <div v-if="isLoadingFile" class="file-card-loading">
            <v-progress-circular indeterminate size="24" color="grey-lighten-1" />
          </div>

          <!-- File Card Content -->
          <template v-else-if="filePreviewInfo">
            <div class="file-card-info">
              <div class="file-name">{{ filePreviewInfo.fileName }}</div>
              <div class="file-size">{{ formatFileSize(filePreviewInfo.fileSize) }}</div>
            </div>
            <div class="file-card-icon">
              <v-icon size="40">
                {{ getFileIcon(filePreviewInfo.fileName, filePreviewInfo.mimeType) }}
              </v-icon>
            </div>
          </template>

          <!-- Fallback -->
          <div v-else class="file-card-fallback">
            <v-icon class="mr-2">mdi-file-alert</v-icon>
            <span>文件加载失败</span>
          </div>
        </div>
      </div>

      <div class="message-meta">
        <span class="message-time">{{ formatTime(isAnnouncement ? announcementData?.send_time : message.payload.timestamp) }}</span>
        <span v-if="isOwnMessage" class="message-status">
          <v-icon
            :color="statusColor"
            :icon="statusIcon"
            size="16"
            class="mr-2"
          />

          <v-icon
            v-if="props.message.type === 'Private'"
            :color="isReadColor"
            :icon="isReadIcon"
            size="16"
          />
          <!-- 群聊消息已读人数 -->
          <ReadersListDialog
            v-if="readCount !== undefined && readCount >= 0 && props.message.type === 'MesGroup' && props.message.payload.message_id && props.message.payload.chat_id"
            v-model="showReadersDialog"
            :message-id="props.message.payload.message_id"
            :chat-id="props.message.payload.chat_id"
            :chat-type="'group'"
            :read-count="readCount"
          >
            <template #activator="{ props: activatorProps }">
              <v-chip
                v-bind="activatorProps"
                size="x-small"
                variant="outlined"
                class="read-count-chip"
              >
                {{ readCount }}人已读
              </v-chip>
            </template>
          </ReadersListDialog>
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
  import type { FilePreviewInfo } from '../../../types/file'
  import type { GroupAnnouncement } from '../../../types/group'
  import { storeToRefs } from 'pinia'
  import { computed, onMounted, ref } from 'vue'
  import { useFile } from '../../../composables/useFile'
  import { useFriend } from '../../../composables/useFriend'
  import { useMessage } from '../../../composables/useMessage'
  import { useFriendStore } from '../../../stores/friendStore'
  import { useUserStore } from '../../../stores/userStore'
  import { ContentType } from '../../../types/message'
  import { MessageType } from '../../../types/websocket'
  import { strangerUserService } from '../../../service/strangerUserService'

  // 撤回时间限制：2分钟 = 120秒
  const REVOKE_TIME_LIMIT = 120

  const props = defineProps<MessageBubbleProps>()

  const friendStore = useFriendStore()
  const { updateFriendProfile } = useFriend()
  const { revokeMessage } = useMessage()
  const userStore = useUserStore()
  const {
    currentUser,
    currentUserAvatar,
    currentUserId,
    currentAccount,
  } = storeToRefs(userStore)
  const { previewFile, getFilePreviewInfo, downloadFile, formatFileSize } = useFile()
  const emit = defineEmits<{
    imagePreview: [imageUrl: string]
  }>()
  const displayUrl = ref<string>('')
  const filePreviewInfo = ref<FilePreviewInfo | null>(null)
  const isLoadingFile = ref(false)
  const showContactCard = ref(false)
  const selectedContactInfo = ref<FriendWithUserInfo>()
  const showProfileEditModal = ref(false)
  const showReadersDialog = ref(false)
  const isRevokedMessage = computed(() =>
    props.message.is_revoked
  )

  // 判断是否为公告消息
  const isAnnouncement = computed(() => {
    return props.message.type === MessageType.MESGROUP &&
           props.message.payload.is_announcement === true
  })

  // 构造公告数据（用于展示）
  const announcementData = computed((): GroupAnnouncement | null => {
    if (!isAnnouncement.value) return null
    return {
      msg_id: props.message.payload.message_id || '',
      gid: props.message.payload.chat_id || '',
      content: props.message.payload.detail || '',
      sender_uid: props.message.payload.sender_id || '',
      send_time: props.message.payload.timestamp || 0,
      mentioned_uids: props.message.payload.mentioned_uids || undefined,
      quote_msg_id: props.message.payload.quote_msg_id,
    }
  })
  const isOwnMessage = computed(() =>
    props.message.userIsSender
  )

  // 判断消息是否可以撤回（时间限制内）
  const canRevokeMessage = computed(() => {
    if (!isOwnMessage.value || isRevokedMessage.value) {
      return false
    }
    const messageTimestamp = props.message.payload.timestamp
    if (!messageTimestamp) return false
    const now = Math.ceil(Date.now() / 1000)
    const timeElapsed = now - messageTimestamp
    return timeElapsed <= REVOKE_TIME_LIMIT
  })

  // 撤回消息显示文本
  const revokeMessageText = computed(() => {
    const senderName = props.message.payload.sender_name
    return senderName ? `${senderName}撤回了一条消息` : '撤回了一条消息'
  })

  // 直接访问 message 对象的 read_count 属性（响应式）
  const readCount = computed(() => {
    if (props.message.type !== 'MesGroup') {
      return undefined
    }
    const count = props.message.read_count
    return count
  })
  
  const messageClasses = computed(() => ({
    'own-message': isOwnMessage.value,
    'other-message': !isOwnMessage.value,
  }))

  const bubbleClasses = computed(() => ({
    'own-bubble': isOwnMessage.value,
    'other-bubble': !isOwnMessage.value,
  }))

  const senderName = computed(() => {
    const senderId = props.message.payload.sender_id
    if (!senderId) return '未知用户'

    // 尝试从 friendStore 获取好友信息
    const friendInfo = friendStore.getFriendByUid(senderId)

    // 如果有好友信息且有备注，优先显示备注
    if (friendInfo && friendInfo.remark) {
      return friendInfo.remark
    }

    // 否则使用消息记录的 sender_name
    return props.message.payload.sender_name || '未知用户'
  })

  const senderAvatar = computed(() => {
    // 使用消息记录的 sender_avatar（存储的是 fileId）
    // Avatar 组件会自动处理 fileId 的加载
    return props.message.payload.sender_avatar || ''
  })

  const statusIcon = computed(() => {
    // 根据发送状态显示图标
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
    // 已读状态也保持灰色，只有失败状态显示红色
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

  // 获取文件类型图标
  function getFileIcon (fileName: string, mimeType?: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase()

    if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext || '')) {
      return 'mdi-file-image'
    }
    if (ext === 'pdf' || mimeType?.includes('pdf')) {
      return 'mdi-file-pdf-box'
    }
    if (['doc', 'docx'].includes(ext || '') || mimeType?.includes('word')) {
      return 'mdi-file-word'
    }
    if (['xls', 'xlsx'].includes(ext || '') || mimeType?.includes('sheet')) {
      return 'mdi-file-excel'
    }
    if (['ppt', 'pptx'].includes(ext || '') || mimeType?.includes('presentation')) {
      return 'mdi-file-powerpoint'
    }
    if (mimeType?.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv'].includes(ext || '')) {
      return 'mdi-file-video'
    }
    if (mimeType?.startsWith('audio/') || ['mp3', 'wav', 'flac', 'aac'].includes(ext || '')) {
      return 'mdi-file-music'
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) {
      return 'mdi-file-zip'
    }
    if (['js', 'ts', 'html', 'css', 'json', 'py', 'java', 'cpp'].includes(ext || '')) {
      return 'mdi-file-code'
    }
    if (ext === 'txt' || mimeType?.startsWith('text/')) {
      return 'mdi-file-document'
    }
    return 'mdi-file-outline'
  }

  // 加载文件预览信息
  async function loadFileInfo () {
    const fileId = props.message.payload.detail
    if (!fileId) {
      filePreviewInfo.value = null
      return
    }

    isLoadingFile.value = true
    try {
      const info = await getFilePreviewInfo(fileId)
      filePreviewInfo.value = info
    } catch (error) {
      console.error('Failed to load file info:', error)
      filePreviewInfo.value = null
    } finally {
      isLoadingFile.value = false
    }
  }

  // 处理文件下载
  async function handleFileDownload () {
    const fileId = props.message.payload.detail
    const fileName = filePreviewInfo.value?.fileName
    if (!fileId) return

    try {
      await downloadFile(fileId, fileName)
    } catch (error) {
      console.error('Failed to download file:', error)
    }
  }

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
  async function handleAvatarClick () {
    const senderId = props.message.payload.sender_id

    // 调试：打印 friendStore 中的所有好友
    console.log('[handleAvatarClick] All friends in store:', Array.from(friendStore.friends.values()).map(f => ({ id: f.id, name: f.name, fid: f.fid, isBlacklisted: f.isBlacklisted })))
    console.log('[handleAvatarClick] Looking for senderId:', senderId)

    // 首先检查是否为好友
    const friendInfo = senderId ? friendStore.getFriendByUid(senderId) : null
    console.log('[handleAvatarClick] Found friendInfo:', friendInfo)

    if (friendInfo) {
      // 如果是好友，传递完整的 FriendWithUserInfo 数据
      selectedContactInfo.value = friendInfo
      showContactCard.value = true
    } else {
      // 如果是陌生人，调用 strangerUserService 获取用户信息
      if (senderId) {
        try {
          const strangerProfile = await strangerUserService.getUserProfile(senderId)
          // 将 StrangerUserProfile 转换为 FriendWithUserInfo 格式
          selectedContactInfo.value = {
            id: strangerProfile.uid,
            fid: 'stranger', // 陌生人没有 fid
            name: strangerProfile.username,
            avatar: strangerProfile.avatar || '', // avatar 是必填字段
            createdAt: undefined,
            isBlacklisted: false,
            bio: strangerProfile.bio || undefined,
            // 详细资料放在 info 对象中
            info: {
              account: strangerProfile.account,
              gender: strangerProfile.gender || undefined,
              region: strangerProfile.region || undefined,
              email: strangerProfile.email || undefined,
            },
          }
          showContactCard.value = true
        } catch (error) {
          console.error('获取陌生人用户信息失败:', error)
        }
      }
    }
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
  async function handleRevokeMessage () {
    const messageId = props.message.payload.message_id
    const chatId = props.message.payload.chat_id
    const chatType = props.message.type === 'Private' ? 'private' : 'group'

    if (!messageId || !chatId) {
      return
    }

    await revokeMessage(messageId, chatId, chatType)
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
    if (isFileMessage.value) {
    await loadFileInfo()
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
  margin-left: 3px;
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

// WeChat-style file card (250px × 100px)
.message-file-card {
  width: 250px;
  max-width: min(250px, calc(100vw - 250px));
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s ease;

  &.loading {
    justify-content: center;
  }

  .own-bubble & {
    color: #333;
    &:hover {
      background-color: rgba(255, 255, 255, 0.3);
    }
  }

  .other-bubble & {
    color: #fff;
    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }
}

.file-card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  padding-right: 12px;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 6px;

  .own-bubble & { color: #1a1a1a; }
  .other-bubble & { color: #ffffff; }
}

.file-size {
  font-size: 12px;
  opacity: 0.7;

  .own-bubble & { color: #666; }
  .other-bubble & { color: rgba(255, 255, 255, 0.7); }
}

.file-card-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;

  .own-bubble & { color: #1a1a1a; }
  .other-bubble & { color: rgba(255, 255, 255, 0.9); }
}

.file-card-loading,
.file-card-fallback {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-card-fallback {
  padding: 12px;
  font-size: 13px;

  .own-bubble & { color: #666; }
  .other-bubble & { color: rgba(255, 255, 255, 0.7); }
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
  // 覆盖 message-bubble 的所有布局样式
  display: flex !important;
  justify-content: center !important;
  margin: 0 auto 16px auto !important;
  width: 100%;
}

.revoked-chip {
  font-size: 12px !important;
}

// 公告消息样式
.announcement-bubble {
  padding: 16px;
  // 覆盖 own-bubble 和 other-bubble 的背景色，保持黄色渐变
  background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%) !important;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(255, 152, 0, 0.2);

  // 继承 own-bubble 和 other-bubble 的对齐方式
  &.own-bubble {
    align-self: flex-end;
  }

  &.other-bubble {
    align-self: flex-start;
  }
}

.announcement-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.announcement-label {
  font-weight: 600;
  color: #e65100;
  font-size: 14px;
}

.announcement-text {
  color: #4e342e;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.announcement-mentions {
  margin-top: 8px;
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

.read-count-chip.clickable {
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(25, 118, 210, 0.1);
  }
}
</style>
