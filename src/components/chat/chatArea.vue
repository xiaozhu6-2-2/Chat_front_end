<template>
  <v-card class="chat-container" elevation="0">
    <!-- 顶部聊天信息栏 -->
    <v-toolbar class="chat-header" density="compact">
      <Avatar
        :url="activeChat?.avatar"
        :name="activeChat?.name"
        :size="40"
        :clickable="false"
        avatar-class="custom-avatar ml-6"
      />
      <v-toolbar-title>{{ activeChat?.name }}</v-toolbar-title>
      <v-spacer></v-spacer>

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
        @image-preview="handleImagePreview"
        @scroll-near-bottom="handleScrollNearBottom"
      />
    </div>

    <!-- 底部输入区域 -->
    <div class="input-container">

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

      <!-- 输入框 -->
      <!-- <v-textarea
        v-model="message"
        auto-grow
        class="message-input"
        hide-details
        placeholder="输入消息..."
        rows="1"
        variant="plain"
        @input="handleTyping"
        @keydown.enter.exact.prevent="handleSendMessage"
        @input="handleTyping"
      /> -->
      <echatInput
        @keydown.enter.exact.prevent="handleSendMessage"
        @send-message="handleSendMessage"
        v-model="message"
      />

    </div>

    <!-- Online Board -->
    <OnlineBoard v-model="showOnlineBoard" />
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useChat } from "../../composables/useChat";
import { useMessageInput } from "../../composables/useMessageInput";
import { useChatStore } from "../../stores/chatStore";
import { messageService } from "../../service/message";
import type { ChatType, Chat, ChatAreaProps } from "../../types/chat";
import Avatar from "../../components/global/Avatar.vue";
import ContactCardModal from "../../components/global/ContactCardModal.vue";
import OnlineBoard from "./onlineBoard.vue";
import echatInput from "./echatInput.vue";

import VirtualMessageList from "./VirtualMessageList.vue";
import type { LocalMessage } from "../../service/messageTypes";

const props = defineProps<ChatAreaProps>();

  const emit = defineEmits<{
    imagePreview: [imageUrl: string]
  }>()

// Store and composables
const chatStore = useChatStore();
const { activeChat, selectChat } = useChat();
const {
  message,
  showEmojiPicker,
  emojis,
  insertEmoji,
  toggleEmojiPicker,
  scrollToBottom,
} = useMessageInput();

  // Local state
  const showOnlineBoard = ref(false)
  const showContactCard = ref(false)
  // const isTyping = ref(false)
  const isSending = ref(false)
  const typingTimeout = ref<number>()
  const virtualMessageList = ref()

// 当前聊天联系人信息
const currentChatContact = computed(() => {
  if (!props.chat) return null;
  return {
    //TODO: 改用useauth中的缓存
    uid: props.chat.id,
    username: props.chat.name,
    account: props.chat.name.toLowerCase().replace(/\s+/g, "_"),
    gender: "other" as const,
    region: "",
    email: `${props.chat.name.toLowerCase()}@example.com`,
    create_time: new Date().toISOString(),
    avatar: props.chat.avatar,
    bio: `${props.chat.name}的聊天`,
  };
});

// 虚拟滚动配置
//todo ：改用useauth缓存
const currentUserId = ref("current-user");
const autoScroll = ref(true);
const containerHeight = computed(() => {
  // 计算容器高度，减去头部、输入框等高度
  const headerHeight = 64; // v-toolbar 高度
  const inputHeight = 120; // 输入区域估计高度
  const padding = 32; // 上下边距
  return window.innerHeight - headerHeight - inputHeight - padding - 60; // 侧边栏宽度
});

  // Computed
  const isLoading = computed(() => chatStore.isLoading)

// Watch for chat changes
watch(
  () => props.chat,
  (newChat) => {
    if (newChat) {
      // The useChat composable will handle setting the current chat
      // Call selectChat to load history messages
      selectChat(newChat.id);
    }
  },
  { immediate: true }
);

  // Watch for messages to scroll to bottom
  watch(
    messages,
    () => {
      if (autoScroll.value) {
        virtualMessageList.value?.scrollToBottom()
      }
    },
    { deep: true },
  )

  // 处理虚拟滚动接近底部事件
  function handleScrollNearBottom (isNearBottom: boolean) {
    autoScroll.value = isNearBottom
  }

  // Methods
  async function handleSendMessage () {
    if (!message.value.trim() || isSending.value) return

    isSending.value = true
    try {
      await sendMessage(message.value)
      message.value = ''
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      isSending.value = false
    }
  }
};

const toggleOnlineBoard = () => {
  showOnlineBoard.value = !showOnlineBoard.value;
  chatStore.setOnlineBoardVisible(showOnlineBoard.value);
};

const togglePrivateBoard = () => {
  //todo 私聊时点击右上角三个点出现什么界面待设计
}

const handleImagePreview = (imageUrl: string) => {
  emit("imagePreview", imageUrl);
};

const handleFileUpload = () => {
  // TODO: Implement file upload
  console.log("File upload clicked");
};

  function handleVoiceRecord () {
    // TODO: Implement voice recording
    console.log('Voice record clicked')
  }

  // Lifecycle
  onMounted(() => {
    // 初始化消息服务（如果需要）
    if (!messageService.isInitialized) {
      // 这里可以添加初始化逻辑，比如传入 token 和 userId
      console.log('Message service not initialized yet')
    }

    // 延迟滚动到底部，确保组件已渲染
    setTimeout(() => {
      virtualMessageList.value?.scrollToBottom()
    }, 100)
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
  flex: 1;
  overflow-y: hidden;
  background-color: #1a1a25;
  display: flex;
  flex-direction: column;
  gap: 16px;
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
