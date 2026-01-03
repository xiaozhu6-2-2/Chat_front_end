<template>
  <v-card class="chat-container" elevation="0">
    <!-- 顶部聊天信息栏 -->
    <v-toolbar class="chat-header" density="compact">
      <Avatar
        avatar-class="custom-avatar ml-6"
        :clickable="false"
        :name="activeChat?.name"
        :size="40"
        :url="activeChat?.avatar"
      />
      <v-toolbar-title>{{ activeChat?.name }}</v-toolbar-title>
      <v-spacer />

      <v-btn v-if="activeChat?.type === 'group'" icon @click="toggleOnlineBoard">
        <v-icon>mdi-dots-horizontal</v-icon>
      </v-btn>
      <v-btn v-if="activeChat?.type === 'private'" icon @click="togglePrivateBoard">
        <v-icon>mdi-dots-horizontal</v-icon>
      </v-btn>
    </v-toolbar>
    <v-divider />

    <!-- 聊天内容区域 -->
    <div class="messages-container">
      <!-- 新消息提示 -->
      <div
        v-if="showNewMessageTip"
        class="new-message-tip"
        @click="handleNewMessageTipClick"
      >
        <v-chip color="primary" size="small" class="tip-chip">
          <v-icon start size="small">mdi-message-text-outline</v-icon>
          有新消息
        </v-chip>
      </div>

      <div v-if="messages.length === 0" class="empty-state">
        <p>暂无消息，开始聊天吧！</p>
      </div>

      <!-- 虚拟滚动消息列表 -->
      <VirtualMessageList
        v-else
        ref="virtualMessageList"
        :auto-scroll="autoScroll"
        :container-height="containerHeight"
        :current-user-id="currentUserId"
        :messages="messages"
        :has-more="hasMore"
        :is-loading-more="isLoadingMore"
        @image-preview="handleImagePreview"
        @scroll-near-bottom="handleScrollNearBottom"
        @scroll-near-top="handleScrollNearTop"
      />
    </div>

    <!-- 底部输入区域 -->
    <div class="input-container">

      <!-- 上传进度条 -->
      <v-expand-transition>
        <div v-if="isUploading" class="upload-progress-banner">
          <v-progress-linear
            :model-value="uploadProgress"
            color="primary"
            height="4"
            striped
          />
          <div class="upload-info">
            <v-icon size="small">mdi-cloud-upload</v-icon>
            <span class="ml-2">正在上传 {{ uploadingFileName }}... {{ uploadProgress }}%</span>
          </div>
        </div>
      </v-expand-transition>

      <!-- 表情选择器 -->
      <div v-if="showEmojiPicker" class="emoji-picker">
        <v-btn
          v-for="emoji in emojis"
          :key="emoji"
          variant="text"
          @click="insertEmoji(emoji)"
        >
          {{ emoji }}
        </v-btn>
      </div>

      <echatInput
        v-model="inputMessage"
        @keydown.enter.exact.prevent="handleSendMessage"
        @send-message="handleSendMessage"
        @send-file="handleFileUpload"
      />

    </div>

    <!-- Online Board -->
    <OnlineBoard v-model="showOnlineBoard" />
  </v-card>
</template>

<script setup lang="ts">
  import type { Chat, ChatAreaProps, ChatType } from '../../types/chat'
  import type { LocalMessage } from '../../types/message'
  import { storeToRefs } from 'pinia'
  import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
  import Avatar from '../../components/global/Avatar.vue'
  import { useChat } from '../../composables/useChat'
  import { useMessage } from '../../composables/useMessage'
  import { useMessageInput } from '../../composables/useMessageInput'
  import { useReadCountPolling } from '../../composables/useReadCountPolling'
  import { useChatStore } from '../../stores/chatStore'
  import { useMessageStore } from '../../stores/messageStore'
  import { useUserStore } from '../../stores/userStore'
  import { useSnackbar } from '../../composables/useSnackbar'

  import echatInput from './echatInput.vue'
  import OnlineBoard from './onlineBoard.vue'
  import VirtualMessageList from './VirtualMessageList.vue'

  const props = defineProps<ChatAreaProps>()

  const emit = defineEmits<{
    imagePreview: [imageUrl: string]
  }>()

  // Store and composables
  const chatStore = useChatStore()
  const messageStore = useMessageStore()
  const { activeChat, selectChat, activeChatId, activeChatType } = useChat()

  // 群聊已读人数轮询
  const { watchChatChange } = useReadCountPolling()

  // 监听会话变化并启动/停止轮询
  watchChatChange(activeChatId.value, activeChatType.value)

  const {
    inputMessage,
    showEmojiPicker,
    emojis,
    insertEmoji,
    toggleEmojiPicker,
  } = useMessageInput()
  const {
    messages,
    loading,
    hasMore,
    sendTextMessage,
    sendFileMessage,
    init,
    loadHistoryMessages,
  } = useMessage()
  const userStore = useUserStore()
  const { currentUser, currentUserId } = storeToRefs(userStore)
  const { showSuccess, showError, showInfo } = useSnackbar()

  // Local state
  const showOnlineBoard = ref(false)
  const showContactCard = ref(false)
  const isSending = ref(false)
  const virtualMessageList = ref()

  // 上传状态
  const isUploading = ref(false)
  const uploadProgress = ref(0)
  const uploadingFileName = ref('')

  // 新消息提示状态
  const showNewMessageTip = ref(false)
  const newMessageCount = ref(0)

  // 加载更多历史消息状态
  const isLoadingMore = ref(false)
  const debouncedLoadMore = ref<ReturnType<typeof setTimeout> | null>(null)

  // 当前聊天联系人信息
  const currentChatContact = computed(() => {
    if (!props.chat) return null
    return currentUser.value
  })

  // 虚拟滚动配置
  const autoScroll = ref(true)
  const containerHeight = computed(() => {
    // 计算容器高度，减去头部、输入框等高度
    const headerHeight = 64 // v-toolbar 高度
    const inputHeight = 120 // 输入区域估计高度
    const padding = 32 // 上下边距
    return window.innerHeight - headerHeight - inputHeight - padding - 60 // 侧边栏宽度
  })

  // Computed
  const isLoading = computed(() => loading)

  // 用于跟踪是否刚切换了聊天
  const justSwitchedChat = ref(false)
  // 用于跟踪是否正在发送消息（自己发送消息时不显示"有新消息"提示）
  const isSendingLocalMessage = ref(false)

  // 监听聊天切换，重置状态并等待加载完成后滚动到底部
  watch(() => activeChatId.value, async (newChatId) => {
    if (!newChatId) return

    showNewMessageTip.value = false
    newMessageCount.value = 0
    isLoadingMore.value = false

    // 标记刚切换了聊天
    justSwitchedChat.value = true

    // 等待当前正在进行的加载完成
    while (loading.value) {
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    // 再等待一个 nextTick 确保 DOM 更新
    await nextTick()

    setTimeout(() => {
      virtualMessageList.value?.setScrollToBottomDirectly()
      // 延迟恢复 justSwitchedChat 状态，防止滚动过程中触发加载历史消息
      setTimeout(() => {
        justSwitchedChat.value = false
      }, 300)
    }, 150)
  }, { immediate: true })

  // 监听消息长度变化，检测新消息和首次加载
  watch(
    () => messages.value.length,
    async (newLength, oldLength) => {
      // 跳过刚切换聊天后的首次渲染
      if (justSwitchedChat.value) {
        return
      }

      // 跳过自己发送消息的情况
      if (isSendingLocalMessage.value) {
        return
      }

      // 跳过消息删除的情况
      if (newLength <= oldLength) {
        return
      }

      // 跳过正在加载历史消息的情况
      if (isLoadingMore.value) {
        return
      }

      // 等待 DOM 更新和虚拟滚动组件渲染完成
      await nextTick()

      // 使用 requestAnimationFrame 确保浏览器已完成渲染
      await new Promise(resolve => requestAnimationFrame(resolve))

      // 再等待一帧，确保虚拟滚动组件完全更新
      await new Promise(resolve => requestAnimationFrame(resolve))

      // 额外短暂延迟，确保滚动高度已计算完成
      await new Promise(resolve => setTimeout(resolve, 100))

      // 检查用户是否在底部附近
      const isNearBottom = virtualMessageList.value?.checkIsNearBottom?.() ?? true

      if (!isNearBottom) {
        // 用户滚动到了非底部位置，显示新消息提示
        showNewMessageTip.value = true
        newMessageCount.value += (newLength - oldLength)
      }
    }
  )

  // 处理虚拟滚动接近底部事件
  function handleScrollNearBottom (isNearBottom: boolean) {
    autoScroll.value = isNearBottom
    // 当用户滚动到底部时，隐藏新消息提示
    if (isNearBottom) {
      showNewMessageTip.value = false
      newMessageCount.value = 0
    }
  }

  // 记录是否已显示过"没有更多"提示
  const hasShownNoMoreTip = ref(false)

  // 处理虚拟滚动接近顶部事件
  async function handleScrollNearTop (isNearTop: boolean) {
    // 如果接近顶部但没有更多消息，检查是否需要显示提示
    if (isNearTop && !hasMore.value && !isLoadingMore.value && !loading.value && activeChatId.value) {
      // 获取当前分页信息，如果是第一页则不显示提示
      const pagination = messageStore.getPagination(activeChatId.value)
      const isFirstPage = !pagination || pagination.page <= 1

      // 只有当已经加载过多页（page > 1）时才显示提示
      if (!isFirstPage && !hasShownNoMoreTip.value) {
        showInfo('没有更多历史消息了')
        hasShownNoMoreTip.value = true
      }
      return
    }

    // 如果离开顶部，重置提示标记
    if (!isNearTop) {
      hasShownNoMoreTip.value = false
    }

    if (!isNearTop || !hasMore.value || isLoadingMore.value || loading.value || !activeChatId.value || justSwitchedChat.value) {
      return
    }

    // 防抖处理，避免频繁触发
    if (debouncedLoadMore.value) {
      clearTimeout(debouncedLoadMore.value)
    }

    debouncedLoadMore.value = setTimeout(async () => {
      // 再次检查，因为状态可能在防抖期间发生变化
      if (hasMore.value && !isLoadingMore.value && !loading.value) {
        await loadMoreHistoryMessages()
      }
    }, 300)
  }

  // 加载更多历史消息
  async function loadMoreHistoryMessages () {
    if (!activeChatId.value || isLoadingMore.value || loading.value || !hasMore.value) {
      return
    }

    try {
      isLoadingMore.value = true

      // 保存滚动位置
      virtualMessageList.value?.saveScrollState()

      // 加载更多历史消息（loadMore = true）
      const chatType = activeChatType.value === 'private' ? 'private' : 'group'
      await loadHistoryMessages(activeChatId.value, chatType, true)

      // 恢复滚动位置
      await nextTick()
      virtualMessageList.value?.restoreScrollPosition()

    } catch (error) {
      console.error('加载更多历史消息失败:', error)
    } finally {
      isLoadingMore.value = false
    }
  }

  // 处理新消息提示点击
  function handleNewMessageTipClick () {
    showNewMessageTip.value = false
    newMessageCount.value = 0
    virtualMessageList.value?.scrollToBottom()
  }

  // Methods
  async function handleSendMessage () {
    if (!inputMessage.value.trim() || isSending.value) return

    isSending.value = true
    // 标记正在发送消息，避免触发"有新消息"提示
    isSendingLocalMessage.value = true
    try {
      await sendTextMessage(inputMessage.value)
      inputMessage.value = ''

      // 发送后滚动到底部并隐藏新消息提示
      await nextTick()
      virtualMessageList.value?.scrollToBottom()
      showNewMessageTip.value = false
      newMessageCount.value = 0
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      isSending.value = false
      // 延迟重置标志，确保 watch 已经完成检查
      setTimeout(() => {
        isSendingLocalMessage.value = false
      }, 300)
    }
  }

  function toggleOnlineBoard () {
    showOnlineBoard.value = !showOnlineBoard.value
    chatStore.setOnlineBoardVisible(showOnlineBoard.value)
  }

  function togglePrivateBoard () {
  // todo 私聊时点击右上角三个点出现什么界面待设计
  }

  function handleImagePreview (imageUrl: string) {
    emit('imagePreview', imageUrl)
  }

  /**
   * 处理文件上传
   */
  async function handleFileUpload (file: File | null, fileType: string, errorMsg?: string) {
    // 处理错误消息
    if (errorMsg) {
      showError(errorMsg)
      return
    }

    if (!file || isUploading.value) {
      if (isUploading.value) {
        showError('正在上传文件，请稍候')
      }
      return
    }

    // 标记正在发送消息，避免触发"有新消息"提示
    isSendingLocalMessage.value = true
    try {
      isUploading.value = true
      uploadingFileName.value = file.name
      uploadProgress.value = 0

      // 使用 useMessage 的 sendFileMessage 方法
      await sendFileMessage(file, fileType as 'image' | 'file')

      showSuccess('文件发送成功')

      // 滚动到底部显示新消息
      await nextTick()
      virtualMessageList.value?.scrollToBottom()
      showNewMessageTip.value = false
      newMessageCount.value = 0
    } catch (error) {
      console.error('Failed to send file:', error)
      showError('文件发送失败')
    } finally {
      isUploading.value = false
      uploadProgress.value = 0
      uploadingFileName.value = ''
      // 延迟重置标志，确保 watch 已经完成检查
      setTimeout(() => {
        isSendingLocalMessage.value = false
      }, 300)
    }
  }

  function handleVoiceRecord () {
    // TODO: Implement voice recording
    console.log('Voice record clicked')
  }

  // Lifecycle
  onMounted(() => {
    // 初始化消息服务（如果需要）
    if (!init) {
      // 这里可以添加初始化逻辑，比如传入 token 和 userId
      console.log('Message service not initialized yet')
    }

    // 延迟滚动到底部，确保组件已渲染
    setTimeout(() => {
      virtualMessageList.value?.scrollToBottom()
    }, 100)
  })

  // 组件卸载时清理定时器
  onUnmounted(() => {
    if (debouncedLoadMore.value) {
      clearTimeout(debouncedLoadMore.value)
    }
  })
</script>

<style lang="scss" scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 0;
}

.chat-header {
  background-color: #1a1a25;
  padding-top: 8px;
  padding-bottom: 8px;
}

.custom-avatar {
  border-radius: 4px !important;
  overflow: hidden;
}

.messages-container {
  position: relative;
  flex: 1;
  overflow-y: hidden;
  background-color: #1a1a25;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.new-message-tip {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  animation: slideDown 0.3s ease;
  cursor: pointer;

  .tip-chip {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

.input-container {
  background-color: #1a1a25;
  padding: 10px;
}

.upload-progress-banner {
  background-color: rgba(25, 118, 210, 0.1);
  border-bottom: 1px solid rgba(25, 118, 210, 0.3);
  padding: 8px 16px;

  .upload-info {
    display: flex;
    align-items: center;
    font-size: 12px;
    color: #1976d2;
    margin-top: 4px;
  }
}

.emoji-picker {
  display: flex;
  flex-wrap: wrap;
  background-color: #2a2a2e;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 5px;
  margin-bottom: 10px;
  max-height: 150px;
  overflow-y: auto;
}

.message-input {
  margin: 8px 0;
}
</style>
